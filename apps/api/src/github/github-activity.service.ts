import { Injectable, Logger } from "@nestjs/common";
import { GithubGraphqlService, type GraphqlRateLimit } from "./github-graphql.service";

/** Normalized row ready for Contribution upsert (githubId = GitHub node id). */
export type NormalizedActivity = {
  githubId: string;
  type: "PULL_REQUEST" | "ISSUE" | "REVIEW";
  repoFullName: string;
  occurredAt: Date;
  linesAdded: number;
  linesDeleted: number;
  linesChanged: number;
  reviewCommentsCount: number;
};

const PAGE = 100;

type MergedPrSearchResponse = {
  rateLimit: GraphqlRateLimit;
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      mergedAt: string | null;
      additions: number;
      deletions: number;
      reviewThreads: { totalCount: number };
      reviews: { totalCount: number };
      repository: { nameWithOwner: string };
    } | null>;
  };
};

type IssueSearchResponse = {
  rateLimit: GraphqlRateLimit;
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      createdAt: string;
      repository: { nameWithOwner: string };
      comments: { totalCount: number };
    } | null>;
  };
};

type ReviewSearchResponse = {
  rateLimit: GraphqlRateLimit;
  search: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      repository: { nameWithOwner: string };
      reviews?: {
        nodes: Array<{
          id: string;
          author: { login: string } | null;
          submittedAt: string | null;
          comments: { totalCount: number };
        } | null>;
      };
    } | null>;
  };
};

/**
 * Fetches PRs, Issues, and PR Reviews for a login within the last `days` days using search + pagination.
 * De-duplication is handled at persistence (`githubId` unique).
 */
@Injectable()
export class GithubActivityService {
  private readonly logger = new Logger(GithubActivityService.name);

  constructor(private readonly gql: GithubGraphqlService) {}

  async fetchLastDaysActivity(login: string, days = 30): Promise<NormalizedActivity[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    // Sequential to reduce burst against GraphQL + REST rate limits
    const prs = await this.fetchMergedPullRequests(login, sinceStr, since);
    const issues = await this.fetchIssues(login, sinceStr, since);
    const reviews = await this.fetchReviews(login, sinceStr, since);

    const merged = [...prs, ...issues, ...reviews];
    const seen = new Set<string>();
    const deduped: NormalizedActivity[] = [];
    for (const row of merged) {
      if (seen.has(row.githubId)) continue;
      seen.add(row.githubId);
      deduped.push(row);
    }
    this.logger.log(`GitHub activity for ${login}: ${deduped.length} items (${prs.length} PRs, ${issues.length} issues, ${reviews.length} reviews)`);
    return deduped;
  }

  private async fetchMergedPullRequests(login: string, sinceStr: string, sinceDate: Date): Promise<NormalizedActivity[]> {
    const q = `author:${login} is:pr is:merged merged:>=${sinceStr}`;
    const query = `
      query SearchMergedPrs($q: String!, $cursor: String) {
        rateLimit { cost remaining resetAt }
        search(type: ISSUE, query: $q, first: ${PAGE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on PullRequest {
              id
              mergedAt
              additions
              deletions
              reviewThreads { totalCount }
              reviews { totalCount }
              repository { nameWithOwner }
            }
          }
        }
      }
    `;

    const out: NormalizedActivity[] = [];
    let cursor: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const payload: MergedPrSearchResponse = await this.gql.requestData<MergedPrSearchResponse>(
        query,
        { q, cursor },
        { minRemaining: 80 },
      );
      const search: MergedPrSearchResponse["search"] = payload.search;
      for (const n of search.nodes) {
        if (!n?.mergedAt) continue;
        const mergedAt = new Date(n.mergedAt);
        if (mergedAt < sinceDate) continue;
        const additions = n.additions ?? 0;
        const deletions = n.deletions ?? 0;
        out.push({
          githubId: n.id,
          type: "PULL_REQUEST",
          repoFullName: n.repository.nameWithOwner,
          occurredAt: mergedAt,
          linesAdded: additions,
          linesDeleted: deletions,
          linesChanged: additions + deletions,
          reviewCommentsCount: n.reviewThreads?.totalCount ?? n.reviews?.totalCount ?? 0,
        });
      }
      hasNext = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
      if (!hasNext) break;
    }

    return out;
  }

  private async fetchIssues(login: string, sinceStr: string, sinceDate: Date): Promise<NormalizedActivity[]> {
    const q = `author:${login} is:issue created:>=${sinceStr}`;
    const query = `
      query SearchIssues($q: String!, $cursor: String) {
        rateLimit { cost remaining resetAt }
        search(type: ISSUE, query: $q, first: ${PAGE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on Issue {
              id
              createdAt
              repository { nameWithOwner }
              comments { totalCount }
            }
          }
        }
      }
    `;

    const out: NormalizedActivity[] = [];
    let cursor: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const payload: IssueSearchResponse = await this.gql.requestData<IssueSearchResponse>(
        query,
        { q, cursor },
        { minRemaining: 80 },
      );
      const search: IssueSearchResponse["search"] = payload.search;
      for (const n of search.nodes) {
        if (!n?.createdAt) continue;
        const created = new Date(n.createdAt);
        if (created < sinceDate) continue;
        out.push({
          githubId: n.id,
          type: "ISSUE",
          repoFullName: n.repository.nameWithOwner,
          occurredAt: created,
          linesAdded: 0,
          linesDeleted: 0,
          linesChanged: 0,
          reviewCommentsCount: n.comments?.totalCount ?? 0,
        });
      }
      hasNext = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
      if (!hasNext) break;
    }

    return out;
  }

  /**
   * Uses reviewed-by search to find PRs, then filters PullRequestReview nodes by author + date.
   */
  private async fetchReviews(login: string, sinceStr: string, sinceDate: Date): Promise<NormalizedActivity[]> {
    const q = `reviewed-by:${login} type:pr updated:>=${sinceStr}`;
    const query = `
      query SearchReviewedPrs($q: String!, $cursor: String) {
        rateLimit { cost remaining resetAt }
        search(type: ISSUE, query: $q, first: ${PAGE}, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            ... on PullRequest {
              id
              repository { nameWithOwner }
              reviews(first: 100) {
                nodes {
                  id
                  author { login }
                  submittedAt
                  comments { totalCount }
                }
              }
            }
          }
        }
      }
    `;

    const out: NormalizedActivity[] = [];
    let cursor: string | null = null;
    let hasNext = true;
    const loginLower = login.toLowerCase();

    while (hasNext) {
      const payload: ReviewSearchResponse = await this.gql.requestData<ReviewSearchResponse>(
        query,
        { q, cursor },
        { minRemaining: 80 },
      );
      const search: ReviewSearchResponse["search"] = payload.search;
      for (const pr of search.nodes) {
        if (!pr?.reviews?.nodes) continue;
        for (const rv of pr.reviews.nodes) {
          if (!rv?.submittedAt || !rv.author?.login) continue;
          if (rv.author.login.toLowerCase() !== loginLower) continue;
          const submitted = new Date(rv.submittedAt);
          if (submitted < sinceDate) continue;
          out.push({
            githubId: rv.id,
            type: "REVIEW",
            repoFullName: pr.repository.nameWithOwner,
            occurredAt: submitted,
            linesAdded: 0,
            linesDeleted: 0,
            linesChanged: 0,
            reviewCommentsCount: rv.comments?.totalCount ?? 0,
          });
        }
      }
      hasNext = search.pageInfo.hasNextPage;
      cursor = search.pageInfo.endCursor;
      if (!hasNext) break;
    }

    return out;
  }
}

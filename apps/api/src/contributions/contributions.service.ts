import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ContributionType, type Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { GithubActivityService } from "../github/github-activity.service";
import { GithubGraphqlService } from "../github/github-graphql.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { RankChangeEvent } from "../realtime/realtime.types";
import { SeasonsService } from "../seasons/seasons.service";
import { ANTI_CHEAT_RULES, AntiCheatService } from "./anti-cheat.service";
import type { GithubSyncJobData } from "./github-sync.types";

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: SeasonsService,
    private readonly gql: GithubGraphqlService,
    private readonly activity: GithubActivityService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
    private readonly antiCheat: AntiCheatService,
    @InjectQueue("github-sync") private readonly syncQueue: Queue,
  ) {}

  /**
   * HTTP handler: enqueue when Redis queue is enabled, otherwise run inline.
   */
  async requestSync(userId: string, githubLogin: string, seasonId?: string) {
    if (!this.gql.getToken()) {
      throw new ServiceUnavailableException(
        "GitHub sync is not configured. Set GITHUB_TOKEN (PAT with repo scope for private data as needed).",
      );
    }

    const useQueue = this.shouldUseQueue();
    if (useQueue) {
      const job = await this.syncQueue.add(
        "sync",
        { userId, githubLogin, seasonId } satisfies GithubSyncJobData,
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      );
      return {
        queued: true,
        jobId: job.id,
        message: "Sync queued. Poll job status via BullMQ or your ops dashboard.",
      };
    }

    return this.runSyncJob({ userId, githubLogin, seasonId });
  }

  private shouldUseQueue(): boolean {
    if (this.config.get<string>("SYNC_QUEUE") === "false") {
      return false;
    }
    if (this.config.get<string>("SYNC_QUEUE") === "true") {
      return true;
    }
    return Boolean(this.config.get<string>("REDIS_URL"));
  }

  /** Called by Bull worker or inline sync. */
  async runSyncJob(data: GithubSyncJobData) {
    if (!this.gql.getToken()) {
      throw new ServiceUnavailableException("GITHUB_TOKEN is not configured");
    }

    const season =
      data.seasonId != null
        ? await this.seasons.getByIdOrThrow(data.seasonId)
        : await this.seasons.getCurrent();
    if (!season) {
      throw new NotFoundException("No active season to sync into");
    }

    const days = Number(this.config.get<string>("GITHUB_SYNC_LOOKBACK_DAYS") ?? 30);
    const rows = await this.activity.fetchLastDaysActivity(data.githubLogin, Number.isFinite(days) ? days : 30);
    rows.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const recentHistory = await this.prisma.contribution.findMany({
      where: { seasonId: season.id, authorUserId: data.userId },
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        type: true,
        linesChanged: true,
        reviewCommentsCount: true,
        occurredAt: true,
      },
    });
    recentHistory.reverse();

    let upserted = 0;
    for (const n of rows) {
      const contributionType =
        n.type === "PULL_REQUEST"
          ? ContributionType.PULL_REQUEST
          : n.type === "ISSUE"
            ? ContributionType.ISSUE
            : ContributionType.REVIEW;

      const linesChanged = n.linesChanged;
      const raw = this.computeRawPoints(contributionType, linesChanged, n.reviewCommentsCount);
      const antiCheat = this.antiCheat.assessContribution(
        {
          type: contributionType,
          linesChanged,
          reviewCommentsCount: n.reviewCommentsCount,
          occurredAt: n.occurredAt,
        },
        recentHistory,
      );
      const points = raw.mul(new Decimal(antiCheat.qualityFactor));

      await this.prisma.contribution.upsert({
        where: { githubId: n.githubId },
        create: {
          type: contributionType,
          githubId: n.githubId,
          seasonId: season.id,
          authorUserId: data.userId,
          repoFullName: n.repoFullName,
          linesAdded: n.linesAdded,
          linesDeleted: n.linesDeleted,
          linesChanged,
          reviewCommentsCount: n.reviewCommentsCount,
          occurredAt: n.occurredAt,
          rawPoints: raw,
          qualityFactor: new Decimal(antiCheat.qualityFactor),
          pointsAwarded: points,
          qualityScore: new Decimal(antiCheat.qualityScore),
          spamLikelihood: new Decimal(antiCheat.spamLikelihood),
          flagCount: antiCheat.rules.length,
          isSuspicious: antiCheat.isSuspicious,
          suspicionNotes: {
            rules: antiCheat.rules,
            notes: antiCheat.notes,
            thresholds: ANTI_CHEAT_RULES,
          },
        },
        update: {
          linesAdded: n.linesAdded,
          linesDeleted: n.linesDeleted,
          linesChanged,
          reviewCommentsCount: n.reviewCommentsCount,
          rawPoints: raw,
          qualityFactor: new Decimal(antiCheat.qualityFactor),
          pointsAwarded: points,
          qualityScore: new Decimal(antiCheat.qualityScore),
          spamLikelihood: new Decimal(antiCheat.spamLikelihood),
          flagCount: antiCheat.rules.length,
          isSuspicious: antiCheat.isSuspicious,
          suspicionNotes: {
            rules: antiCheat.rules,
            notes: antiCheat.notes,
            thresholds: ANTI_CHEAT_RULES,
          },
          occurredAt: n.occurredAt,
        },
      });

      if (antiCheat.isSuspicious && antiCheat.flagReason) {
        await this.openAntiCheatFlagIfNeeded(data.userId, season.id, antiCheat.flagReason, {
          githubId: n.githubId,
          type: contributionType,
          repoFullName: n.repoFullName,
          occurredAt: n.occurredAt,
          linesChanged,
          reviewCommentsCount: n.reviewCommentsCount,
          notes: antiCheat.notes,
          rules: antiCheat.rules,
        });
      }

      recentHistory.push({
        type: contributionType,
        linesChanged,
        reviewCommentsCount: n.reviewCommentsCount,
        occurredAt: n.occurredAt,
      });
      upserted += 1;
    }

    const changes = await this.rebuildScores(season.id);
    this.realtime.publishLeaderboardUpdated(season.id, changes);

    return {
      queued: false,
      seasonId: season.id,
      upserted,
      types: {
        pullRequests: rows.filter((r) => r.type === "PULL_REQUEST").length,
        issues: rows.filter((r) => r.type === "ISSUE").length,
        reviews: rows.filter((r) => r.type === "REVIEW").length,
      },
      message: `Synced last ${days} days from GitHub search (PRs, issues, reviews). Duplicates skipped via githubId.`,
    };
  }

  private computeRawPoints(type: ContributionType, linesChanged: number, reviewComments: number): Decimal {
    if (type === ContributionType.REVIEW) {
      return new Decimal(Math.min(reviewComments * 2, 40));
    }
    if (type === ContributionType.ISSUE) {
      return new Decimal(5);
    }
    return new Decimal(Math.min(linesChanged, 5000)).div(10);
  }

  private async openAntiCheatFlagIfNeeded(
    userId: string,
    seasonId: string,
    reason: string,
    metadata: Prisma.InputJsonValue,
  ) {
    const existing = await this.prisma.antiCheatFlag.findFirst({
      where: {
        userId,
        seasonId,
        reason,
        status: "OPEN",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.antiCheatFlag.create({
      data: {
        userId,
        seasonId,
        reason,
        metadata,
      },
    });
  }

  async listForUser(userId: string, seasonId?: string, take = 50) {
    const season =
      seasonId != null ? await this.seasons.getByIdOrThrow(seasonId) : await this.seasons.getCurrent();
    if (!season) {
      throw new NotFoundException("No active season");
    }
    return this.prisma.contribution.findMany({
      where: { seasonId: season.id, authorUserId: userId },
      orderBy: { occurredAt: "desc" },
      take,
      select: {
        id: true,
        type: true,
        githubId: true,
        repoFullName: true,
        linesAdded: true,
        linesDeleted: true,
        linesChanged: true,
        reviewCommentsCount: true,
        occurredAt: true,
        pointsAwarded: true,
        qualityScore: true,
        spamLikelihood: true,
        isSuspicious: true,
      },
    });
  }

  private async rebuildScores(seasonId: string): Promise<RankChangeEvent[]> {
    const contributions = await this.prisma.contribution.findMany({ where: { seasonId } });
    const previousScores = await this.prisma.score.findMany({
      where: { seasonId },
      select: { userId: true, rank: true, githubLogin: true },
    });
    const previousRanks = new Map(previousScores.map((score) => [score.userId, score.rank]));
    const agg = new Map<
      string,
      { total: Decimal; pr: number; issue: number; review: number; qualitySum: Decimal; n: number }
    >();

    for (const c of contributions) {
      const cur = agg.get(c.authorUserId) ?? {
        total: new Decimal(0),
        pr: 0,
        issue: 0,
        review: 0,
        qualitySum: new Decimal(0),
        n: 0,
      };
      cur.total = cur.total.add(c.pointsAwarded);
      cur.qualitySum = cur.qualitySum.add(c.qualityScore);
      cur.n += 1;
      if (c.type === ContributionType.PULL_REQUEST) cur.pr += 1;
      else if (c.type === ContributionType.ISSUE) cur.issue += 1;
      else if (c.type === ContributionType.REVIEW) cur.review += 1;
      agg.set(c.authorUserId, cur);
    }

    const userIds = [...agg.keys()];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } } });
    const sorted = [...agg.entries()].sort((a, b) => b[1].total.comparedTo(a[1].total));

    let rank = 1;
    const changes: RankChangeEvent[] = [];
    for (const [uid, v] of sorted) {
      const u = users.find((x) => x.id === uid);
      if (!u) continue;
      const qualityAvg = v.n > 0 ? v.qualitySum.div(v.n) : new Decimal(0);
      const previousRank = previousRanks.get(uid) ?? null;
      await this.prisma.score.upsert({
        where: { userId_seasonId: { userId: uid, seasonId } },
        create: {
          userId: uid,
          seasonId,
          totalPoints: v.total,
          qualityScore: qualityAvg,
          rank,
          githubLogin: u.githubLogin,
          prCount: v.pr,
          issueCount: v.issue,
          reviewCount: v.review,
        },
        update: {
          totalPoints: v.total,
          qualityScore: qualityAvg,
          rank,
          githubLogin: u.githubLogin,
          prCount: v.pr,
          issueCount: v.issue,
          reviewCount: v.review,
          lastComputedAt: new Date(),
        },
      });
      if (previousRank == null || previousRank !== rank) {
        changes.push({
          seasonId,
          userId: uid,
          githubLogin: u.githubLogin,
          previousRank,
          currentRank: rank,
          direction: previousRank == null ? "new" : previousRank > rank ? "up" : "down",
        });
      }
      rank += 1;
    }
    return changes;
  }
}

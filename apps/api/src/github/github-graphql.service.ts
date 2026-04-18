import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export type GraphqlRateLimit = {
  cost: number;
  limit: number;
  remaining: number;
  resetAt: string;
  used: number;
};

type GithubGraphqlBody<T> = {
  data?: T;
  errors?: { message: string; type?: string }[];
  extensions?: { cost?: number; rateLimit?: GraphqlRateLimit };
};

/**
 * Low-level GitHub GraphQL client with rate-limit awareness (REST headers + data.rateLimit).
 */
@Injectable()
export class GithubGraphqlService {
  private readonly logger = new Logger(GithubGraphqlService.name);
  private readonly userAgent: string;

  constructor(private readonly config: ConfigService) {
    this.userAgent = this.config.get<string>("GITHUB_USER_AGENT") ?? "MergeLeague-API/1.0";
  }

  getToken(): string | undefined {
    return this.config.get<string>("GITHUB_TOKEN") ?? this.config.get<string>("GITHUB_SYNC_TOKEN");
  }

  /**
   * Returns the `data` payload. Throws on GraphQL errors.
   * When the query includes `rateLimit { remaining resetAt }`, sleeps if remaining drops below threshold.
   */
  async requestData<T extends { rateLimit?: GraphqlRateLimit }>(
    query: string,
    variables: Record<string, unknown> | undefined,
    options?: { minRemaining?: number },
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error("GITHUB_TOKEN is not configured");
    }

    const minRemaining = options?.minRemaining ?? 100;

    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": this.userAgent,
      },
      body: JSON.stringify({ query, variables }),
    });

    const restRemaining = res.headers.get("x-ratelimit-remaining");
    const restReset = res.headers.get("x-ratelimit-reset");
    if (restRemaining != null && Number(restRemaining) < 50 && restReset) {
      await this.sleepUntilUnixSeconds(Number(restReset));
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`GitHub GraphQL HTTP ${res.status}: ${text}`);
      throw new Error(`GitHub GraphQL HTTP ${res.status}: ${text}`);
    }

    const body = (await res.json()) as GithubGraphqlBody<T>;

    if (body.errors?.length) {
      const msg = body.errors.map((e) => e.message).join("; ");
      if (body.errors.some((e) => /rate limit|abuse/i.test(e.message))) {
        await this.sleep(60_000);
      }
      throw new Error(msg);
    }

    if (!body.data) {
      throw new Error("GitHub GraphQL returned empty data");
    }

    const rl = body.data.rateLimit ?? body.extensions?.rateLimit;
    if (rl && rl.remaining < minRemaining) {
      await this.sleepUntilIso(rl.resetAt);
    }

    return body.data;
  }

  private async sleepUntilIso(resetAt: string) {
    const target = new Date(resetAt).getTime();
    const wait = Math.max(0, target - Date.now() + 1500);
    if (wait > 0) {
      this.logger.warn(`GraphQL rateLimit low — sleeping ${Math.ceil(wait / 1000)}s until reset`);
      await this.sleep(wait);
    }
  }

  private async sleepUntilUnixSeconds(unix: number) {
    const target = unix * 1000;
    const wait = Math.max(0, target - Date.now() + 1500);
    if (wait > 0) {
      this.logger.warn(`REST rateLimit low — sleeping ${Math.ceil(wait / 1000)}s`);
      await this.sleep(wait);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

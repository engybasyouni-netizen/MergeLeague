import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SeasonsService } from "../seasons/seasons.service";

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: SeasonsService,
  ) {}

  async getLeaderboard(seasonId: string | undefined, limit: number) {
    const season =
      seasonId != null ? await this.seasons.getByIdOrThrow(seasonId) : await this.seasons.getCurrent();
    if (!season) {
      throw new NotFoundException("No active season");
    }

    const rows = await this.prisma.score.findMany({
      where: { seasonId: season.id },
      orderBy: [{ rank: "asc" }, { totalPoints: "desc" }],
      take: limit,
      include: {
        user: { select: { id: true, githubLogin: true, avatarUrl: true } },
      },
    });

    return {
      season: {
        id: season.id,
        name: season.name,
        status: season.status,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
      },
      rows: rows.map((r) => ({
        rank: r.rank,
        totalPoints: r.totalPoints.toString(),
        qualityScore: r.qualityScore.toString(),
        prCount: r.prCount,
        issueCount: r.issueCount,
        reviewCount: r.reviewCount,
        githubLogin: r.githubLogin,
        user: r.user,
      })),
    };
  }
}

import { Controller, Get, Param, Query } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardQueryDto } from "./dto/leaderboard-query.dto";

@Controller(["season", "seasons"])
export class SeasonLeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get(":seasonId/leaderboard")
  getForSeason(@Param("seasonId") seasonId: string, @Query() query: LeaderboardQueryDto) {
    return this.leaderboard.getLeaderboard(seasonId, query.limit ?? 100);
  }
}

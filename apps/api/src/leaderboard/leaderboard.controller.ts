import { Controller, Get, Query } from "@nestjs/common";
import { LeaderboardQueryDto } from "./dto/leaderboard-query.dto";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  get(@Query() query: LeaderboardQueryDto) {
    return this.leaderboard.getLeaderboard(query.seasonId, query.limit ?? 100);
  }
}

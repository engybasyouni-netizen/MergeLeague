import { Module } from "@nestjs/common";
import { SeasonsModule } from "../seasons/seasons.module";
import { LeaderboardController } from "./leaderboard.controller";
import { SeasonLeaderboardController } from "./season-leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";

@Module({
  imports: [SeasonsModule],
  controllers: [LeaderboardController, SeasonLeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}

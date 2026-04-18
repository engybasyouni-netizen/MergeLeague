import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { GithubModule } from "../github/github.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SeasonsModule } from "../seasons/seasons.module";
import { AntiCheatService } from "./anti-cheat.service";
import { ContributionsController } from "./contributions.controller";
import { ContributionsService } from "./contributions.service";
import { GithubSyncProcessor } from "./github-sync.processor";

@Module({
  imports: [
    SeasonsModule,
    GithubModule,
    RealtimeModule,
    BullModule.registerQueue({ name: "github-sync" }),
  ],
  controllers: [ContributionsController],
  providers: [ContributionsService, GithubSyncProcessor, AntiCheatService],
})
export class ContributionsModule {}

import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ContributionsService } from "./contributions.service";
import { SyncContributionsDto } from "./dto/sync-contributions.dto";

@Controller("contributions")
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Query("seasonId") seasonId?: string,
    @Query("take") takeRaw?: string,
  ) {
    const take = takeRaw ? Math.min(200, Math.max(1, Number(takeRaw))) : 50;
    return this.contributions.listForUser(user.id, seasonId, take);
  }

  @Throttle({ default: { limit: 15, ttl: 3_600_000 } })
  @Post("sync")
  sync(@CurrentUser() user: User, @Body() body: SyncContributionsDto) {
    return this.contributions.requestSync(user.id, user.githubLogin, body.seasonId);
  }
}

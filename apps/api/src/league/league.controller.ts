import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JoinLeagueDto } from "./dto/join-league.dto";
import { PayEntryFeeDto } from "./dto/pay-entry-fee.dto";
import { LeagueService } from "./league.service";

@Controller("league")
@UseGuards(JwtAuthGuard)
export class LeagueController {
  constructor(private readonly league: LeagueService) {}

  /** Registers the user for a season; XLM payment can flip status to ACTIVE later. */
  @Post("join")
  join(@CurrentUser() user: User, @Body() dto: JoinLeagueDto) {
    return this.league.join(user.id, dto);
  }

  @Post("pay")
  payEntryFee(@CurrentUser() user: User, @Body() dto: PayEntryFeeDto) {
    return this.league.payEntryFee(user.id, dto.seasonId, dto.signedXdr);
  }
}

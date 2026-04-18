import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateTeamDto } from "./dto/create-team.dto";
import { TeamsService } from "./teams.service";

@Controller("teams")
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.teams.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto);
  }
}

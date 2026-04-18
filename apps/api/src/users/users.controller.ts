import { Controller, Get, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentUser() user: User) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        teamMembers: { include: { team: true } },
        leagueEntries: {
          include: { season: { select: { id: true, name: true, status: true } }, team: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        wallets: {
          take: 5,
          select: {
            id: true,
            publicKey: true,
            network: true,
            label: true,
            isPrimary: true,
            fundedAt: true,
            createdAt: true,
          },
        },
      },
    });
    return full;
  }
}

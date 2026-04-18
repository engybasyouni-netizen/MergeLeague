import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTeamDto } from "./dto/create-team.dto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerUserId: string, dto: CreateTeamDto) {
    const slug = dto.slug?.length ? dto.slug : slugify(dto.name);
    if (!slug.length) {
      throw new ConflictException("Could not derive a valid slug from team name");
    }

    const existing = await this.prisma.team.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException("Team slug already taken");
    }

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name: dto.name, slug },
      });
      await tx.teamMember.create({
        data: { teamId: team.id, userId: ownerUserId, role: "owner" },
      });
      return tx.team.findUniqueOrThrow({
        where: { id: team.id },
        include: { members: { include: { user: { select: { id: true, githubLogin: true, avatarUrl: true } } } } },
      });
    });
  }

  async listForUser(userId: string) {
    return this.prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, githubLogin: true, avatarUrl: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}

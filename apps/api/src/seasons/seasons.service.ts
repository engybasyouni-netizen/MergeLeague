import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const now = new Date();
    const season = await this.prisma.season.findFirst({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { scoringVersion: { select: { id: true, version: true } } },
    });
    return season;
  }

  async getByIdOrThrow(id: string) {
    const s = await this.prisma.season.findUnique({
      where: { id },
      include: { scoringVersion: { select: { id: true, version: true } } },
    });
    if (!s) throw new NotFoundException("Season not found");
    return s;
  }
}

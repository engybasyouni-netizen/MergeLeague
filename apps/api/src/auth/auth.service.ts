import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type GithubProfilePayload = {
  id: string;
  username: string;
  displayName?: string;
  photos?: { value: string }[];
  emails?: { value: string }[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async upsertGithubUser(profile: GithubProfilePayload): Promise<User> {
    const githubId = String(profile.id);
    const email = profile.emails?.[0]?.value ?? null;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    return this.prisma.user.upsert({
      where: { githubId },
      create: {
        githubId,
        githubLogin: profile.username,
        email,
        avatarUrl,
      },
      update: {
        githubLogin: profile.username,
        email: email ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
    });
  }

  signAccessToken(user: Pick<User, "id">) {
    return this.jwt.sign({ sub: user.id });
  }
}

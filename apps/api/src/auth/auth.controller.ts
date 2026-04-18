import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService, type GithubProfilePayload } from "./auth.service";
import { GithubAuthGuard } from "./github-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("github")
  @UseGuards(GithubAuthGuard)
  githubLogin() {
    /* redirects to GitHub */
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("github/callback")
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: { user: GithubProfilePayload }, @Res() res: Response) {
    const user = await this.auth.upsertGithubUser(req.user);
    const token = this.auth.signAccessToken(user);
    const web = process.env.WEB_URL ?? "http://localhost:3000";
    const redirect = `${web}/auth/callback?token=${encodeURIComponent(token)}`;
    return res.redirect(302, redirect);
  }
}

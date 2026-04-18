import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as GithubPassportStrategy } from "passport-github2";
import { AuthService, type GithubProfilePayload } from "./auth.service";

@Injectable()
export class GithubStrategy extends PassportStrategy(GithubPassportStrategy, "github") {
  constructor(
    private readonly config: ConfigService,
    private readonly auth: AuthService,
  ) {
    const clientId = config.get<string>("GITHUB_CLIENT_ID");
    const clientSecret = config.get<string>("GITHUB_CLIENT_SECRET");

    super({
      // Use inert placeholders so the API can still boot in local/dev before GitHub OAuth is configured.
      clientID: clientId && clientId.length > 0 ? clientId : "github-oauth-disabled",
      clientSecret: clientSecret && clientSecret.length > 0 ? clientSecret : "github-oauth-disabled",
      callbackURL: config.get<string>("GITHUB_CALLBACK_URL") ?? "http://localhost:4000/auth/github/callback",
      scope: ["read:user", "user:email"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username: string;
      displayName?: string;
      photos?: { value: string }[];
      emails?: { value: string }[];
    },
  ): Promise<GithubProfilePayload> {
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      photos: profile.photos,
      emails: profile.emails,
    };
  }
}

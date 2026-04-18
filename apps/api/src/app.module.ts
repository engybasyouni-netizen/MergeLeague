import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { parseRedisUrl } from "./config/redis.config";
import { AuthModule } from "./auth/auth.module";
import { ContributionsModule } from "./contributions/contributions.module";
import { HealthModule } from "./health/health.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { LeagueModule } from "./league/league.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SeasonsModule } from "./seasons/seasons.module";
import { StellarModule } from "./stellar/stellar.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...parseRedisUrl(config.get<string>("REDIS_URL")),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    SeasonsModule,
    StellarModule,
    RealtimeModule,
    LeaderboardModule,
    ContributionsModule,
    LeagueModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

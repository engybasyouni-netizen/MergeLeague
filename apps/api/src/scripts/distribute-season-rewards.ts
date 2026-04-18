import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { StellarService } from "../stellar/stellar.service";

async function bootstrap() {
  const logger = new Logger("DistributeSeasonRewards");
  const seasonId = process.argv[2];

  if (!seasonId) {
    throw new Error("Usage: node dist/scripts/distribute-season-rewards.js <seasonId>");
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  try {
    const stellar = app.get(StellarService);
    const result = await stellar.distributeSeasonRewards(seasonId);
    logger.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

void bootstrap();

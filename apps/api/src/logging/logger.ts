import { utilities as nestWinstonUtilities } from "nest-winston";
import { format, transports } from "winston";
import { WinstonModule } from "nest-winston";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function createAppLogger() {
  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL ?? (isProduction() ? "info" : "debug"),
    format: isProduction()
      ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
      : format.combine(
          format.timestamp(),
          format.ms(),
          nestWinstonUtilities.format.nestLike("MergeLeagueAPI", {
            colors: true,
            prettyPrint: true,
          }),
        ),
    transports: [new transports.Console()],
  });
}


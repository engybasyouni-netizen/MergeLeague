import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createAppLogger } from "./logging/logger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger(),
  });
  app.enableCors({
    origin: (process.env.WEB_URLS ?? process.env.WEB_URL ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const basePort = Number(process.env.API_PORT ?? 4000);
  const host = "0.0.0.0";
  let lastErr: unknown;
  for (let port = basePort; port < basePort + 20; port++) {
    try {
      await app.listen(port, host);
      // eslint-disable-next-line no-console
      console.log(`[MergeLeagueAPI] Listening on http://${host}:${port}`);
      return;
    } catch (err: any) {
      lastErr = err;
      if (err?.code !== "EADDRINUSE") throw err;
    }
  }
  throw lastErr;
}

bootstrap();

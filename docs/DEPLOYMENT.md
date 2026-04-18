# Deployment Guide

This repo is set up for:

- Frontend: Vercel
- Backend: Railway or Fly.io
- Database: Neon or Supabase Postgres
- CI/CD: GitHub Actions
- Logging: Winston via Nest logger integration

## 1. Production architecture

- Deploy `apps/web` to Vercel.
- Deploy the Nest API with `Dockerfile.api` to Railway or Fly.io.
- Point `DATABASE_URL` at Neon or Supabase Postgres.
- Use Upstash Redis, Railway Redis, or Fly Redis for BullMQ-backed sync jobs.
- Keep Stellar signing keys server-side only in the backend environment.

## 2. Environment setup

### Web (`apps/web`)

Use [apps/web/.env.example](/C:/Users/engyb/MergeLeague/apps/web/.env.example).

Required:

- `NEXT_PUBLIC_API_URL`

Production example:

```env
NEXT_PUBLIC_API_URL="https://api.mergeleague.com"
```

### API (`apps/api`)

Use [apps/api/.env.example](/C:/Users/engyb/MergeLeague/apps/api/.env.example).

Important production variables:

- `DATABASE_URL`
- `REDIS_URL`
- `API_PORT`
- `API_URL`
- `WEB_URL`
- `WEB_URLS`
- `JWT_SECRET`
- `LOG_LEVEL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `GITHUB_TOKEN`
- `STELLAR_POOL_SECRET_KEY`
- `STELLAR_POOL_PUBLIC_KEY`
- `STELLAR_SECRET_ENCRYPTION_KEY`

Production example:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
API_PORT=4000
API_URL="https://api.mergeleague.com"
WEB_URL="https://mergeleague.com"
WEB_URLS="https://mergeleague.com,https://www.mergeleague.com"
JWT_SECRET="use-a-long-random-secret"
LOG_LEVEL="info"
GITHUB_CALLBACK_URL="https://api.mergeleague.com/auth/github/callback"
STELLAR_NETWORK="TESTNET"
```

## 3. Database

### Neon

- Create a Postgres project.
- Copy the pooled connection string into `DATABASE_URL`.
- Enable IP access or public access for the backend host.

### Supabase

- Create a project and use the direct Postgres connection string for Prisma migrations.
- Use a pooled connection only if your Prisma setup is configured for it.

Run migrations with:

```bash
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
```

## 4. Vercel frontend

1. Import the repo into Vercel.
2. Set the project root directory to `apps/web`.
3. Add `NEXT_PUBLIC_API_URL`.
4. Deploy.

Optional config file: [apps/web/vercel.json](/C:/Users/engyb/MergeLeague/apps/web/vercel.json)

## 5. Railway backend

Files:

- [Dockerfile.api](/C:/Users/engyb/MergeLeague/Dockerfile.api)
- [railway.json](/C:/Users/engyb/MergeLeague/railway.json)

Steps:

1. Create a Railway service from this repo.
2. Confirm it uses `Dockerfile.api`.
3. Set all API environment variables.
4. Set the service domain, for example `api.mergeleague.com`.
5. Run migrations against production Postgres.

Recommended:

- Add a Redis service and wire `REDIS_URL`.
- Keep `SYNC_QUEUE=true` in production if you want BullMQ processing.

## 6. Fly.io backend

Files:

- [Dockerfile.api](/C:/Users/engyb/MergeLeague/Dockerfile.api)
- [fly.toml](/C:/Users/engyb/MergeLeague/fly.toml)

Steps:

1. Install `flyctl`.
2. Update `app = "mergeleague-api"` in `fly.toml`.
3. Create Fly secrets for the API env vars.
4. Deploy:

```bash
fly launch --no-deploy
fly secrets set DATABASE_URL="..." JWT_SECRET="..." WEB_URL="https://mergeleague.com"
fly deploy
```

## 7. Logging

The API now uses Winston through Nest in:

- [logger.ts](/C:/Users/engyb/MergeLeague/apps/api/src/logging/logger.ts)
- [main.ts](/C:/Users/engyb/MergeLeague/apps/api/src/main.ts)

Behavior:

- Development: readable console logs
- Production: structured JSON logs for Railway, Fly, Datadog, Logtail, or similar platforms

Set `LOG_LEVEL=info` or `LOG_LEVEL=debug` as needed.

## 8. CI/CD

Workflows:

- [ci.yml](/C:/Users/engyb/MergeLeague/.github/workflows/ci.yml)
- [deploy.yml](/C:/Users/engyb/MergeLeague/.github/workflows/deploy.yml)

### Required GitHub secrets

For Vercel:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

For Railway:

- `RAILWAY_TOKEN`
- `RAILWAY_SERVICE_NAME`

For migrations:

- `PRODUCTION_DATABASE_URL`

### What the workflows do

- `CI` installs dependencies, generates Prisma client, and builds the database, API, and web app.
- `Deploy` pushes the frontend to Vercel.
- `Deploy` optionally pushes the backend to Railway if Railway secrets are present.
- `Deploy` then runs `prisma migrate deploy` against production if `PRODUCTION_DATABASE_URL` is configured.

## 9. Go-live checklist

- Set `NEXT_PUBLIC_API_URL` to the production API origin.
- Set `WEB_URL` and `WEB_URLS` to the production frontend domains.
- Update GitHub OAuth callback URL to `https://api.mergeleague.com/auth/github/callback`.
- Add a production Redis instance.
- Run `prisma migrate deploy`.
- Seed at least one scoring version and an active season.
- Verify `/health`, GitHub OAuth, wallet creation, leaderboard sync, and realtime events.

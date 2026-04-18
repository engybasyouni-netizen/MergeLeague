# MergeLeague

Gamified monthly leaderboard for engineering teams: PRs merged, code reviews, bug fixes, and a transparent quality-weighted score. Entry fees pool in XLM on Stellar; payouts are on-chain and auditable.

## Stack

- **Web**: Next.js 14 (App Router), Tailwind CSS (add ShadCN with `npx shadcn@latest init` in `apps/web`).
- **API**: NestJS (REST + Socket.IO leaderboard namespace).
- **DB**: PostgreSQL + Prisma (`packages/database`).
- **Realtime**: Socket.IO (swap to Pusher or Redis adapter for scale).

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + Redis)

## Setup

1. **Start databases**

   ```bash
   docker compose up -d
   ```

2. **Environment**

   Copy `env.example` to `apps/api/.env` and set `DATABASE_URL`, GitHub OAuth, and Stellar testnet keys as needed. For the web app, create `apps/web/.env.local`:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. **Install and migrate**

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   ```

4. **Seed (optional)**

   Create a `ScoringVersion`, an `ACTIVE` `Season`, and link repos via Prisma Studio or a seed script (`packages/database`).

5. **Run**

   ```bash
   npm run dev:api
   npm run dev:web
   ```

   API: `http://localhost:4000` · Web: `http://localhost:3000`

## Freighter Wallet Mode (optional)

The Wallet page supports connecting a non-custodial Stellar address via the Freighter browser extension.

- If you **connect Freighter**, entry fee payments are created by the API as an **unsigned XDR** and then **signed + submitted by Freighter** in the browser.
- If you **create custodial wallet**, payments are signed server-side.

Prereqs:

- Install the Freighter extension.
- Fund your Freighter account on **Testnet** (or enable friendbot auto-fund in API env).

## Screenshots

### Dashboard
<img width="1920" height="1028" alt="image" src="https://github.com/user-attachments/assets/f5fa145b-7146-4d7c-b418-927f1c210713" />


### Team View
<img width="1915" height="981" alt="image" src="https://github.com/user-attachments/assets/7cf5a9b4-4c65-4e93-ae81-28bc0c4c3e09" />


### Wallet View
<img width="1920" height="1027" alt="image" src="https://github.com/user-attachments/assets/c2bc89ed-a127-4f8b-8d2c-1658b7d9f821" />


### Team Data
<img width="1916" height="1032" alt="image" src="https://github.com/user-attachments/assets/978ce0ec-19a0-4011-941e-743aeee4338c" />


### Leaderboard Data
<img width="1912" height="977" alt="image" src="https://github.com/user-attachments/assets/8ce81832-4fa4-486b-a9c4-96ade2064b07" />


## Phases (roadmap)

| Phase | Status |
|-------|--------|
| 1 Architecture | Documented in `docs/ARCHITECTURE.md` |
| 2 Database | Prisma schema in `packages/database/prisma/schema.prisma` |
| 3 Backend APIs | Nest modules under `apps/api/src` |
| 4 GitHub | Webhook + GraphQL samples |
| 5 Scoring | `ScoringService` |
| 6 Stellar | `StellarService` (verify + pay) |
| 7 Frontend | `apps/web` |
| 8 Realtime | `LeaderboardGateway` |
| 9 Security | Webhook HMAC, server-side scores, audit tables |
| 10 Deploy | See checklist in `docs/ARCHITECTURE.md` |

## License

Proprietary — your company / product license here.
https://www.loom.com/share/a9b02b2ed18a47b08b9a3f8c442ac486

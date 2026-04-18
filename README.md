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
![Dashboard](file:///C:/Users/engyb/.cursor/projects/c-Users-engyb-MergeLeague/assets/c__Users_engyb_AppData_Roaming_Cursor_User_workspaceStorage_1c3713882aab4276b400355c10bc00e6_images_image-1dc61c1c-efa1-40d3-bbf4-5330718afd78.png)

### Team View
![Team View](file:///C:/Users/engyb/.cursor/projects/c-Users-engyb-MergeLeague/assets/c__Users_engyb_AppData_Roaming_Cursor_User_workspaceStorage_1c3713882aab4276b400355c10bc00e6_images_image-db61e70d-07d1-419f-be2d-e135dff8f4b2.png)

### Wallet View
![Wallet View](file:///C:/Users/engyb/.cursor/projects/c-Users-engyb-MergeLeague/assets/c__Users_engyb_AppData_Roaming_Cursor_User_workspaceStorage_1c3713882aab4276b400355c10bc00e6_images_image-c52eb5fd-7007-4f1a-b519-16973834d1cb.png)

### Team Demo Data
![Team Demo Data](file:///C:/Users/engyb/.cursor/projects/c-Users-engyb-MergeLeague/assets/c__Users_engyb_AppData_Roaming_Cursor_User_workspaceStorage_1c3713882aab4276b400355c10bc00e6_images_image-d7bc4ee1-1d4b-44f6-bdad-dda7b325a5bf.png)

### Leaderboard Demo Data
![Leaderboard Demo Data](file:///C:/Users/engyb/.cursor/projects/c-Users-engyb-MergeLeague/assets/c__Users_engyb_AppData_Roaming_Cursor_User_workspaceStorage_1c3713882aab4276b400355c10bc00e6_images_image-6f5257f9-a4b9-4316-bc51-56c69be3b858.png)

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

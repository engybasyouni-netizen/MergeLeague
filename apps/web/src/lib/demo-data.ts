import type { CurrentUser, LeaderboardResponse, SeasonSummary, Team, WalletSummary } from "@/lib/types";

export const demoSeason: SeasonSummary = {
  id: "demo-season",
  name: "Demo Season",
  status: "ACTIVE",
  entryFeeXlm: "25.0000000",
};

export const demoLeaderboard: LeaderboardResponse = {
  season: demoSeason,
  rows: [
    { rank: 1, githubLogin: "octocat", totalPoints: "987.2500000", prCount: 22, issueCount: 9, reviewCount: 31 },
    { rank: 2, githubLogin: "merge-master", totalPoints: "842.5000000", prCount: 18, issueCount: 6, reviewCount: 27 },
    { rank: 3, githubLogin: "qa-wizard", totalPoints: "799.7500000", prCount: 14, issueCount: 15, reviewCount: 19 },
    { rank: 4, githubLogin: "dev-hero", totalPoints: "721.0000000", prCount: 16, issueCount: 4, reviewCount: 20 },
    { rank: 5, githubLogin: "ship-it", totalPoints: "650.1250000", prCount: 11, issueCount: 8, reviewCount: 16 },
  ],
};

export const demoWallet: WalletSummary = {
  id: "wallet-demo-1",
  publicKey: "GB3JDWCQ2WQJPLZ7Q6NN5ZDEMO3JDWCQ2WQJPLZ7Q6NN5ZDEMO12345",
  network: "TESTNET",
  label: "Freighter wallet",
  isPrimary: true,
  fundedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
};

export const demoUser: CurrentUser = {
  id: "demo-user",
  githubLogin: "dev-hero",
  email: "dev-hero@example.com",
  avatarUrl: null,
  teamMembers: [{ id: "tm-demo-1", role: "member", team: { id: "team-demo-1", name: "Frontend Guild", slug: "frontend-guild" } }],
  leagueEntries: [
    {
      id: "entry-demo-1",
      status: "ACTIVE",
      paidAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      entryTxHash: "DEMO_TX_HASH",
      paymentMemo: "demo-memo",
      season: demoSeason,
      team: { id: "team-demo-1", name: "Frontend Guild", slug: "frontend-guild" },
    },
  ],
  wallets: [demoWallet],
};

export const demoTeams: Team[] = [
  {
    id: "team-demo-1",
    name: "Frontend Guild",
    slug: "frontend-guild",
    members: [
      { id: "tm-1", role: "lead", user: { id: "u-1", githubLogin: "octocat", avatarUrl: null } },
      { id: "tm-2", role: "member", user: { id: "u-2", githubLogin: "dev-hero", avatarUrl: null } },
    ],
  },
  {
    id: "team-demo-2",
    name: "Quality Rangers",
    slug: "quality-rangers",
    members: [
      { id: "tm-3", role: "member", user: { id: "u-3", githubLogin: "qa-wizard", avatarUrl: null } },
      { id: "tm-4", role: "member", user: { id: "u-4", githubLogin: "ship-it", avatarUrl: null } },
    ],
  },
];


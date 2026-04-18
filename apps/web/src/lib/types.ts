export type SeasonSummary = {
  id: string;
  name: string;
  status: "UPCOMING" | "ACTIVE" | "ENDED" | "SETTLED";
  startsAt?: string;
  endsAt?: string;
  entryFeeXlm?: string;
};

export type LeaderboardRow = {
  rank: number | null;
  githubLogin: string;
  totalPoints?: string;
  totalScore?: string;
  qualityScore?: string;
  prCount?: number;
  issueCount?: number;
  reviewCount?: number;
  user?: {
    id?: string;
    githubLogin?: string;
    avatarUrl?: string | null;
  };
};

export type LeaderboardResponse = {
  season: SeasonSummary;
  rows: LeaderboardRow[];
};

export type Team = {
  id: string;
  name: string;
  slug: string;
  members?: {
    id: string;
    role: string;
    user: {
      id: string;
      githubLogin: string;
      avatarUrl?: string | null;
    };
  }[];
};

export type WalletSummary = {
  id: string;
  publicKey: string;
  network: string;
  label?: string | null;
  isPrimary: boolean;
  fundedAt?: string | null;
  createdAt: string;
};

export type LeagueEntry = {
  id: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "VOID";
  paidAt?: string | null;
  entryTxHash?: string | null;
  paymentMemo?: string | null;
  season: SeasonSummary;
  team?: { id: string; name: string; slug: string } | null;
};

export type CurrentUser = {
  id: string;
  githubLogin: string;
  email?: string | null;
  avatarUrl?: string | null;
  teamMembers: { id: string; role: string; team: Pick<Team, "id" | "name" | "slug"> }[];
  leagueEntries: LeagueEntry[];
  wallets: WalletSummary[];
};

export type JoinLeagueResponse = LeagueEntry & {
  payment: {
    network: string;
    walletPublicKey: string;
    poolPublicKey: string;
    amountXlm: string;
    memo: string;
  };
};

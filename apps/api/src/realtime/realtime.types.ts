export type RankChangeEvent = {
  seasonId: string;
  userId: string;
  githubLogin: string;
  previousRank: number | null;
  currentRank: number;
  direction: "up" | "down" | "new";
};


import { LiveLeaderboard } from "@/components/live-leaderboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentSeason, fetchLeaderboard } from "@/lib/api";
import type { LeaderboardResponse, SeasonSummary } from "@/lib/types";

async function loadLeaderboardData() {
  try {
    const season = await fetchCurrentSeason();
    const leaderboard = await fetchLeaderboard(season.id);
    return { season, leaderboard };
  } catch {
    const demoSeason: SeasonSummary = {
      id: "demo-season",
      name: "Demo Season",
      status: "ACTIVE",
      entryFeeXlm: "25.0000000",
    };
    const demoBoard: LeaderboardResponse = {
      season: demoSeason,
      rows: [
        { rank: 1, githubLogin: "octocat", totalPoints: "987.2500000", prCount: 22, issueCount: 9, reviewCount: 31 },
        { rank: 2, githubLogin: "merge-master", totalPoints: "842.5000000", prCount: 18, issueCount: 6, reviewCount: 27 },
        { rank: 3, githubLogin: "qa-wizard", totalPoints: "799.7500000", prCount: 14, issueCount: 15, reviewCount: 19 },
        { rank: 4, githubLogin: "dev-hero", totalPoints: "721.0000000", prCount: 16, issueCount: 4, reviewCount: 20 },
        { rank: 5, githubLogin: "ship-it", totalPoints: "650.1250000", prCount: 11, issueCount: 8, reviewCount: 16 },
      ],
    };

    return { season: demoSeason, leaderboard: demoBoard, demo: true as const };
  }
}

export default async function LeaderboardPage() {
  const { season, leaderboard, demo } = (await loadLeaderboardData()) as {
    season: SeasonSummary | null;
    leaderboard: LeaderboardResponse | null;
    demo?: true;
  };

  return (
    <main className="space-y-8 pb-10">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Rankings</Badge>
              {demo ? <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-100">Demo data</Badge> : null}
            </div>
            <CardTitle className="text-4xl">Season leaderboard</CardTitle>
            <p className="max-w-2xl text-slate-400">
              Track engineers by shipped PRs, bug fixes, review depth, and quality-adjusted score.
            </p>
          </div>
          {season ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <span>Season: {season.name}</span>
              <span>Status: {season.status}</span>
              {season.entryFeeXlm ? <span>Entry fee: {season.entryFeeXlm} XLM</span> : null}
            </div>
          ) : null}
        </CardHeader>
        {leaderboard ? (
          <CardContent className="pt-0">
            <LiveLeaderboard
              seasonId={leaderboard.season.id}
              initialData={leaderboard}
              title="Season leaderboard"
              description="Live standings update automatically when scores are recomputed."
            />
          </CardContent>
        ) : null}
      </Card>
    </main>
  );
}

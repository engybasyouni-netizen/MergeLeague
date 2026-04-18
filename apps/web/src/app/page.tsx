import Link from "next/link";
import { JoinLeagueModal } from "@/components/join-league-modal";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl, fetchCurrentSeason, fetchLeaderboard } from "@/lib/api";
import type { LeaderboardResponse, SeasonSummary } from "@/lib/types";
import { formatCompactNumber, formatXlm, timeAgo } from "@/lib/utils";

async function loadLandingData() {
  try {
    const season = await fetchCurrentSeason();
    const leaderboard = await fetchLeaderboard(season.id);
    return { season, leaderboard };
  } catch {
    return { season: null as SeasonSummary | null, leaderboard: null as LeaderboardResponse | null };
  }
}

export default async function HomePage() {
  const { season, leaderboard } = await loadLandingData();

  const stats = [
    { label: "Ranked engineers", value: leaderboard ? formatCompactNumber(leaderboard.rows.length) : "0" },
    { label: "Reward pool", value: season?.entryFeeXlm ? formatXlm(season.entryFeeXlm) : "TBD" },
    { label: "Season state", value: season?.status ?? "Offline" },
  ];

  return (
    <main className="space-y-8 pb-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-cyan-300/20">
          <CardHeader className="space-y-5">
            <Badge className="w-fit border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              Engineering competition, not vanity analytics
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white md:text-6xl">
                Reward shipped work, thoughtful reviews, and bug-fixing discipline.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                MergeLeague gives engineering teams a clean, transparent way to run seasonal leagues around merged PRs,
                meaningful reviews, and XLM-funded rewards on Stellar.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button>Open dashboard</Button>
              </Link>
              {season ? <JoinLeagueModal season={season} triggerLabel="Join this season" /> : null}
              <a
                href={`${apiUrl}/auth/github`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Connect GitHub
              </a>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why teams like it</CardTitle>
            <CardDescription>Purpose-built for engineering orgs that want competition without nonsense.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Quality-weighted scoring to stop PR spam from dominating.",
              "Seasonal XLM pools with auditable wallet flows and payout history.",
              "Leaderboard views that surface reviews, bug fixes, and consistency.",
              "Team pages that help leads see which collaboration patterns actually help shipping.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {leaderboard ? (
        <LeaderboardTable
          rows={leaderboard.rows.slice(0, 8)}
          title={leaderboard.season.name}
          description={
            leaderboard.season.endsAt
              ? `Current season ends ${timeAgo(leaderboard.season.endsAt)}`
              : "Live standings across merged work."
          }
          compact
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard offline</CardTitle>
            <CardDescription>Start the API, seed a season, and connect GitHub to light up the product demo.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}

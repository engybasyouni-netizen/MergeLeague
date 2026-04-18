"use client";

import { useEffect, useMemo, useState } from "react";
import { ContributionStats } from "@/components/contribution-stats";
import { JoinLeagueModal } from "@/components/join-league-modal";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MODE, apiUrl, fetchCurrentSeason, fetchLeaderboard, fetchMe, getStoredToken } from "@/lib/api";
import { demoLeaderboard, demoSeason, demoUser } from "@/lib/demo-data";
import type { CurrentUser, LeaderboardResponse, SeasonSummary } from "@/lib/types";
import { formatNumber, truncateKey } from "@/lib/utils";

export function DashboardClient() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const displayUser = demo ? demoUser : user;

  useEffect(() => {
    let active = true;
    const token = getStoredToken();

    (async () => {
      try {
        if (DEMO_MODE) {
          if (!active) return;
          setDemo(true);
          setSeason(demoSeason);
          setLeaderboard(demoLeaderboard);
          setUser(demoUser);
          setError(null);
          return;
        }

        const currentSeason = await fetchCurrentSeason();
        if (!active) return;
        setSeason(currentSeason);

        const board = await fetchLeaderboard(currentSeason.id);
        if (!active) return;
        setLeaderboard(board);

        if (!token) return;
        const me = await fetchMe(token);
        if (!active) return;
        setUser(me);
      } catch (cause) {
        if (!active) return;
        // Demo fallback: still render a complete dashboard when API is offline / ngrok not set / etc.
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
        setDemo(true);
        setSeason(demoSeason);
        setLeaderboard(demoBoard);
        setUser(null);
        setError(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const myRow = useMemo(() => {
    if (!leaderboard || !displayUser) return null;
    return leaderboard.rows.find((row) => row.githubLogin === displayUser.githubLogin) ?? null;
  }, [leaderboard, displayUser]);

  const stats = [
    { label: "Current rank", value: myRow?.rank?.toString() ?? "-", hint: "Position on the season board." },
    { label: "Total score", value: myRow ? formatNumber(myRow.totalPoints ?? "0") : "0", hint: "Quality-adjusted score." },
    { label: "Pull requests", value: String(myRow?.prCount ?? 0), hint: "Merged PRs credited this season." },
    { label: "Reviews", value: String(myRow?.reviewCount ?? 0), hint: "Meaningful review activity counted." },
  ];

  if (error) {
    return (
      <main className="pb-10">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-10">
      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card className="border-cyan-300/20">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit">Personal dashboard</Badge>
              {demo ? <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-100">Demo data</Badge> : null}
            </div>
            <div className="space-y-3">
              <CardTitle className="text-4xl">
                {displayUser ? `Welcome back, ${displayUser.githubLogin}.` : "Connect GitHub to unlock your dashboard."}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                Track your season standing, payment status, team membership, and wallet readiness from one clean control
                panel.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {season ? (
              <JoinLeagueModal season={season} teams={displayUser?.teamMembers.map((item) => item.team) ?? []} />
            ) : null}
            <a href={`${apiUrl}/auth/github`} className={!displayUser || demo ? "" : "hidden"}>
              <Badge className="cursor-pointer border-cyan-300/20 bg-cyan-300/10 py-3 text-cyan-100">
                Sign in with GitHub to load private data
              </Badge>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet readiness</CardTitle>
            <CardDescription>Season entry is server-signed and settled against the Stellar pool wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Primary wallet</p>
              <p className="mt-2 font-mono text-sm text-white">
                {displayUser?.wallets[0]
                  ? truncateKey(displayUser.wallets[0].publicKey)
                  : "Create or join a season to provision one"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Active entries</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {displayUser?.leagueEntries.filter((entry) => entry.status === "ACTIVE").length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <ContributionStats title="Your season signals" stats={stats} />

      {leaderboard ? (
        <LiveLeaderboard
          seasonId={leaderboard.season.id}
          initialData={leaderboard}
          title={leaderboard.season.name}
          description="Live standings across the current season."
        />
      ) : null}
    </main>
  );
}

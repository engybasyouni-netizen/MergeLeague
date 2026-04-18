"use client";

import { useEffect, useMemo, useState } from "react";
import { ContributionStats } from "@/components/contribution-stats";
import { JoinLeagueModal } from "@/components/join-league-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MODE, fetchCurrentSeason, fetchLeaderboard, fetchTeams, getStoredToken } from "@/lib/api";
import { demoLeaderboard, demoSeason, demoTeams } from "@/lib/demo-data";
import type { LeaderboardResponse, SeasonSummary, Team } from "@/lib/types";

export function TeamPageClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

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
          setTeams(demoTeams);
          setError(null);
          return;
        }

        const currentSeason = await fetchCurrentSeason();
        if (!active) return;
        setSeason(currentSeason);
        setLeaderboard(await fetchLeaderboard(currentSeason.id));

        if (!token) return;
        const loadedTeams = await fetchTeams(token);
        if (!active) return;
        setTeams(loadedTeams);
      } catch (cause) {
        if (!active) return;
        // Demo fallback: render a complete team page even when API is offline.
        const demoSeason: SeasonSummary = {
          id: "demo-season",
          name: "Demo Season",
          status: "ACTIVE",
          entryFeeXlm: "25.0000000",
        };
        const demoLeaderboard: LeaderboardResponse = {
          season: demoSeason,
          rows: [
            { rank: 1, githubLogin: "octocat", totalPoints: "987.2500000", prCount: 22, issueCount: 9, reviewCount: 31 },
            { rank: 2, githubLogin: "merge-master", totalPoints: "842.5000000", prCount: 18, issueCount: 6, reviewCount: 27 },
            { rank: 3, githubLogin: "qa-wizard", totalPoints: "799.7500000", prCount: 14, issueCount: 15, reviewCount: 19 },
            { rank: 4, githubLogin: "dev-hero", totalPoints: "721.0000000", prCount: 16, issueCount: 4, reviewCount: 20 },
            { rank: 5, githubLogin: "ship-it", totalPoints: "650.1250000", prCount: 11, issueCount: 8, reviewCount: 16 },
          ],
        };
        const demoTeams: Team[] = [
          {
            id: "team-demo-1",
            name: "Frontend Guild",
            slug: "frontend-guild",
            members: [
              {
                id: "tm-1",
                role: "lead",
                user: { id: "u-1", githubLogin: "octocat", avatarUrl: null },
              },
              {
                id: "tm-2",
                role: "member",
                user: { id: "u-2", githubLogin: "dev-hero", avatarUrl: null },
              },
            ],
          },
          {
            id: "team-demo-2",
            name: "Quality Rangers",
            slug: "quality-rangers",
            members: [
              {
                id: "tm-3",
                role: "member",
                user: { id: "u-3", githubLogin: "qa-wizard", avatarUrl: null },
              },
              {
                id: "tm-4",
                role: "member",
                user: { id: "u-4", githubLogin: "ship-it", avatarUrl: null },
              },
            ],
          },
        ];

        setDemo(true);
        setSeason(demoSeason);
        setLeaderboard(demoLeaderboard);
        setTeams(demoTeams);
        setError(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedTeam = teams[0] ?? null;

  const teamStats = useMemo(() => {
    if (!selectedTeam || !leaderboard) {
      return [
        { label: "Members", value: selectedTeam ? String(selectedTeam.members?.length ?? 0) : "0", hint: "People in this roster." },
        { label: "Top 10 engineers", value: "0", hint: "Members currently placing in the top ten." },
        { label: "Active season", value: season?.status ?? "-", hint: "Current season state." },
        { label: "Reviews", value: "0", hint: "Combined review count from visible leaderboard rows." },
      ];
    }

    const rows = leaderboard.rows.filter((row) =>
      (selectedTeam.members ?? []).some((member) => member.user.githubLogin === row.githubLogin),
    );

    return [
      { label: "Members", value: String(selectedTeam.members?.length ?? 0), hint: "People in this roster." },
      {
        label: "Top 10 engineers",
        value: String(rows.filter((row) => (row.rank ?? 99) <= 10).length),
        hint: "Members currently placing in the top ten.",
      },
      { label: "Active season", value: season?.status ?? "-", hint: "Current season state." },
      {
        label: "Reviews",
        value: String(rows.reduce((sum, row) => sum + (row.reviewCount ?? 0), 0)),
        hint: "Combined review count from current leaderboard data.",
      },
    ];
  }, [leaderboard, season?.status, selectedTeam]);

  return (
    <main className="space-y-8 pb-10">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Teams</Badge>
              {demo ? <Badge className="border-amber-300/30 bg-amber-300/10 text-amber-100">Demo data</Badge> : null}
            </div>
            <CardTitle className="text-4xl">Team competition view</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              See who is on your roster, how your team maps to leaderboard performance, and whether everyone is season ready.
            </CardDescription>
          </div>
          {season ? <JoinLeagueModal season={season} teams={teams} triggerLabel="Join season as team member" /> : null}
        </CardHeader>
      </Card>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Team data unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <ContributionStats title="Team snapshot" stats={teamStats} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your teams</CardTitle>
            <CardDescription>Team membership comes from the authenticated backend response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teams.length ? (
              teams.map((team) => (
                <div key={team.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{team.name}</p>
                      <p className="text-sm text-slate-400">{team.slug}</p>
                    </div>
                    <Badge>{team.members?.length ?? 0} members</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sign in to load your teams.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roster</CardTitle>
            <CardDescription>Cross-referenced against the current leaderboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTeam ? (
              (selectedTeam.members ?? []).map((member) => {
                const row = leaderboard?.rows.find((item) => item.githubLogin === member.user.githubLogin);
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      {member.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.user.avatarUrl}
                          alt={`${member.user.githubLogin} avatar`}
                          className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold uppercase text-slate-300">
                          {member.user.githubLogin.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{member.user.githubLogin}</p>
                        <p className="text-sm text-slate-400">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">Rank {row?.rank ?? "-"}</p>
                      <p className="text-slate-400">Score {row?.totalPoints ?? "0"}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400">No team memberships yet.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

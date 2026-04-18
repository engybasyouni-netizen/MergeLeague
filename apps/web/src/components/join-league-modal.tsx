"use client";

import { useMemo, useState } from "react";
import { joinLeague, getStoredToken } from "@/lib/api";
import type { JoinLeagueResponse, SeasonSummary, Team } from "@/lib/types";
import { formatXlm, truncateKey } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  season: SeasonSummary;
  teams?: Team[];
  triggerLabel?: string;
  onJoined?: (entry: JoinLeagueResponse) => void;
};

export function JoinLeagueModal({ season, teams = [], triggerLabel = "Join league", onJoined }: Props) {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JoinLeagueResponse | null>(null);

  const canJoin = useMemo(() => season.status === "ACTIVE" || season.status === "UPCOMING", [season.status]);

  async function handleSubmit() {
    const token = getStoredToken();
    if (!token) {
      setError("Sign in with GitHub first so we can attach the join to your account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joined = await joinLeague(token, {
        seasonId: season.id,
        teamId: teamId || undefined,
      });
      setResult(joined);
      onJoined?.(joined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Join failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!canJoin}>
        {canJoin ? triggerLabel : "Season closed"}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur">
          <Card className="w-full max-w-2xl border-cyan-300/20">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Join {season.name}</CardTitle>
                  <CardDescription>
                    Register your wallet, pick a team if you have one, and get payment instructions for the season entry.
                  </CardDescription>
                </div>
                <button className="text-slate-400 transition hover:text-white" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">Season status</p>
                    <p className="mt-1 text-lg font-semibold text-white">{season.status}</p>
                  </div>
                  <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                    Entry fee {formatXlm(season.entryFeeXlm ?? "0")}
                  </Badge>
                </div>
              </div>

              {teams.length ? (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">Join under a team</label>
                  <select
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                  >
                    <option value="">Solo entry</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {error ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

              {result ? (
                <div className="space-y-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-white">Entry created. Your wallet is ready for payment.</p>
                    <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                      {result.status}
                    </Badge>
                  </div>
                  <dl className="grid gap-3 text-sm text-slate-200">
                    <div>
                      <dt className="text-slate-400">Wallet</dt>
                      <dd>{truncateKey(result.payment.walletPublicKey)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Pool wallet</dt>
                      <dd>{truncateKey(result.payment.poolPublicKey)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Memo</dt>
                      <dd>{result.payment.memo}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-slate-300">
                    Next step: head to Wallet and submit the server-signed XLM payment into the pool.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !canJoin}>
                  {loading ? "Creating entry..." : "Create season entry"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

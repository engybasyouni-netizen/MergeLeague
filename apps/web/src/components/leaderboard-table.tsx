import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardRow } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  rows: LeaderboardRow[];
  compact?: boolean;
};

function fallbackScore(row: LeaderboardRow) {
  return row.totalPoints ?? row.totalScore ?? "0";
}

export function LeaderboardTable({ title = "Leaderboard", description, rows, compact = false }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-end justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <Badge className="text-cyan-100">{rows.length} ranked</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-white/10 bg-white/5 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Rank</th>
                <th className="px-6 py-4 font-medium">Engineer</th>
                <th className="px-6 py-4 font-medium">Score</th>
                {!compact ? <th className="px-6 py-4 font-medium">Quality</th> : null}
                {!compact ? <th className="px-6 py-4 font-medium">PRs</th> : null}
                {!compact ? <th className="px-6 py-4 font-medium">Bugs</th> : null}
                {!compact ? <th className="px-6 py-4 font-medium">Reviews</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.githubLogin}-${index}`} className="border-b border-white/5">
                  <td className="px-6 py-4">
                    <div
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-2xl border text-sm font-semibold",
                        index < 3
                          ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                          : "border-white/10 bg-white/5 text-slate-300",
                      )}
                    >
                      {row.rank ?? index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {row.user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.user.avatarUrl}
                          alt={`${row.githubLogin} avatar`}
                          className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold uppercase text-slate-200">
                          {row.githubLogin.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{row.githubLogin}</p>
                        <p className="text-xs text-slate-500">Contributor profile</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-cyan-100">{formatNumber(fallbackScore(row))}</td>
                  {!compact ? <td className="px-6 py-4 text-slate-300">{row.qualityScore ?? "0"}</td> : null}
                  {!compact ? <td className="px-6 py-4 text-slate-300">{row.prCount ?? 0}</td> : null}
                  {!compact ? <td className="px-6 py-4 text-slate-300">{row.issueCount ?? 0}</td> : null}
                  {!compact ? <td className="px-6 py-4 text-slate-300">{row.reviewCount ?? 0}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}


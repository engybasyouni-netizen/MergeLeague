"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MODE, apiUrl, fetchLeaderboard, getStoredToken } from "@/lib/api";
import type { LeaderboardResponse } from "@/lib/types";

type RankChangeNotification = {
  seasonId: string;
  userId: string;
  githubLogin: string;
  previousRank: number | null;
  currentRank: number;
  direction: "up" | "down" | "new";
};

type Props = {
  seasonId: string;
  initialData?: LeaderboardResponse | null;
  compact?: boolean;
  title?: string;
  description?: string;
  showNotifications?: boolean;
};

function notificationCopy(notification: RankChangeNotification) {
  if (notification.direction === "new") {
    return `You entered the leaderboard at rank #${notification.currentRank}.`;
  }

  if (notification.direction === "up") {
    return `You climbed from #${notification.previousRank} to #${notification.currentRank}.`;
  }

  return `You moved from #${notification.previousRank} to #${notification.currentRank}.`;
}

export function LiveLeaderboard({
  seasonId,
  initialData = null,
  compact = false,
  title,
  description,
  showNotifications = true,
}: Props) {
  const [data, setData] = useState<LeaderboardResponse | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<RankChangeNotification[]>([]);

  useEffect(() => {
    if (DEMO_MODE) {
      // Demo mode disables polling + sockets.
      setError(null);
      return;
    }
    let active = true;
    let socket: Socket | null = null;

    const refresh = async () => {
      try {
        const response = await fetchLeaderboard(seasonId);
        if (!active) return;
        setData(response);
        setError(null);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Failed to load leaderboard");
      }
    };

    void refresh();

    socket = io(`${apiUrl}/leaderboard`, {
      transports: ["websocket"],
      auth: {
        token: getStoredToken() ?? undefined,
      },
    });

    socket.on("connect", () => {
      socket?.emit("subscribe", { seasonId });
    });

    socket.on("leaderboard:updated", (payload: { seasonId?: string }) => {
      if (payload?.seasonId !== seasonId) return;
      void refresh();
    });

    socket.on("notification:rank-changed", (payload: RankChangeNotification) => {
      if (payload.seasonId !== seasonId) return;
      setNotifications((current) => [payload, ...current].slice(0, 3));
      void refresh();
    });

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [seasonId]);

  const latestNotification = useMemo(() => notifications[0] ?? null, [notifications]);

  if (error) {
    return <p className="text-sm text-amber-300">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-400">Loading leaderboard...</p>;
  }

  return (
    <div className="space-y-4">
      {showNotifications && latestNotification ? (
        <Card className="border-cyan-300/20">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Rank update</CardTitle>
              <CardDescription>{notificationCopy(latestNotification)}</CardDescription>
            </div>
            <Badge
              className={
                latestNotification.direction === "up"
                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                  : "border-amber-300/20 bg-amber-300/10 text-amber-100"
              }
            >
              {latestNotification.direction === "up" ? "Moving up" : latestNotification.direction}
            </Badge>
          </CardHeader>
          {notifications.length > 1 ? (
            <CardContent className="pt-0 text-xs text-slate-400">
              {notifications.slice(1).map((item, index) => (
                <p key={`${item.currentRank}-${index}`}>{notificationCopy(item)}</p>
              ))}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <LeaderboardTable
        rows={data.rows}
        compact={compact}
        title={title ?? data.season.name}
        description={description}
      />
    </div>
  );
}


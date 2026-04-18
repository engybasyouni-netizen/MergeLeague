"use client";

import { LiveLeaderboard } from "@/components/live-leaderboard";

export function LeaderboardPreview({ seasonId }: { seasonId: string }) {
  return <LiveLeaderboard seasonId={seasonId} compact description="Live via Socket.IO." showNotifications={false} />;
}

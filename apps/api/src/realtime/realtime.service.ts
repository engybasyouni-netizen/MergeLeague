import { Injectable } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import type { RankChangeEvent } from "./realtime.types";

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  publishLeaderboardUpdated(seasonId: string, changes: RankChangeEvent[]) {
    this.gateway.emitLeaderboardUpdated(seasonId, changes);

    for (const change of changes) {
      this.gateway.emitRankChange(change);
    }
  }
}


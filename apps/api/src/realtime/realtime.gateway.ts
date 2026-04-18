import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import type { RankChangeEvent } from "./realtime.types";

type JwtPayload = { sub: string };

@WebSocketGateway({
  namespace: "/leaderboard",
  cors: {
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      client.data.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));
    } catch {
      client.data.userId = null;
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage("subscribe")
  async subscribeToSeason(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { seasonId?: string } | undefined,
  ) {
    if (!body?.seasonId) {
      return { ok: false, message: "seasonId is required" };
    }

    await client.join(this.seasonRoom(body.seasonId));
    return { ok: true, seasonId: body.seasonId };
  }

  emitLeaderboardUpdated(seasonId: string, changes: RankChangeEvent[]) {
    this.server.to(this.seasonRoom(seasonId)).emit("leaderboard:updated", {
      seasonId,
      changes,
      changedCount: changes.length,
      generatedAt: new Date().toISOString(),
    });
  }

  emitRankChange(change: RankChangeEvent) {
    this.server.to(this.userRoom(change.userId)).emit("notification:rank-changed", change);
  }

  private extractToken(client: Socket) {
    const authToken =
      typeof client.handshake.auth?.token === "string" ? client.handshake.auth.token : null;
    if (authToken) {
      return authToken.replace(/^Bearer\s+/i, "");
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === "string") {
      return header.replace(/^Bearer\s+/i, "");
    }

    return null;
  }

  private seasonRoom(seasonId: string) {
    return `season:${seasonId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}


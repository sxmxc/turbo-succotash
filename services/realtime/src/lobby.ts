import { randomUUID } from "node:crypto";
import { Room, type AuthContext, type Client } from "@colyseus/core";
import { schema, t, type SchemaType } from "@colyseus/schema";
import {
  movementIntentSchema as moveSchema,
  movementTargetSchema as targetSchema,
  protocolVersion,
  roomChatCommandSchema as chatSchema,
} from "../../../packages/contracts/src/index.js";
import { moveWithCollision, roomLayout } from "./world.js";

export const PlayerState = schema(
  {
    userId: t.string().default(""),
    name: t.string().default(""),
    x: t.number().default(0),
    y: t.number().default(0),
    direction: t.string().default("south"),
    walking: t.boolean().default(false),
    shirtTint: t.number().default(0xefd6a2),
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const LobbyState = schema({ players: t.map(PlayerState) }, "LobbyState");
export type LobbyState = SchemaType<typeof LobbyState>;

type Authenticated = { user: { id: string; name: string } };
type Intent = {
  dx: number;
  dy: number;
  target?: { x: number; y: number };
  updatedAt: number;
};
const allowedTints = new Set([0xefd6a2, 0xaadbc4, 0xc3b3e5]);

export function createLobbyRoom(identityUrl: string) {
  return class LobbyRoom extends Room<{ state: LobbyState }> {
    maxClients = 20;
    autoDispose = false;
    private intents = new Map<string, Intent>();
    private chatWindows = new Map<string, number[]>();
    private requestIds = new Map<string, Set<string>>();

    static async onAuth(
      _token: string,
      options: unknown,
      context: AuthContext,
    ): Promise<Authenticated | false> {
      if (
        typeof options !== "object" ||
        options === null ||
        (options as { protocol?: unknown }).protocol !== protocolVersion
      )
        return false;
      const cookie = context.headers.get("cookie");
      if (!cookie) return false;
      const response = await fetch(`${identityUrl}/identity/auth/get-session`, {
        headers: { cookie },
        signal: AbortSignal.timeout(1800),
      });
      if (!response.ok) return false;
      const data = (await response.json()) as {
        user?: { id?: unknown; name?: unknown };
      };
      return typeof data.user?.id === "string" &&
        typeof data.user.name === "string"
        ? { user: { id: data.user.id, name: data.user.name } }
        : false;
    }

    onCreate() {
      this.setState(new LobbyState());
      this.setSimulationInterval((delta) => this.simulate(delta), 50);
      this.onMessage("move", (client, message) => {
        const parsed = moveSchema.safeParse(message);
        if (!parsed.success) return;
        const length = Math.hypot(parsed.data.dx, parsed.data.dy) || 1;
        this.intents.set(client.sessionId, {
          dx: parsed.data.dx / length,
          dy: parsed.data.dy / length,
          updatedAt: Date.now(),
        });
      });
      this.onMessage("move-to", (client, message) => {
        const parsed = targetSchema.safeParse(message);
        if (!parsed.success) return;
        this.intents.set(client.sessionId, {
          dx: 0,
          dy: 0,
          target: {
            x: Math.max(
              roomLayout.bounds.left,
              Math.min(roomLayout.bounds.right, parsed.data.x),
            ),
            y: Math.max(
              roomLayout.bounds.top,
              Math.min(roomLayout.bounds.bottom, parsed.data.y),
            ),
          },
          updatedAt: Date.now(),
        });
      });
      this.onMessage("chat", (client, message) => {
        const parsed = chatSchema.safeParse(message);
        if (!parsed.success || !this.allowChat(client.sessionId)) return;
        const ids = this.requestIds.get(client.sessionId) ?? new Set<string>();
        if (ids.has(parsed.data.clientRequestId)) return;
        ids.add(parsed.data.clientRequestId);
        if (ids.size > 100) ids.delete(ids.values().next().value!);
        this.requestIds.set(client.sessionId, ids);
        const player = this.state.players.get(client.sessionId);
        if (!player) return;
        this.broadcast("chat", {
          serverMessageId: randomUUID(),
          clientRequestId: parsed.data.clientRequestId,
          senderId: player.userId,
          senderName: player.name,
          timestamp: new Date().toISOString(),
          channel: "room",
          text: parsed.data.text,
        });
      });
    }

    onJoin(client: Client, options: { shirtTint?: unknown }) {
      const auth = client.auth as Authenticated;
      const index = this.state.players.size;
      const player = new PlayerState();
      const spawn = roomLayout.spawns[index % roomLayout.spawns.length]!;
      player.userId = auth.user.id;
      player.name = auth.user.name;
      player.x = spawn.x;
      player.y = spawn.y;
      player.shirtTint =
        typeof options?.shirtTint === "number" &&
        allowedTints.has(options.shirtTint)
          ? options.shirtTint
          : 0xefd6a2;
      this.state.players.set(client.sessionId, player);
    }

    onLeave(client: Client) {
      this.state.players.delete(client.sessionId);
      this.intents.delete(client.sessionId);
      this.chatWindows.delete(client.sessionId);
      this.requestIds.delete(client.sessionId);
    }

    private allowChat(sessionId: string) {
      const now = Date.now();
      const window = (this.chatWindows.get(sessionId) ?? []).filter(
        (time) => now - time < 5000,
      );
      if (window.length >= 5) return false;
      window.push(now);
      this.chatWindows.set(sessionId, window);
      return true;
    }

    private simulate(deltaMs: number) {
      const speed = 92;
      for (const [sessionId, player] of this.state.players) {
        const intent = this.intents.get(sessionId);
        let dx = intent?.dx ?? 0;
        let dy = intent?.dy ?? 0;
        if (intent?.target) {
          const targetDx = intent.target.x - player.x;
          const targetDy = intent.target.y - player.y;
          const distance = Math.hypot(targetDx, targetDy);
          if (distance < 3) {
            this.intents.delete(sessionId);
            dx = 0;
            dy = 0;
          } else {
            dx = targetDx / distance;
            dy = targetDy / distance;
          }
        } else if (intent && Date.now() - intent.updatedAt > 300) {
          dx = 0;
          dy = 0;
        }
        const next = moveWithCollision(
          player,
          { x: dx * speed, y: dy * speed },
          Math.min(deltaMs, 100) / 1000,
        );
        player.x = next.x;
        player.y = next.y;
        player.walking = dx !== 0 || dy !== 0;
        if (player.walking)
          player.direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx < 0
                ? "west"
                : "east"
              : dy < 0
                ? "north"
                : "south";
      }
    }
  };
}

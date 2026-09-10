import { randomUUID } from "node:crypto";
import { Room, type AuthContext, type Client } from "@colyseus/core";
import { schema, t, type SchemaType } from "@colyseus/schema";
import {
  movementIntentSchema as moveSchema,
  movementTargetSchema as targetSchema,
  protocolVersion,
  roomChatCommandSchema as chatSchema,
  directMessageCommandSchema as directMessageSchema,
  messageReadCommandSchema as messageReadSchema,
  messageReactionCommandSchema as reactionSchema,
  typingCommandSchema as typingSchema,
} from "../../../packages/contracts/src/index.js";
import {
  generatedRooms,
  moveWithCollision,
  roomLayout,
  type RoomLayout,
} from "./world.js";

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

type Authenticated = {
  user: { id: string; name: string };
  room: { id: string; address: string; templateId: string; capacity: number };
  cookie: string;
};
type Intent = {
  dx: number;
  dy: number;
  target?: { x: number; y: number };
  updatedAt: number;
};
const allowedTints = new Set([0xefd6a2, 0xaadbc4, 0xc3b3e5]);
const onlineClients = new Map<string, Set<Client>>();

export function createGameRoom(
  identityUrl: string,
  apiUrl: string,
  internalToken: string,
) {
  return class LobbyRoom extends Room<{ state: LobbyState }> {
    maxClients = 20;
    autoDispose = true;
    private intents = new Map<string, Intent>();
    private chatWindows = new Map<string, number[]>();
    private requestIds = new Map<string, Set<string>>();
    private layout: RoomLayout = roomLayout;

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
      const address =
        typeof (options as { address?: unknown }).address === "string"
          ? (options as { address: string }).address
          : "F000-R000";
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
      if (
        typeof data.user?.id !== "string" ||
        typeof data.user.name !== "string"
      )
        return false;
      const admission = await fetch(
        `${apiUrl}/v1/rooms/${encodeURIComponent(address)}/admission`,
        {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({
            password: (options as { password?: unknown }).password,
          }),
          signal: AbortSignal.timeout(1800),
        },
      );
      if (!admission.ok) return false;
      const room = (await admission.json()) as Authenticated["room"];
      return generatedRooms[room.templateId]
        ? { user: { id: data.user.id, name: data.user.name }, room, cookie }
        : false;
    }

    onCreate() {
      this.state = new LobbyState();
      this.setTimestep((delta) => this.simulate(delta), 50);
      this.clock.setInterval(() => {
        for (const client of this.clients)
          void this.writePresence(client.auth as Authenticated, true);
      }, 15_000);
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
              this.layout.bounds.left,
              Math.min(this.layout.bounds.right, parsed.data.x),
            ),
            y: Math.max(
              this.layout.bounds.top,
              Math.min(this.layout.bounds.bottom, parsed.data.y),
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
      this.onMessage("direct-message", async (client, message) => {
        const parsed = directMessageSchema.safeParse(message);
        if (!parsed.success || !this.allowChat(client.sessionId)) return;
        const sender = this.state.players.get(client.sessionId);
        if (!sender) return;
        const recipients = onlineClients.get(parsed.data.recipientId);
        const stored = await fetch(`${apiUrl}/internal/direct-messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-realtime-internal-token": internalToken,
          },
          body: JSON.stringify({
            clientRequestId: parsed.data.clientRequestId,
            senderId: sender.userId,
            senderName: sender.name,
            recipientId: parsed.data.recipientId,
            text: parsed.data.text,
            delivered: Boolean(recipients?.size),
          }),
          signal: AbortSignal.timeout(1800),
        }).catch(() => undefined);
        if (!stored?.ok) return;
        const event = (await stored.json()) as { recipientId: string };
        client.send("direct-message", event);
        for (const recipient of onlineClients.get(event.recipientId) ?? [])
          recipient.send("direct-message", event);
      });
      this.onMessage("message-reaction", async (client, message) => {
        const parsed = reactionSchema.safeParse(message);
        const sender = this.state.players.get(client.sessionId);
        if (!parsed.success || !sender) return;
        const event = {
          messageId: parsed.data.messageId,
          emoji: parsed.data.emoji,
          userId: sender.userId,
          active: parsed.data.active,
        };
        if (!parsed.data.recipientId)
          return this.broadcast("message-reaction", event);
        const stored = await fetch(
          `${apiUrl}/internal/direct-messages/${encodeURIComponent(parsed.data.messageId)}/reaction`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              "x-realtime-internal-token": internalToken,
            },
            body: JSON.stringify({
              userId: sender.userId,
              emoji: parsed.data.emoji,
              active: parsed.data.active,
            }),
            signal: AbortSignal.timeout(1800),
          },
        ).catch(() => undefined);
        if (!stored?.ok) return;
        const persisted = (await stored.json()) as { recipientId: string };
        client.send("message-reaction", event);
        for (const recipient of onlineClients.get(persisted.recipientId) ?? [])
          recipient.send("message-reaction", event);
      });
      this.onMessage("typing", async (client, message) => {
        const parsed = typingSchema.safeParse(message);
        const sender = this.state.players.get(client.sessionId);
        if (!parsed.success || !sender) return;
        const event = {
          senderId: sender.userId,
          senderName: sender.name,
          channel: parsed.data.recipientId
            ? ("direct" as const)
            : ("room" as const),
          active: parsed.data.active,
        };
        if (!parsed.data.recipientId)
          return this.broadcast("typing", event, { except: client });
        if (!(await this.canDirect(sender.userId, parsed.data.recipientId)))
          return;
        for (const recipient of onlineClients.get(parsed.data.recipientId) ??
          [])
          recipient.send("typing", event);
      });
      this.onMessage("message-read", async (client, message) => {
        const parsed = messageReadSchema.safeParse(message);
        const reader = this.state.players.get(client.sessionId);
        if (!parsed.success || !reader) return;
        const stored = await fetch(
          `${apiUrl}/internal/direct-messages/${encodeURIComponent(parsed.data.messageId)}/read`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json",
              "x-realtime-internal-token": internalToken,
            },
            body: JSON.stringify({ readerId: reader.userId }),
            signal: AbortSignal.timeout(1800),
          },
        ).catch(() => undefined);
        if (!stored?.ok) return;
        const event = (await stored.json()) as {
          messageId: string;
          senderId: string;
          readerId: string;
          readAt: string;
        };
        for (const sender of onlineClients.get(event.senderId) ?? [])
          sender.send("message-read", event);
      });
    }

    onJoin(client: Client, options: { shirtTint?: unknown; spawn?: unknown }) {
      const auth = client.auth as Authenticated;
      this.layout = generatedRooms[auth.room.templateId] ?? roomLayout;
      this.maxClients = auth.room.capacity;
      this.setMetadata({
        roomId: auth.room.id,
        address: auth.room.address,
        templateId: auth.room.templateId,
      });
      const index = this.state.players.size;
      const spawn =
        this.layout.spawns.find(
          (entry) => "name" in entry && entry.name === options.spawn,
        ) ?? this.layout.spawns[index % this.layout.spawns.length]!;
      const player = new PlayerState().assign({
        userId: auth.user.id,
        name: auth.user.name,
        x: spawn.x,
        y: spawn.y,
        shirtTint:
          typeof options?.shirtTint === "number" &&
          allowedTints.has(options.shirtTint)
            ? options.shirtTint
            : 0xefd6a2,
      });
      this.state.players.set(client.sessionId, player);
      const sessions = onlineClients.get(auth.user.id) ?? new Set<Client>();
      sessions.add(client);
      onlineClients.set(auth.user.id, sessions);
      void this.writePresence(auth, true);
    }

    onLeave(client: Client) {
      this.state.players.delete(client.sessionId);
      this.intents.delete(client.sessionId);
      this.chatWindows.delete(client.sessionId);
      this.requestIds.delete(client.sessionId);
      const auth = client.auth as Authenticated;
      const sessions = onlineClients.get(auth.user.id);
      sessions?.delete(client);
      if (!sessions?.size) {
        onlineClients.delete(auth.user.id);
        void this.writePresence(auth, false);
      }
    }

    private async writePresence(auth: Authenticated, online: boolean) {
      await fetch(`${apiUrl}/internal/presence`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-realtime-internal-token": internalToken,
        },
        body: JSON.stringify({
          userId: auth.user.id,
          name: auth.user.name,
          roomId: auth.room.id,
          address: auth.room.address,
          online,
        }),
        signal: AbortSignal.timeout(1800),
      }).catch(() => undefined);
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

    private async canDirect(senderId: string, recipientId: string) {
      try {
        const allowed = await fetch(`${apiUrl}/internal/social/can-message`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-realtime-internal-token": internalToken,
          },
          body: JSON.stringify({ senderId, recipientId }),
          signal: AbortSignal.timeout(1800),
        });
        return (
          allowed.ok &&
          ((await allowed.json()) as { allowed?: boolean }).allowed === true
        );
      } catch {
        return false;
      }
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
          this.layout,
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

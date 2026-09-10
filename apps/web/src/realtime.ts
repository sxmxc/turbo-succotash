import { Callbacks, Client, type Room } from "@colyseus/sdk";
import { protocolVersion } from "../../../packages/contracts/src/index";

export type RoomPlayer = {
  sessionId: string;
  userId: string;
  name: string;
  x: number;
  y: number;
  direction: "north" | "west" | "south" | "east";
  walking: boolean;
  shirtTint: number;
};
export type ChatEvent = {
  serverMessageId: string;
  clientRequestId: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  channel: "room";
  text: string;
};
export type DirectMessageEvent = Omit<ChatEvent, "channel"> & {
  recipientId: string;
  channel: "direct";
  deliveredAt: string | null;
  readAt: string | null;
};
export type MessageReactionEvent = {
  messageId: string;
  emoji: string;
  userId: string;
  active: boolean;
};
export type TypingEvent = {
  senderId: string;
  senderName: string;
  channel: "room" | "direct";
  active: boolean;
};
export type MessageReadEvent = {
  messageId: string;
  readerId: string;
  readAt: string;
};

type SynchronizedPlayer = Omit<RoomPlayer, "sessionId">;

export type RoomConnection = {
  sessionId: string;
  sendMove(dx: number, dy: number): void;
  moveTo(x: number, y: number): void;
  sendChat(text: string): void;
  sendDirectMessage(recipientId: string, text: string): void;
  sendReaction(
    messageId: string,
    emoji: string,
    active: boolean,
    recipientId?: string,
  ): void;
  sendTyping(active: boolean, recipientId?: string): void;
  markMessageRead(messageId: string, senderId: string): void;
  leave(): Promise<void>;
};

export type RoomDescriptor = {
  id: string;
  floor: number;
  room: number;
  address: string;
  templateId: string;
  name: string;
  private: boolean;
  capacity: number;
};

function clientRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function connectLobby(
  shirtTint: number,
  onPlayers: (players: RoomPlayer[]) => void,
  onChat: (message: ChatEvent) => void,
  onDirectMessage: (message: DirectMessageEvent) => void = () => {},
  onReaction: (reaction: MessageReactionEvent) => void = () => {},
  onTyping: (event: TypingEvent) => void = () => {},
  onMessageRead: (event: MessageReadEvent) => void = () => {},
): Promise<RoomConnection> {
  return connectRoom(
    {
      address: "F000-R000",
      password: undefined,
      spawn: "default_elevator_spawn",
    },
    shirtTint,
    onPlayers,
    onChat,
    onDirectMessage,
    onReaction,
    onTyping,
    onMessageRead,
  );
}

export async function connectRoom(
  destination: { address: string; password?: string; spawn?: string },
  shirtTint: number,
  onPlayers: (players: RoomPlayer[]) => void,
  onChat: (message: ChatEvent) => void,
  onDirectMessage: (message: DirectMessageEvent) => void = () => {},
  onReaction: (reaction: MessageReactionEvent) => void = () => {},
  onTyping: (event: TypingEvent) => void = () => {},
  onMessageRead: (event: MessageReadEvent) => void = () => {},
): Promise<RoomConnection> {
  const client = new Client({
    hostname: window.location.hostname,
    port: Number(window.location.port) || undefined,
    secure: window.location.protocol === "https:",
    pathname: "/realtime",
  });
  const roomName = destination.address === "F000-R000" ? "lobby" : "room";
  const room: Room = await client.joinOrCreate(roomName, {
    shirtTint,
    protocol: protocolVersion,
    ...destination,
  });
  const synchronizedPlayers = new Map<string, SynchronizedPlayer>();
  const publishPlayers = () =>
    onPlayers(
      Array.from(synchronizedPlayers, ([sessionId, player]) => ({
        sessionId,
        userId: player.userId,
        name: player.name,
        x: player.x,
        y: player.y,
        direction: player.direction,
        walking: player.walking,
        shirtTint: player.shirtTint,
      })),
    );
  const callbacks = Callbacks.get(room);
  callbacks.onAdd("players", (decodedPlayer, decodedSessionId) => {
    const player = decodedPlayer as SynchronizedPlayer;
    const sessionId = decodedSessionId as string;
    synchronizedPlayers.set(sessionId, player);
    callbacks.onChange(player, publishPlayers);
    publishPlayers();
  });
  callbacks.onRemove("players", (_player, decodedSessionId) => {
    synchronizedPlayers.delete(decodedSessionId as string);
    publishPlayers();
  });
  room.onMessage("chat", onChat);
  room.onMessage("direct-message", onDirectMessage);
  room.onMessage("message-reaction", onReaction);
  room.onMessage("typing", onTyping);
  room.onMessage("message-read", onMessageRead);
  return {
    sessionId: room.sessionId,
    sendMove: (dx, dy) => room.send("move", { dx, dy }),
    moveTo: (x, y) => room.send("move-to", { x, y }),
    sendChat: (text) =>
      room.send("chat", { clientRequestId: clientRequestId(), text }),
    sendDirectMessage: (recipientId, text) =>
      room.send("direct-message", {
        clientRequestId: clientRequestId(),
        recipientId,
        text,
      }),
    sendReaction: (messageId, emoji, active, recipientId) =>
      room.send("message-reaction", {
        messageId,
        emoji,
        active,
        ...(recipientId ? { recipientId } : {}),
      }),
    sendTyping: (active, recipientId) =>
      room.send("typing", {
        active,
        ...(recipientId ? { recipientId } : {}),
      }),
    markMessageRead: (messageId, senderId) =>
      room.send("message-read", { messageId, senderId }),
    leave: async () => {
      await room.leave(true);
      onPlayers([]);
    },
  };
}

import { Client, type Room } from "@colyseus/sdk";
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

export type RoomConnection = {
  sessionId: string;
  sendMove(dx: number, dy: number): void;
  moveTo(x: number, y: number): void;
  sendChat(text: string): void;
  leave(): Promise<void>;
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
): Promise<RoomConnection> {
  const client = new Client({
    hostname: window.location.hostname,
    port: Number(window.location.port) || undefined,
    secure: window.location.protocol === "https:",
    pathname: "/realtime",
  });
  const room: Room = await client.joinOrCreate("lobby", {
    shirtTint,
    protocol: protocolVersion,
  });
  const publishPlayers = () => {
    const players: RoomPlayer[] = [];
    room.state.players.forEach(
      (player: Omit<RoomPlayer, "sessionId">, sessionId: string) => {
        players.push({
          sessionId,
          userId: player.userId,
          name: player.name,
          x: player.x,
          y: player.y,
          direction: player.direction,
          walking: player.walking,
          shirtTint: player.shirtTint,
        });
      },
    );
    onPlayers(players);
  };
  room.onStateChange(publishPlayers);
  room.onMessage("chat", onChat);
  return {
    sessionId: room.sessionId,
    sendMove: (dx, dy) => room.send("move", { dx, dy }),
    moveTo: (x, y) => room.send("move-to", { x, y }),
    sendChat: (text) =>
      room.send("chat", { clientRequestId: clientRequestId(), text }),
    leave: async () => {
      await room.leave(true);
      onPlayers([]);
    },
  };
}

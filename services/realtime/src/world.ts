import { roomLayouts } from "../../../packages/room-data/src/rooms.generated.js";

interface RoomLayout {
  width: number;
  height: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  obstacles: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  spawns: readonly { x: number; y: number }[];
  playerFootprint: { width: number; height: number };
}

const placeholderRoomLayout = {
  width: 480,
  height: 312,
  bounds: { left: 32, top: 32, right: 448, bottom: 280 },
  obstacles: [
    { x: 320, y: 72, width: 64, height: 32 },
    { x: 64, y: 64, width: 24, height: 24 },
    { x: 392, y: 240, width: 24, height: 24 },
  ],
  spawns: [{ x: 176, y: 156 }],
  playerFootprint: { width: 20, height: 10 },
} as const;

const generatedRooms = roomLayouts as Record<string, RoomLayout>;
export const roomLayout = generatedRooms.lobby ?? placeholderRoomLayout;

export type Position = { x: number; y: number };

export function canOccupy(position: Position) {
  const halfWidth = roomLayout.playerFootprint.width / 2;
  const rect = {
    left: position.x - halfWidth,
    right: position.x + halfWidth,
    top: position.y - roomLayout.playerFootprint.height,
    bottom: position.y,
  };
  if (
    rect.left < roomLayout.bounds.left ||
    rect.right > roomLayout.bounds.right ||
    rect.top < roomLayout.bounds.top ||
    rect.bottom > roomLayout.bounds.bottom
  )
    return false;
  return !roomLayout.obstacles.some(
    (obstacle) =>
      rect.left < obstacle.x + obstacle.width &&
      rect.right > obstacle.x &&
      rect.top < obstacle.y + obstacle.height &&
      rect.bottom > obstacle.y,
  );
}

export function moveWithCollision(
  position: Position,
  velocity: Position,
  deltaSeconds: number,
) {
  const next = { ...position };
  const distance = Math.hypot(velocity.x, velocity.y) * deltaSeconds;
  const steps = Math.max(1, Math.ceil(distance / 4));
  const stepSeconds = deltaSeconds / steps;
  for (let step = 0; step < steps; step++) {
    const x = { x: next.x + velocity.x * stepSeconds, y: next.y };
    if (canOccupy(x)) next.x = x.x;
    const y = { x: next.x, y: next.y + velocity.y * stepSeconds };
    if (canOccupy(y)) next.y = y.y;
  }
  return next;
}

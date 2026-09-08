import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canOccupy,
  moveWithCollision,
  roomLayout,
} from "../services/realtime/src/world.js";

test("authoritative movement stays in bounds and walls block the player footprint", () => {
  const spawn = roomLayout.spawns[0]!;
  const obstacle = roomLayout.obstacles[0]!;
  assert.equal(canOccupy(spawn), true);
  assert.equal(canOccupy({ x: roomLayout.bounds.left - 1, y: spawn.y }), false);
  assert.equal(
    canOccupy({
      x: obstacle.x + obstacle.width / 2,
      y: obstacle.y + obstacle.height,
    }),
    false,
  );
  const stopped = moveWithCollision(spawn, { x: -1000, y: 0 }, 1);
  assert.ok(stopped.x >= roomLayout.bounds.left);
  assert.equal(stopped.y, spawn.y);
});

test("movement collision is independent of other player positions", () => {
  const start = roomLayout.spawns[0]!;
  const moved = moveWithCollision(start, { x: 20, y: 0 }, 0.5);
  assert.ok(Math.abs(moved.x - (start.x + 10)) < 0.0001);
  assert.equal(moved.y, start.y);
});

test("movement accepts prototype-backed positions such as Colyseus schemas", () => {
  const start = roomLayout.spawns[0]!;
  const schemaLike = Object.create({ x: start.x, y: start.y }) as {
    x: number;
    y: number;
  };
  const moved = moveWithCollision(schemaLike, { x: 20, y: 0 }, 0.5);
  assert.ok(Math.abs(moved.x - (start.x + 10)) < 0.0001);
  assert.equal(moved.y, start.y);
});

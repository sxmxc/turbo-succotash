import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canOccupy,
  moveWithCollision,
  roomLayout,
} from "../services/realtime/src/world.js";

test("authoritative movement stays in bounds and walls block the player footprint", () => {
  assert.equal(canOccupy({ x: roomLayout.bounds.left - 1, y: 160 }), false);
  assert.equal(canOccupy({ x: 300, y: 120 }), true);
  assert.equal(canOccupy({ x: 330, y: 110 }), false);
  const stopped = moveWithCollision({ x: 306, y: 110 }, { x: 100, y: 0 }, 1);
  assert.ok(stopped.x < 320);
  assert.equal(stopped.y, 110);
});

test("movement collision is independent of other player positions", () => {
  const start = { x: 200, y: 180 };
  const moved = moveWithCollision(start, { x: 20, y: 0 }, 0.5);
  assert.ok(Math.abs(moved.x - 210) < 0.0001);
  assert.equal(moved.y, 180);
});

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
// The production pipeline intentionally stays plain Node so it can run before TypeScript build tooling.
// @ts-expect-error The JavaScript build script has no declaration file.
import { packageTiledMap } from "../scripts/tiled-rooms.mjs";

function exportedMap(image: string) {
  return {
    orientation: "orthogonal",
    infinite: false,
    width: 4,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [{ firstgid: 1, name: "Interior", image }],
    layers: [
      { type: "tilelayer", name: "Ground", visible: true, data: [] },
      {
        type: "objectgroup",
        name: "Gameplay",
        objects: [
          { class: "spawn", point: true, x: 24, y: 32 },
          { class: "collision", x: 16, y: 16, width: 32, height: 16 },
        ],
      },
    ],
  };
}

test("packages Tiled JSON and PNG data for Phaser and realtime", () => {
  const temporary = mkdtempSync(join(tmpdir(), "tiled-room-test-"));
  try {
    const image = join(temporary, "interior.png");
    const exported = join(temporary, "lobby.json");
    const output = join(temporary, "out");
    writeFileSync(image, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const map = exportedMap("interior.png");
    const result = packageTiledMap("lobby", map, exported, output);

    assert.equal(result.web.mapKey, "room:lobby:map");
    assert.deepEqual(result.web.layers, [{ name: "Ground", depth: 0 }]);
    assert.deepEqual(result.server.bounds, {
      left: 0,
      top: 0,
      right: 64,
      bottom: 48,
    });
    assert.deepEqual(result.server.spawns, [{ x: 24, y: 32 }]);
    assert.deepEqual(result.server.obstacles, [
      { x: 16, y: 16, width: 32, height: 16 },
    ]);
    const packaged = JSON.parse(readFileSync(join(output, "map.json"), "utf8"));
    assert.equal(packaged.tilesets[0].image, "tilesets/interior.png");
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("rejects external tilesets that were not embedded", () => {
  const temporary = mkdtempSync(join(tmpdir(), "tiled-room-test-"));
  try {
    const map = exportedMap("interior.png");
    map.tilesets = [{ firstgid: 1, source: "interior.tsx" }];
    assert.throws(
      () => packageTiledMap("lobby", map, "lobby.json", temporary),
      /external after export/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

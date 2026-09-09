import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
// The production pipeline intentionally stays plain Node so it can run before TypeScript build tooling.
// @ts-expect-error The JavaScript build script has no declaration file.
import { discoverTiledMaps, packageTiledMap } from "../scripts/tiled-rooms.mjs";

function exportedMap(image: string) {
  return {
    orientation: "orthogonal",
    infinite: false,
    width: 4,
    height: 3,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [
      {
        firstgid: 1,
        name: "Interior",
        image,
        tiles: [
          {
            id: 0,
            objectgroup: {
              objects: [
                {
                  class: "collision",
                  x: 0,
                  y: 0,
                  width: 16,
                  height: 16,
                },
              ],
            },
          },
        ],
      },
    ],
    layers: [
      {
        type: "tilelayer",
        name: "Ground",
        visible: true,
        width: 4,
        data: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      },
      {
        type: "objectgroup",
        name: "Gameplay",
        objects: [
          { class: "spawn", name: "entry", point: true, x: 24, y: 32 },
          {
            id: 8,
            type: "elevator",
            name: "Elevator",
            x: 32,
            y: 0,
            width: 16,
            height: 32,
          },
          {
            id: 9,
            class: "door",
            name: "Exit",
            x: 48,
            y: 0,
            width: 16,
            height: 32,
            properties: [
              { name: "display_label", value: "Lobby" },
              { name: "destination", value: "floor_0_lobby" },
              { name: "destination_spawn", value: "default_door_spawn" },
            ],
          },
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
    assert.deepEqual(result.server.spawns, [{ name: "entry", x: 24, y: 32 }]);
    assert.deepEqual(result.web.interactions, [
      {
        id: "8",
        kind: "elevator",
        name: "Elevator",
        displayLabel: "Elevator",
        x: 32,
        y: 0,
        width: 16,
        height: 32,
      },
      {
        id: "9",
        kind: "door",
        name: "Exit",
        displayLabel: "Lobby",
        destination: "floor_0_lobby",
        destinationSpawn: "default_door_spawn",
        x: 48,
        y: 0,
        width: 16,
        height: 32,
      },
    ]);
    assert.deepEqual(result.server.obstacles, [
      { x: 16, y: 16, width: 16, height: 16 },
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
    const map = {
      ...exportedMap("interior.png"),
      tilesets: [{ firstgid: 1, source: "interior.tsx" }],
    };
    assert.throws(
      () => packageTiledMap("lobby", map, "lobby.json", temporary),
      /external after export/,
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("discovers nested templates and ignores empty placeholder directories", () => {
  const temporary = mkdtempSync(join(tmpdir(), "tiled-room-discovery-"));
  try {
    mkdirSync(join(temporary, "floor_0_lobby"));
    mkdirSync(join(temporary, "templates", "appartment_template"), {
      recursive: true,
    });
    mkdirSync(join(temporary, "templates", "lobby_template", "garden"), {
      recursive: true,
    });
    writeFileSync(join(temporary, "floor_0_lobby", "lobby.tmx"), "");
    writeFileSync(
      join(temporary, "templates", "lobby_template", "garden", "map.tmx"),
      "",
    );

    assert.deepEqual(discoverTiledMaps(temporary), [
      {
        id: "floor_0_lobby",
        source: join(temporary, "floor_0_lobby", "lobby.tmx"),
      },
      {
        id: "templates/lobby_template/garden",
        source: join(
          temporary,
          "templates",
          "lobby_template",
          "garden",
          "map.tmx",
        ),
      },
    ]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

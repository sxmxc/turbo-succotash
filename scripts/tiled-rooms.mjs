import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(repositoryRoot, "assets/rooms");
const webRoot = join(repositoryRoot, "apps/web/public/assets/rooms");
const serverDataPath = join(
  repositoryRoot,
  "packages/room-data/src/rooms.generated.ts",
);

function fail(message) {
  throw new Error(`Tiled rooms: ${message}`);
}

function slug(value) {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!result) fail(`cannot make an asset key from "${value}"`);
  return result;
}

function objectKind(object) {
  return object.class || object.type || "";
}

function flattenLayers(layers, prefix = "") {
  return layers.flatMap((layer) => {
    const name = prefix ? `${prefix}/${layer.name}` : layer.name;
    if (layer.type === "group") return flattenLayers(layer.layers ?? [], name);
    return [{ ...layer, runtimeName: name }];
  });
}

function propertyValue(properties, name) {
  return properties?.find((property) => property.name === name)?.value;
}

function requiredStringProperty(roomId, object, name) {
  const value = propertyValue(object.properties, name);
  if (typeof value !== "string" || !value.trim())
    fail(`${roomId}: ${objectKind(object)} "${object.name}" needs ${name}`);
  return value;
}

function optionalStringProperty(roomId, object, name, fallback) {
  const value = propertyValue(object.properties, name);
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !value.trim())
    fail(
      `${roomId}: ${objectKind(object)} "${object.name}" has invalid ${name}`,
    );
  return value;
}

function rectangleObstacle(roomId, object, offsetX = 0, offsetY = 0) {
  if (
    object.ellipse ||
    object.gid ||
    object.polygon ||
    object.polyline ||
    object.rotation ||
    !Number.isFinite(object.x) ||
    !Number.isFinite(object.y) ||
    !Number.isFinite(object.width) ||
    !Number.isFinite(object.height) ||
    object.width <= 0 ||
    object.height <= 0
  )
    fail(`${roomId}: collision objects must be axis-aligned rectangles`);
  return {
    x: offsetX + object.x,
    y: offsetY + object.y,
    width: object.width,
    height: object.height,
  };
}

function interactionRectangle(roomId, object) {
  if (
    object.ellipse ||
    object.gid ||
    object.polygon ||
    object.polyline ||
    object.rotation ||
    !Number.isFinite(object.x) ||
    !Number.isFinite(object.y) ||
    !Number.isFinite(object.width) ||
    !Number.isFinite(object.height) ||
    object.width <= 0 ||
    object.height <= 0
  )
    fail(`${roomId}: interaction objects must be axis-aligned rectangles`);
  const kind = objectKind(object);
  return {
    id: String(object.id),
    kind,
    name: object.name || kind,
    displayLabel: optionalStringProperty(
      roomId,
      object,
      "display_label",
      object.name || kind,
    ),
    ...(kind === "door"
      ? {
          destination: requiredStringProperty(roomId, object, "destination"),
          destinationSpawn: requiredStringProperty(
            roomId,
            object,
            "destination_spawn",
          ),
        }
      : {}),
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
  };
}

function tileCollisionObstacles(roomId, map, layers) {
  const tilesets = [...(map.tilesets ?? [])].sort(
    (left, right) => right.firstgid - left.firstgid,
  );
  const obstacles = [];
  for (const layer of layers.filter((entry) => entry.type === "tilelayer")) {
    if (!Array.isArray(layer.data))
      fail(`${roomId}: tile layers must export as finite JSON arrays`);
    for (const [index, rawGid] of layer.data.entries()) {
      const unsignedGid = rawGid >>> 0;
      const gid = unsignedGid & 0x0fffffff;
      if (!gid) continue;
      const tileset = tilesets.find((entry) => gid >= entry.firstgid);
      if (!tileset) fail(`${roomId}: tile GID ${gid} has no tileset`);
      const tile = tileset.tiles?.find(
        (entry) => entry.id === gid - tileset.firstgid,
      );
      const collisionObjects = (tile?.objectgroup?.objects ?? []).filter(
        (object) => objectKind(object) === "collision",
      );
      if (!collisionObjects.length) continue;
      if (unsignedGid !== gid)
        fail(`${roomId}: flipped collision tiles are not supported yet`);
      const column = index % layer.width;
      const row = Math.floor(index / layer.width);
      const tileX =
        ((layer.x ?? 0) + column) * map.tilewidth + (layer.offsetx ?? 0);
      const tileY =
        ((layer.y ?? 0) + row) * map.tileheight + (layer.offsety ?? 0);
      obstacles.push(
        ...collisionObjects.map((object) =>
          rectangleObstacle(roomId, object, tileX, tileY),
        ),
      );
    }
  }
  return obstacles;
}

export function packageTiledMap(roomId, map, exportedMapPath, roomOutput) {
  if (map.orientation !== "orthogonal")
    fail(`${roomId}: only orthogonal maps are supported`);
  if (map.infinite)
    fail(`${roomId}: infinite maps are not supported by the room server`);
  if (!Number.isFinite(map.width) || !Number.isFinite(map.height))
    fail(`${roomId}: map dimensions are missing`);
  if (!Number.isFinite(map.tilewidth) || !Number.isFinite(map.tileheight))
    fail(`${roomId}: tile dimensions are missing`);

  const tilesetKeys = new Set();
  const tilesets = (map.tilesets ?? []).map((tileset, index) => {
    if (tileset.source)
      fail(`${roomId}: tileset ${index + 1} is external after export`);
    if (!tileset.name || !tileset.image)
      fail(
        `${roomId}: tilesets must use one PNG spritesheet, not a collection of images`,
      );
    const sourceImage = resolve(dirname(exportedMapPath), tileset.image);
    if (extname(sourceImage).toLowerCase() !== ".png")
      fail(`${roomId}: tileset "${tileset.name}" must use a PNG image`);
    if (!existsSync(sourceImage))
      fail(`${roomId}: missing tileset image ${sourceImage}`);
    const tilesetSlug = slug(tileset.name);
    if (tilesetKeys.has(tilesetSlug))
      fail(`${roomId}: tileset names must produce unique asset keys`);
    tilesetKeys.add(tilesetSlug);
    const outputName = `${tilesetSlug}.png`;
    const outputRelative = `tilesets/${outputName}`;
    const outputImage = join(roomOutput, outputRelative);
    mkdirSync(dirname(outputImage), { recursive: true });
    copyFileSync(sourceImage, outputImage);
    tileset.image = outputRelative;
    return {
      name: tileset.name,
      key: `room:${roomId}:tileset:${tilesetSlug}`,
      url: `/assets/rooms/${roomId}/${outputRelative}`,
    };
  });

  const layers = flattenLayers(map.layers ?? []);
  const tileLayers = layers
    .filter((layer) => layer.type === "tilelayer" && layer.visible !== false)
    .map((layer, depth) => ({
      name: layer.runtimeName,
      depth: propertyValue(layer.properties, "depth") ?? depth,
    }));
  if (!tileLayers.length) fail(`${roomId}: no visible tile layers were found`);

  const gameplayObjects = layers
    .filter((layer) => layer.type === "objectgroup")
    .flatMap((layer) => layer.objects ?? []);
  const obstacles = [
    ...tileCollisionObstacles(roomId, map, layers),
    ...gameplayObjects
      .filter((object) => objectKind(object) === "collision")
      .map((object) => rectangleObstacle(roomId, object)),
  ];
  const spawns = gameplayObjects
    .filter((object) => objectKind(object) === "spawn")
    .map((object) => {
      if (!object.point || !object.name)
        fail(`${roomId}: spawns must be named point objects`);
      return { name: object.name, x: object.x, y: object.y };
    });
  if (!spawns.length)
    fail(`${roomId}: add at least one point object with class "spawn"`);
  if (new Set(spawns.map((spawn) => spawn.name)).size !== spawns.length)
    fail(`${roomId}: spawn object names must be unique`);
  const interactions = gameplayObjects
    .filter(
      (object) => !["", "collision", "spawn"].includes(objectKind(object)),
    )
    .map((object) => interactionRectangle(roomId, object));

  const width = map.width * map.tilewidth;
  const height = map.height * map.tileheight;
  const packagedMap = join(roomOutput, "map.json");
  mkdirSync(roomOutput, { recursive: true });
  writeFileSync(packagedMap, `${JSON.stringify(map, null, 2)}\n`);

  return {
    web: {
      id: roomId,
      mapKey: `room:${roomId}:map`,
      mapUrl: `/assets/rooms/${roomId}/map.json`,
      width,
      height,
      tilesets,
      layers: tileLayers,
      interactions,
    },
    server: {
      width,
      height,
      bounds: { left: 0, top: 0, right: width, bottom: height },
      obstacles,
      spawns,
      playerFootprint: { width: 20, height: 10 },
    },
  };
}

export function discoverTiledMaps(root = sourceRoot) {
  if (!existsSync(root)) return [];
  const discovered = [];
  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true });
    const maps = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".tmx"),
    );
    const id = relative(root, directory).split(sep).join("/");
    if (maps.length > 1)
      fail(`${id}: expected at most one .tmx file, found ${maps.length}`);
    if (maps.length === 1)
      discovered.push({ id, source: join(directory, maps[0].name) });
    for (const entry of entries.filter((entry) => entry.isDirectory()))
      visit(join(directory, entry.name));
  }
  visit(root);
  return discovered.sort((a, b) => a.id.localeCompare(b.id));
}

function tiledCommand() {
  const command = process.env.TILED_BIN || "tiled";
  if (process.platform !== "linux" || process.env.DISPLAY)
    return { command, prefix: [] };
  try {
    execFileSync("xvfb-run", ["--help"], { stdio: "ignore" });
    return { command: "xvfb-run", prefix: ["-a", command] };
  } catch {
    return { command, prefix: [] };
  }
}

function exportMap(source, destination) {
  const tiled = tiledCommand();
  try {
    execFileSync(
      tiled.command,
      [
        ...tiled.prefix,
        "--export-map",
        "--embed-tilesets",
        "--minimize",
        source,
        destination,
      ],
      { stdio: "inherit" },
    );
  } catch (error) {
    if (error?.code === "ENOENT")
      fail(
        "the Tiled CLI is required (set TILED_BIN; Linux headless builds also need xvfb-run)",
      );
    throw error;
  }
}

export function buildRooms() {
  const maps = discoverTiledMaps();
  mkdirSync(dirname(webRoot), { recursive: true });
  const stagingRoot = mkdtempSync(join(dirname(webRoot), ".rooms-"));
  const stagingWebRoot = join(stagingRoot, "web");
  const stagingServerData = join(stagingRoot, "rooms.generated.ts");
  const webRooms = [];
  const serverRooms = {};
  try {
    mkdirSync(stagingWebRoot, { recursive: true });
    for (const room of maps) {
      const exportedMap = join(stagingRoot, `${slug(room.id)}.json`);
      exportMap(room.source, exportedMap);
      const data = JSON.parse(readFileSync(exportedMap, "utf8"));
      const packaged = packageTiledMap(
        room.id,
        data,
        exportedMap,
        join(stagingWebRoot, room.id),
      );
      webRooms.push(packaged.web);
      serverRooms[room.id] = packaged.server;
    }
    writeFileSync(
      join(stagingWebRoot, "manifest.json"),
      `${JSON.stringify({ schemaVersion: 1, rooms: webRooms }, null, 2)}\n`,
    );
    writeFileSync(
      stagingServerData,
      `// Generated by scripts/tiled-rooms.mjs. Do not edit.\nexport const roomLayouts = ${JSON.stringify(serverRooms, null, 2)} as const;\n`,
    );
    rmSync(webRoot, { recursive: true, force: true });
    renameSync(stagingWebRoot, webRoot);
    mkdirSync(dirname(serverDataPath), { recursive: true });
    rmSync(serverDataPath, { force: true });
    renameSync(stagingServerData, serverDataPath);
    console.log(`Built ${maps.length} Tiled room(s).`);
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) buildRooms();

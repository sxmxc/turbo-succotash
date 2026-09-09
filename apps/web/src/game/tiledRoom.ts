import Phaser from "phaser";
import manifestJson from "../../public/assets/rooms/manifest.json";

export interface RoomInteraction {
  id: string;
  kind: string;
  name: string;
  displayLabel?: string;
  destination?: string;
  destinationSpawn?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoomAsset {
  id: string;
  mapKey: string;
  mapUrl: string;
  width: number;
  height: number;
  tilesets: { name: string; key: string; url: string }[];
  layers: { name: string; depth: number }[];
  interactions?: RoomInteraction[];
}

interface RoomManifest {
  schemaVersion: 1;
  rooms: RoomAsset[];
}

const manifest = manifestJson as RoomManifest;

export function roomAsset(roomId: string) {
  return manifest.rooms.find((room) => room.id === roomId);
}

export function preloadRoom(scene: Phaser.Scene, room: RoomAsset) {
  scene.load.tilemapTiledJSON(room.mapKey, room.mapUrl);
  for (const tileset of room.tilesets)
    scene.load.image(tileset.key, tileset.url);
}

export function createRoom(scene: Phaser.Scene, room: RoomAsset) {
  const map = scene.make.tilemap({ key: room.mapKey });
  const tilesets = room.tilesets.map((asset) => {
    const tileset = map.addTilesetImage(asset.name, asset.key);
    if (!tileset)
      throw new Error(
        `Tiled tileset "${asset.name}" is missing from room "${room.id}"`,
      );
    return tileset;
  });
  for (const layer of room.layers) {
    const gameObject = map.createLayer(layer.name, tilesets);
    if (!gameObject)
      throw new Error(
        `Tiled layer "${layer.name}" is missing from room "${room.id}"`,
      );
    gameObject.setDepth(layer.depth);
  }
  scene.cameras.main.setBounds(0, 0, room.width, room.height);
  return map;
}

export function roomInteractions(
  room: RoomAsset,
  map: Phaser.Tilemaps.Tilemap,
) {
  if (room.interactions) return room.interactions;
  return map.objects.flatMap((layer) =>
    layer.objects.flatMap((object) => {
      const kind = (object as { class?: string }).class || object.type || "";
      const { x, y, width, height } = object;
      if (
        !kind ||
        kind === "collision" ||
        kind === "spawn" ||
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      )
        return [];
      const property = (name: string) =>
        object.properties?.find(
          (entry: { name: string; value: unknown }) => entry.name === name,
        )?.value;
      return [
        {
          id: String(object.id),
          kind,
          name: object.name || kind,
          displayLabel:
            (property("display_label") as string | undefined) ||
            object.name ||
            kind,
          destination: property("destination") as string | undefined,
          destinationSpawn: property("destination_spawn") as string | undefined,
          x,
          y,
          width,
          height,
        },
      ];
    }),
  );
}

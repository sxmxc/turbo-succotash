import Phaser from "phaser";
import manifestJson from "../../public/assets/rooms/manifest.json";

interface RoomAsset {
  id: string;
  mapKey: string;
  mapUrl: string;
  width: number;
  height: number;
  tilesets: { name: string; key: string; url: string }[];
  layers: { name: string; depth: number }[];
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

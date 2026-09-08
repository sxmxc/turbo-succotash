# Tiled room sources

Put each room template in its own directory:

```text
assets/rooms/
  floor_0_lobby/
    floor-0-lobby.tmx
    castle-inside.tsx
    castle-inside.png
```

Each directory contains exactly one finite orthogonal TMX map. External TSX tilesets are encouraged for authoring, and each tileset uses one PNG sheet.

Author at least one map point object with class (or legacy type) `spawn`. Author environment collision primarily as rectangle objects in each colliding tile’s TSX objectgroup, with object class/type `collision`. When the tile is placed, the pipeline translates its local collision rectangles into world obstacles. Standalone map rectangle objects with class/type `collision` are also supported.

Run `npm run rooms:build`. The official Tiled CLI exports embedded-tileset JSON; the repository script validates and packages JSON/PNGs for Phaser and generates matching server bounds, spawn and collision data. Commit generated files under `apps/web/public/assets/rooms` and `packages/room-data/src/rooms.generated.ts`; never edit them manually.

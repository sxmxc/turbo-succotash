# Tiled room sources

Put each room template in its own directory:

```text
assets/rooms/
  floor_0_lobby/
    floor-0-lobby.tmx
    castle-inside.tsx
    castle-inside.png
  templates/
    appartment_template/
    lobby_template/
    large_room_template/
    medium_room_template/
    small_room_template/
```

`floor_0_lobby` is the unique Floor 0 lobby and is not a reusable template. The directories under `templates` are placeholders until their Tiled sources are authored. Empty directories are ignored by the build. A directory containing a map contains exactly one finite orthogonal TMX file; nested theme directories are supported, and the stable template ID is its path relative to `assets/rooms` (for example, `templates/lobby_template/garden`). External TSX tilesets are encouraged for authoring, and each tileset uses one PNG sheet.

New floors start from a lobby template. New accounts receive an apartment based on an apartment template, and user-created rooms start from the selected small, medium, or large room template. Later, multiple themed maps may live below `lobby_template`; floor creation will choose among those starter themes. Template selection and instance creation remain server-owned application behavior, separate from packaging the authored maps.

Author at least one map point object with class (or legacy type) `spawn`. Author environment collision primarily as rectangle objects in each colliding tile’s TSX objectgroup, with object class/type `collision`. When the tile is placed, the pipeline translates its local collision rectangles into world obstacles. Standalone map rectangle objects with class/type `collision` are also supported.

Run `npm run rooms:build`. The official Tiled CLI exports embedded-tileset JSON; the repository script validates and packages JSON/PNGs for Phaser and generates matching server bounds, spawn and collision data. Commit generated files under `apps/web/public/assets/rooms` and `packages/room-data/src/rooms.generated.ts`; never edit them manually.

Tiled owns TMX/TSX formatting. Its `.tsx` files are excluded from Prettier and associated with XML in the VS Code workspace so the TypeScript language service does not parse them as React source. Generated room JSON and TypeScript are also excluded from Prettier because `npm run rooms:build` owns their serialization.

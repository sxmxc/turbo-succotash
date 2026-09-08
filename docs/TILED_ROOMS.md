# Tiled room pipeline

Room templates are authored as TMX maps with external TSX tilesets and PNG tilesheets under [`assets/rooms`](../assets/rooms/README.md). Runtime code does not parse XML. `npm run rooms:build` calls the official Tiled exporter with `--embed-tilesets`, validates the JSON, copies and rewrites PNG references, and creates two generated views from the same source:

- `apps/web/public/assets/rooms/manifest.json` plus each room’s `map.json` and PNGs for Phaser Loader/Tilemap APIs.
- `packages/room-data/src/rooms.generated.ts` for server-authoritative dimensions, bounds, spawns and environment collision.

The current source is `assets/rooms/floor_0_lobby/floor-0-lobby.tmx`; its stable template ID is the directory name `floor_0_lobby`. Generated files are committed and are not edited by hand.

## Tooling

Install stable Tiled and make `tiled` available on `PATH`, or set `TILED_BIN`. On headless Linux install `xvfb-run`; the script uses it when `DISPLAY` is absent. The pipeline is verified with Tiled 1.12.2.

```sh
npm run rooms:build
npm run check
```

The exporter writes to a staging directory and replaces generated outputs only after all rooms validate. Phaser requires Tiled JSON with embedded tilesets and does not support image-collection tilesets in this pipeline, so invalid sources fail with a room-specific message.

## Authoring contract

- Each room directory name is its stable template ID.
- Maps are finite, orthogonal and contain exactly one TMX entry map.
- External TSX files are encouraged for authoring; each tileset uses one PNG sheet.
- Visible tile layers render in Tiled order. Grouped layers retain their Tiled hierarchy/name.
- At least one point object on a map object layer has class or legacy type `spawn`.
- Environment collision is normally authored inside a tile’s TSX objectgroup. Each collision object has class or legacy type `collision`; every placed instance of that tile contributes translated authoritative rectangles.
- Standalone axis-aligned map objects with class/type `collision` are also accepted.
- Flipped tiles that carry collision shapes are rejected until shape transforms are implemented rather than silently generating wrong geometry.
- Tileset names are unique within a map because each becomes a Phaser texture key.

Phaser renders the exported map and tilesheets. Realtime imports only the generated numeric room data, so it never parses TMX/TSX or trusts browser collision. The player footprint remains separate from tile shapes.

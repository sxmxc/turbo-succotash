# Tiled room pipeline

Room layouts are authored as TMX maps with external TSX tilesets and PNG
tilesheets under [`assets/rooms`](../assets/rooms/README.md). The runtime does
not parse XML. `npm run rooms:build` calls the official Tiled exporter with
`--embed-tilesets`, validates its JSON, copies and rewrites PNG references, and
creates two generated views of the same source:

- `apps/web/public/assets/rooms/manifest.json` and per-room `map.json`/PNGs for
  Phaser's Loader and Tilemap APIs;
- `packages/room-data/src/rooms.generated.ts` for server-authoritative bounds,
  spawns, and environment collision.

## Tooling

Install the stable Tiled CLI and make `tiled` available on `PATH`, or set
`TILED_BIN` to its executable. On headless Linux, install `xvfb-run`; the script
uses it automatically when `DISPLAY` is absent. The current pipeline was written
against Tiled 1.12.2's documented CLI. Run:

```bash
npm run rooms:build
npm run check
```

Tiled supports automated map export with `--export-map`. Phaser requires Tiled
JSON with embedded tilesets and does not support image-collection tilesets, so
the pipeline rejects those inputs early with a room-specific error.

## Runtime rules

- Directory names are stable room template IDs, such as `lobby` or `cafe`.
- Maps must be finite and orthogonal.
- Visible tile layers render in Tiled order. Grouped layers use Phaser's
  `Group/Layer` names.
- Every map needs a point object whose class is `spawn`.
- Rectangle objects whose class is `collision` become authoritative obstacles.
- A tileset name must be unique within a map because it becomes a Phaser texture
  key. Tileset files may be shared between room source directories.

The checked-in empty manifests are intentional until the first room sources are
added. The current graphics lobby remains an explicit fallback; adding a valid
`assets/rooms/lobby` source and rebuilding makes Phaser use the Tiled lobby.

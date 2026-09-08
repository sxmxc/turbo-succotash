# Decisions

## 2026-09-08 — Product name

- The confirmed product name is Panverse Plaza, replacing the working name Social Room.
- The npm/Compose identifier is `panverse-plaza`; local OCI images use `panverse-plaza-<service>:dev`. This rename changes deployment artifact names but does not change HTTP, realtime protocol, database schemas, or persisted room identifiers.

## 2026-09-08 — Starter room templates

- `floor_0_lobby` remains unique. New floors use a lobby starter; new accounts receive a template-based apartment; user-created rooms use the applicable small, medium or large starter.
- Reusable Tiled sources live under `assets/rooms/templates`. Empty placeholders are permitted until maps are authored, and nested theme paths provide collision-free template IDs.
- Multiple lobby themes are planned. Floor creation will randomly choose an available theme server-side when that behavior is implemented.

## 2026-09-07 — Bootstrap implementation

- Accepted npm workspaces, coordinated software version 0.1.0 and GitHub Actions matching the detected remote.
- Selected pinned stable dependencies and the newest TypeScript compatible with typescript-eslint; see [dependency evidence](../docs/DEPENDENCIES.md).
- Selected modular Colyseus core/ws packages, Better Auth with Fastify, separate restricted PostgreSQL schemas/roles, append-only checked migrations, and multi-target Compose images.
- Historical character decision: the bootstrap’s generated 16 × 16 placeholder was explicitly superseded by LPC.
- Milestone 0 is complete. Its service foundations did not create product restrictions for later milestones.

## 2026-09-07 — LPC character source

- Universal LPC is the initial character source. Imported five unchanged compatible walk layers at pinned upstream commit `d44ea7d6904891aab8627b80ff4de1560d63bdff` under their common CC-BY-SA 3.0 option.
- Frame dimensions/layout, anchors, provenance and credits are per asset. Do not generalize the inspected 64 × 64, 9-column, 4-row layout to other LPC sheets.
- Superseded implementation detail: the local preview’s manual shared frame clock was replaced in Milestone 1 by Phaser AnimationManager/AnimationState while retaining synchronized layered animation.

## 2026-09-08 — Phaser and Tiled ownership

- Phaser Scene plugins own keyboard/pointer input; Phaser Game Objects/Containers own player visuals; Phaser AnimationManager/AnimationState owns frame playback; Phaser Loader/Tilemap APIs own Tiled rendering; ScaleManager owns canvas scaling.
- Vue owns the DOM account/chat/panel UI and passes commands/state across a narrow adapter. It does not install gameplay window listeners, run an animation timer or manage parallel canvas entities.
- Realtime remains authoritative for movement and collision. Using Phaser in the client does not move authority into browser physics.
- Room sources are TMX maps with external TSX and PNG during authoring. The build embeds tilesets into JSON for Phaser and generates matching server data. Tile-attached collision objects with class/type `collision` are authoritative; a map point object with class/type `spawn` supplies entry positions.
- Phaser core satisfies the current slice. Rex plugins remain candidates when a concrete subsystem benefits; adoption requires stable compatibility/license evidence and an exact pin.

## 2026-09-08 — Persistent-world roadmap

- Confirmed the digital hotel/mall setting, official Floor 0, automatic Floor 1+ room allocation, no more than 500 registered addresses per floor, and immutable internal room identity separate from public floor/room address.
- Confirmed personal apartments, directory/search/bookmarks/events/featured/occupancy discovery, official store, curated creator marketplace, visible backend-driven system bots and layered moderation as future work.
- API will own persistent room records and address allocation; realtime will own running instances. Room record, room template and running instance remain distinct.
- Economy grants are server-owned and idempotent; creator assets require provenance/license, technical validation and moderation; AI may assist moderation but cannot directly exercise administrative authority.
- Current Milestone 1 adds only the shared room-template/Tiled foundation. No speculative room, apartment, economy, marketplace, bot or moderation schema/service is authorized before working behavior requires it.
- Open: deleted-address reuse, level names/thresholds/earning and hosting values, commerce provider/catalog details and creator terms/payouts.

## 2026-09-08 — Movement failure correction

- Colyseus Schema fields are prototype-backed. Authoritative movement must read `position.x` and `position.y` explicitly; object spread drops them and produced invalid coordinates on the first simulation tick.
- Initial player state is fully assigned before insertion into the replicated map. The browser publishes an already-decoded state immediately when present and subscribes to later changes.
- Regression coverage must assert replicated coordinates, not screenshots that can change from animation alone.

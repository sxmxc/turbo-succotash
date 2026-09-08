# Latest checkpoint — 0.2.3 prepared during Milestone 2

The owner confirmed Panverse Plaza as the product name. Source/UI copy, npm metadata, the Compose project, local OCI image tags, CI export, release defaults, and generated builds now use `Panverse Plaza` / `panverse-plaza`. The rename does not alter HTTP or realtime compatibility, database names, or persisted room identifiers. The orphaned `social-room` Compose containers and network were explicitly removed after the rename; its PostgreSQL volume and cached images were preserved to avoid deleting data or recoverable build artifacts.

The room-source pipeline now supports the owner-created `assets/rooms/templates` hierarchy. Empty template placeholders are tracked and ignored until authored; nested themed maps receive path-namespaced IDs. `floor_0_lobby` remains the unique existing map. Confirmed creation rules are recorded, but floor/account/room instantiation and random lobby-theme selection are not implemented yet.

Tiled XML tilesets under `assets/**/*.tsx` remain excluded from Prettier and are associated with XML in VS Code so they do not produce TypeScript/React diagnostics. Room-build-owned JSON and `rooms.generated.ts` are also excluded so `npm run rooms:build` does not immediately make `npm run format:check` fail on generator serialization.

Milestone 0 is complete. Milestone 1 has its one-room vertical slice implemented, its automated acceptance matrix passes, and the owner-facing external-origin play check is accepted. Release 0.2.0 marks its completion. Milestone 2 is active, beginning with persistent room identity and concurrency-safe address allocation.

Completed Milestone 1 work:

- Identity owns email/password accounts, sessions, administrator registration gating, and atomic hashed single-use beta-key redemption.
- Authenticated users select an LPC shirt color and join one Colyseus lobby. LPC sheets use inspected native 64 × 64 frame metadata; no 16 × 16 character assumption remains.
- Phaser owns tilemap rendering, layered player containers, AnimationManager/AnimationState, keyboard input, pointer world coordinates, and responsive canvas scaling. Vue owns DOM account/chat/panel UI and forwards realtime state and commands.
- `npm run rooms:build` exports the source TMX/TSX/PNG lobby into Phaser-ready Tiled JSON and shared server room data. Tile-attached collision objects whose class/type is `collision` produce authoritative obstacles.
- Realtime owns movement, environment collision, non-colliding player presence, live-only room chat, and speech-bubble events.
- The movement defect was fixed: `moveWithCollision` now copies `x` and `y` explicitly from Colyseus schema instances. Object spread omitted prototype-backed schema fields, turning the first simulation tick into invalid coordinates. A unit regression and browser assertions cover this.
- The browser uses Colyseus 0.18 `Callbacks.get(room)` collection and nested-schema callbacks for player add/remove/change events. A separate Phaser lifecycle defect was also fixed: the room view retains its active scene so players added after scene creation can instantiate game objects. The two-session browser regression now requires both clients to report two replicated players and render two Phaser entities before and after the first client reloads and rejoins.
- Root agent instructions now require the installed version-matched Colyseus skill/docs, preserve Colyseus ownership of networking and replication, and prohibit parallel Vue/Phaser websocket, decoder, lifecycle, replication or authoritative-simulation implementations.
- Client chat request IDs use a secure `getRandomValues` fallback where `crypto.randomUUID` is unavailable.
- Phaser no longer globally captures WASD, arrows or Space after registering movement keys. Focused Vue inputs receive those characters while the existing focus guard continues to suppress avatar movement; browser acceptance types and verifies `wasd with spaces` in chat.

Current/remaining work:

- CI now recreates only identity between smoke/dependency checks and browser acceptance because those stages intentionally exceed the per-IP signup limit when combined; the full post-reset browser matrix passes.
- The tagged `v0.2.1` verification succeeded and exported tested images, but GHCR publication stopped on an `unknown blob` push after some tags may have landed. The publisher now checks version and commit tags independently, resumes only exact remote-config/local-image-ID matches, rejects mismatches, retries pushes with bounded backoff, and records registry digest references without rebuilding.
- Rerunning the existing tag still uses its old commit. Version `0.2.2` contained the publisher fix and version `0.2.3` includes the current milestone work; never move an existing tag or overwrite mismatched GHCR tags. No tag or publication was performed in this checkpoint.
- Implement Milestone 2 persistent room records and concurrency-safe Floor 1+ address allocation as the first working boundary.
- Review the remaining draggable-panel UX separately; it is not being redesigned inside this movement/Tiled correction.

Product decisions recorded for later milestones include immutable room IDs with separate floor/room addresses, concurrency-safe Floor 1+ allocation, official Floor 0 destinations, personal apartments, discovery, the official store, curated creator marketplace, visible system bots and layered moderation. No speculative schema or empty service was added for them.

See [verification](../docs/VERIFICATION.md) for command results and [active tasks](tasks.md) for acceptance status. The source version is 0.2.3. Tag `v0.2.1` is immutable and its publication is incomplete; neither `v0.2.2` nor `v0.2.3` has been tagged or published, and no remote deployment is claimed. Milestone 2 remains active because persistent rooms, allocation, navigation/private entry, friends/presence, whispers and saved appearance are still open in the working design.

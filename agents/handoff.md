# Latest checkpoint — Milestone 1 complete, Milestone 2 started

Milestone 0 is complete. Milestone 1 has its one-room vertical slice implemented, its automated acceptance matrix passes, and the owner-facing external-origin play check is accepted. Release 0.2.0 marks its completion. Milestone 2 is active, beginning with persistent room identity and concurrency-safe address allocation.

Completed Milestone 1 work:

- Identity owns email/password accounts, sessions, administrator registration gating, and atomic hashed single-use beta-key redemption.
- Authenticated users select an LPC shirt color and join one Colyseus lobby. LPC sheets use inspected native 64 × 64 frame metadata; no 16 × 16 character assumption remains.
- Phaser owns tilemap rendering, layered player containers, AnimationManager/AnimationState, keyboard input, pointer world coordinates, and responsive canvas scaling. Vue owns DOM account/chat/panel UI and forwards realtime state and commands.
- `npm run rooms:build` exports the source TMX/TSX/PNG lobby into Phaser-ready Tiled JSON and shared server room data. Tile-attached collision objects whose class/type is `collision` produce authoritative obstacles.
- Realtime owns movement, environment collision, non-colliding player presence, live-only room chat, and speech-bubble events.
- The movement defect was fixed: `moveWithCollision` now copies `x` and `y` explicitly from Colyseus schema instances. Object spread omitted prototype-backed schema fields, turning the first simulation tick into invalid coordinates. A unit regression and browser assertions cover this.
- The browser publishes the already-decoded initial Colyseus state as well as subsequent state changes, avoiding an initial subscription timing gap.
- Client chat request IDs use a secure `getRandomValues` fallback where `crypto.randomUUID` is unavailable.

Current/remaining work:

- CI now recreates only identity between smoke/dependency checks and browser acceptance because those stages intentionally exceed the per-IP signup limit when combined; the full post-reset browser matrix passes.
- The tagged `v0.2.1` verification succeeded and exported tested images, but GHCR publication stopped on an `unknown blob` push after some tags may have landed. The publisher now checks version and commit tags independently, resumes only exact remote-config/local-image-ID matches, rejects mismatches, retries pushes with bounded backoff, and records registry digest references without rebuilding.
- Rerunning the existing tag still uses its old commit. Version `0.2.2` contains this fix; never move `v0.2.1` or overwrite mismatched GHCR tags. No tag or publication was performed in this checkpoint.
- Implement Milestone 2 persistent room records and concurrency-safe Floor 1+ address allocation as the first working boundary.
- Review the remaining draggable-panel UX separately; it is not being redesigned inside this movement/Tiled correction.

Product decisions recorded for later milestones include immutable room IDs with separate floor/room addresses, concurrency-safe Floor 1+ allocation, official Floor 0 destinations, personal apartments, discovery, the official store, curated creator marketplace, visible system bots and layered moderation. No speculative schema or empty service was added for them.

See [verification](../docs/VERIFICATION.md) for command results and [active tasks](tasks.md) for acceptance status. The source version is 0.2.2. Tag `v0.2.1` is immutable and its publication is incomplete; `v0.2.2` has not been tagged or published, and no remote deployment is claimed.

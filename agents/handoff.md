# Latest checkpoint — Milestone 1 in progress

Milestone 0 is complete. Milestone 1 now has its one-room vertical slice implemented in the working tree, but remains the active milestone until the final verification and owner-facing play check are accepted.

Completed Milestone 1 work:

- Identity owns email/password accounts, sessions, administrator registration gating, and atomic hashed single-use beta-key redemption.
- Authenticated users select an LPC shirt color and join one Colyseus lobby. LPC sheets use inspected native 64 × 64 frame metadata; no 16 × 16 character assumption remains.
- Phaser owns tilemap rendering, layered player containers, AnimationManager/AnimationState, keyboard input, pointer world coordinates, and responsive canvas scaling. Vue owns DOM account/chat/panel UI and forwards realtime state and commands.
- `npm run rooms:build` exports the source TMX/TSX/PNG lobby into Phaser-ready Tiled JSON and shared server room data. Tile-attached collision objects whose class/type is `collision` produce authoritative obstacles.
- Realtime owns movement, environment collision, non-colliding player presence, live-only room chat, and speech-bubble events.
- The movement defect was fixed: `moveWithCollision` now copies `x` and `y` explicitly from Colyseus schema instances. Object spread omitted prototype-backed schema fields, turning the first simulation tick into invalid coordinates. A unit regression and browser assertions cover this.
- The browser publishes the already-decoded initial Colyseus state as well as subsequent state changes, avoiding an initial subscription timing gap.
- Client chat request IDs use a secure `getRandomValues` fallback where `crypto.randomUUID` is unavailable.

Current/remaining Milestone 1 work:

- Run the complete check, smoke, database and desktop/mobile browser matrix against the final formatted tree.
- Confirm the external-origin login/play path manually after the final deployment refresh.
- Review the remaining draggable-panel UX separately; it is not being redesigned inside this movement/Tiled correction.

Product decisions recorded for later milestones include immutable room IDs with separate floor/room addresses, concurrency-safe Floor 1+ allocation, official Floor 0 destinations, personal apartments, discovery, the official store, curated creator marketplace, visible system bots and layered moderation. No speculative schema or empty service was added for them.

See [verification](../docs/VERIFICATION.md) for command results and [active tasks](tasks.md) for acceptance status. No release, tag, publication or protocol-version change is claimed.

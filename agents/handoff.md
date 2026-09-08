# Latest checkpoint — 0.2.4 prepared during Milestone 2

Release 0.2.4 replaces the hand-built lobby chat log/form with the owner-selected Advanced Chat v3 RC composition. `@advanced-chat/components` is exactly pinned at 3.0.0-rc.3 as an explicit exception to the normal stable-only policy: v3 is a rewrite, the maintained documentation targets it, and adopting it now avoids a later v2 migration. Compatibility/license evidence is recorded in `docs/DEPENDENCIES.md`.

`RoomChat.vue` wraps Advanced Chat's `Layout` and standalone `Chat` inside Panverse Plaza's existing draggable/docked panel. It projects current users and the bounded accepted `ChatEvent` list into library models and sends composer text through the existing `RoomConnection.sendChat` adapter. Colyseus still exclusively owns room connection lifecycle, membership, message transport, server IDs/timestamps and live-only delivery. Speech bubbles still use the same accepted events. Files, markdown, linkification, reactions, replies, edits, selection and history pagination are disabled because the protocol does not support them.

The panel is wider and themed to the existing cream/green game chrome. The v3 plugin supplies the existing `Say hello…` accessible placeholder. Desktop and mobile browser selectors now submit through Advanced Chat's textarea with Enter; focused WASD/Space remains input text and does not move the avatar.

Verification completed:

- `npm run check` passed formatting, lint, TypeScript/Vue types, 14 tests and production build.
- All five 0.2.4 Compose images built; migration and service health passed. Smoke, dependency failure/recovery and `release:check -- v0.2.4` passed.
- The isolated two-session desktop browser acceptance passed end to end against the rebuilt stack.
- A later full browser run had concurrent manual room activity: the owner confirmed they were testing, explaining the third occupant. Six cases and two intentional mobile skips passed; an LPC screenshot timing check and the subsequent exact occupancy assertion were affected. Tests were not weakened. See `docs/VERIFICATION.md` for exact results.

No HTTP, realtime protocol, database or migration contract changed; coordinated protocol 2 compatibility remains. Source version is 0.2.4. No tag, publication or remote deployment was performed. Tags v0.2.2, v0.2.3 and v0.2.4 still require separate explicit approval; never move v0.2.1 or overwrite mismatched GHCR tags.

Milestone 2 remains active. Next product work is persistent room records and concurrency-safe Floor 1+ address allocation, followed by authenticated creation/navigation/private entry, friends/presence, online whispers, saved appearance and the undecided social provider.

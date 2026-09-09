# Latest checkpoint — Milestone 2 gameplay-shell presentation

The room view now uses a stable 720 × 480 Phaser logical viewport rather than using each Tiled map's dimensions as the canvas size. Tiled dimensions remain camera bounds; the main camera follows the replicated local player with a deadzone, so small rooms remain comfortably framed and larger rooms scroll. This is a web-only presentation change: no HTTP or realtime schema/protocol behavior changed, and server-authoritative movement is unchanged.

The web shell now makes the game stage primary, with compact room/status controls and Phaser fullscreen. Chat is a collapsible dark game-overlay panel. Its outer window no longer clips its content and the Advanced Chat card/root permit the upward-opening emoji picker; its own message history remains scrollable. Mobile keeps the panel docked in normal document flow.

Follow-up presentation refinement: a `ResizeObserver` now supplies Phaser's ScaleManager with the settled stage dimensions, so FIT fills the CSS 3:2 stage instead of leaving a native-resolution canvas in a large frame. Chat now presents one visible Advanced Chat card; its draggable grip and Hide/Open control are a narrow rail above the card, and the emoji picker has a smaller surface above all chat chrome. The elevator dialog uses a bounded, independently scrolling room list.

For Milestone 2's remaining work, add saved appearance through the existing avatar setup/control surface, and project the existing Colyseus player adapter into a People panel before adding friends/presence and cross-room whisper actions. Keep friendship/presence state API-owned and cross-room delivery in realtime; neither feature should add a second browser connection or store.

# Previous checkpoint — 0.2.5 Milestone 2 room navigation

Version 0.2.5 implements the agreed persistent room/navigation slice. The application schema now stores immutable room IDs and unique `F###-R###` addresses. Floor 0's official lobby is F000-R000; concurrency-safe creation reserves R000 on every Floor 1+ for its system lobby and allocates user rooms from R001 through R500. API owns authenticated listing, resolution, creation and private-password admission.

Realtime now admits through API and creates address-partitioned Colyseus rooms using the admitted generated template, capacity and named spawn. `room` is the current join route. The protocol-2 `lobby` route remains a backwards-compatible Floor 0 alias for coordinated 0.2.x clients. Empty running rooms dispose normally.

The reusable interaction boundary reads Tiled rectangle classes. Elevators use `display_label` and open the Vue directory/address/create dialog. Doors use `display_label`, `destination` and `destination_spawn` and resolve through API before joining. Named spawn point objects are validated and exported. Floor-lobby and small-room templates navigate back and forth through their elevators.

Application migrations 002 through 004 are required. Migration 004 safely moves databases created during development from lobby R001/user R002+ numbering to lobby R000/user R001+. No dependencies changed. `npm run rooms:build` remains unavailable in this workstation's Tiled/Xvfb Qt environment; the owner previously exported the current maps and committed generated data was aligned with the stricter metadata output. See `docs/VERIFICATION.md` for final command results.

Milestone 2 remains active only for friends/presence, cross-room whispers, saved appearance and the undecided social provider. No tag, publication or remote deployment was performed; `v0.2.5` requires separate explicit approval.

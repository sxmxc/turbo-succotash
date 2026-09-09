# Latest checkpoint — 0.2.5 Milestone 2 room navigation

Version 0.2.5 implements the agreed persistent room/navigation slice. The application schema now stores immutable room IDs and unique `F###-R###` addresses. Floor 0's official lobby is F000-R000; concurrency-safe creation reserves R000 on every Floor 1+ for its system lobby and allocates user rooms from R001 through R500. API owns authenticated listing, resolution, creation and private-password admission.

Realtime now admits through API and creates address-partitioned Colyseus rooms using the admitted generated template, capacity and named spawn. `room` is the current join route. The protocol-2 `lobby` route remains a backwards-compatible Floor 0 alias for coordinated 0.2.x clients. Empty running rooms dispose normally.

The reusable interaction boundary reads Tiled rectangle classes. Elevators use `display_label` and open the Vue directory/address/create dialog. Doors use `display_label`, `destination` and `destination_spawn` and resolve through API before joining. Named spawn point objects are validated and exported. Floor-lobby and small-room templates navigate back and forth through their elevators.

Application migrations 002 through 004 are required. Migration 004 safely moves databases created during development from lobby R001/user R002+ numbering to lobby R000/user R001+. No dependencies changed. `npm run rooms:build` remains unavailable in this workstation's Tiled/Xvfb Qt environment; the owner previously exported the current maps and committed generated data was aligned with the stricter metadata output. See `docs/VERIFICATION.md` for final command results.

Milestone 2 remains active only for friends/presence, cross-room whispers, saved appearance and the undecided social provider. No tag, publication or remote deployment was performed; `v0.2.5` requires separate explicit approval.

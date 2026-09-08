# Latest checkpoint — Milestone 1 complete

Milestone 0 was reverified, and Milestone 1 is implemented in the current uncommitted working tree. Identity owns atomic password-account creation, hashed single-use beta keys, the administrator-controlled registration gate, sessions and login. Migration `identity/002` is required. Signup is gated by default; gate-off signup and existing login are covered.

Authenticated users choose an LPC shirt color and enter one Colyseus lobby. The server owns movement and environment collision; players do not collide with one another. The Vue/Phaser client supports WASD/arrows and click/tap, suppresses movement while typing, renders all live players, and provides live-only room chat logs and speech bubbles. Realtime protocol is 2; this tree is not compatible with 0.1.x realtime clients/services.

Final verification on 2026-09-08: formatting, lint, TypeScript/Vue type-check, seven unit tests and production build passed; all five images built and Compose became healthy; smoke passed; database integration including concurrent beta redemption passed; browser suite passed 8 tests with 2 intentional mobile skips. The two-session desktop case proves shared movement/chat, typing suppression and no chat history for a late joiner. The stack remains at **http://localhost:8080**.

No release/tag/publication is claimed. Root version remains 0.1.0 pending planned 0.2.0 release preparation. Full avatar customization, persistence, moderation and later gameplay remain out of scope. Preserve the current user-authored LPC/design edits when continuing.

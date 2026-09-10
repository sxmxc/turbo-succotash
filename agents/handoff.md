# Latest checkpoint — Milestone 2 complete

Milestone 2 is implemented and focused acceptance is green. API owns saved appearance, friendships, expiring presence, personal-apartment allocation and persistent direct-message history. Realtime uses the existing authenticated Colyseus connection for room chat, online/offline DMs, typing, reactions and read events; it persists DMs/read state/reactions through internal authenticated API routes. Room chat remains live-only, while DMs survive logout and offline recipients.

The Advanced Chat surface includes its conversation list/collapse control, mentions, emoji, linkification, reactions, message preview, typing text, `unreadCount`, and DM-only sent/delivered/read receipts. Friends are exposed through the visible “Friends & people” control with Add, Accept and Message actions. Incoming reaction menus open into the message pane so the chat list does not cover them.

Presence is written offline on graceful final-session leave and guarded by a 15-second realtime heartbeat plus a 40-second API freshness window for crash tolerance. `player_appartment` lazily resolves to one hidden owner-only room created from the authored apartment template. Phaser ScaleManager fullscreen targets the combined Vue/Phaser play layout.

The locally supplied `apps/web/public/assets/fonts/BoldPixels.ttf` is applied to headings and the top-bar product name. OAuth/SSO provider integration remains explicitly deferred and is a future task; Better Auth already owns generic provider linkage fields.

Verification evidence is in `docs/VERIFICATION.md`: repository checks and build passed, migration 007 database integration passed, Compose is healthy, and focused two-session browser acceptance passed online and offline DM/history behavior. Application migrations 005–007 are required. HTTP routes and realtime message types are additive under protocol 2. No release tag, publication or remote deployment was performed.

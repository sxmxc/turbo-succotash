# Panverse Plaza — Working Design — revision 6

Status: buildable draft. Product name confirmed.
Prepared: 2026-09-08.

## Decision policy

Document revisions are separate from software release versions.

Only owner-confirmed decisions are fixed product requirements. Technical sections and milestone ordering below are working recommendations unless explicitly marked confirmed. Recommendations can evolve with implementation evidence; they are not additional restrictions or approval gates. Unspecified features are undecided, not prohibited.

Confirmed means explicitly supplied by the owner. Proposed means a technical or product recommendation, not an approved requirement. Open means deliberately unresolved. Begin with the first playable milestone; do not require every later decision to be finalized.

Use current stable dependencies only. At bootstrap, verify official release channels, peer dependencies and runtime requirements; record exact resolved versions and commit a lockfile. Never silently substitute a prerelease or an outdated template.

## Product

A browser-based social chat game where people enter shared 2D rooms, move pixel-art characters, and chat through a floating chat window and avatar speech bubbles. Hanging out and chatting is the first goal. Desktop and mobile are required.

The confirmed longer-term setting is a digital hotel/mall multiverse: floors organize persistent destinations and apartments while rooms remain the unit of realtime play.

Confirmed:
- Floating draggable windows.
- Universal LPC spritesheets are the initial character asset source, superseding the original 16 × 16 character requirement and placeholder character-art direction. Preserve selected sprites’ native frame dimensions and inspect each animation layout.
- Keyboard and click/tap movement; environment collisions, no character-to-character collisions.
- Accounts required; no guests.
- Email/password and social login. Social providers remain open.
- Friends, presence, blocking, reports and moderator tools.
- Public and password-protected private rooms.
- System-created and user-created rooms, using predefined layouts in release one.
- Small, medium and large capacity classes. Default user-created rooms are small. Level requirements unlock larger room creation. System rooms such as Lobby and Cafe are large.
- Leveling system required; capacity values, level thresholds and earning rules are open.
- Self-hosted, modular and containerized. Local development first, Docker testing next, Kubernetes later.
- Semantic Versioning for software releases. CI/CD established during bootstrap and maintained throughout development.
- Persistent rooms have an immutable internal room ID. Their public floor/room address is a separate mutable field, displayed in a form such as `F003-R287`.
- A floor holds at most 500 registered room addresses. User rooms begin on Floor 1 and are allocated automatically; Floor 0 is reserved for official destinations.
- Every account has a personal apartment. Apartment customization and in-world access to account settings are later features; essential settings must remain reachable outside the game world.
- Later discovery includes directory/search, bookmarks, events, featured rooms, occupancy, and friend presence without revealing protected-room access.
- Later commerce includes an official store and a curated creator marketplace.
- System bots are visibly identified, backend-driven actors with reserved, non-impersonable identities. They are not fake users or hidden browser connections.

Confirmed: use orthographic projection for the 2D room, consistent with the original top-down direction. Render without perspective foreshortening. Keep movement and environment collision coordinates consistent with the room view.

## Working release scope

The current Milestone 1 vertical slice is deliberately one room: account authentication, atomic beta gating, basic avatar choice, movement, environment collision, realtime presence, room chat and speech bubbles.

Proposed later release coverage: room navigation and creation, private entry, whispers, friends/presence, blocks/reports, administration, level-based room permissions, Floor 0 destinations, apartments, discovery, the store, creator marketplace and visible system bots. Room decorating, custom layouts, minigames, commerce operations and user asset submission are future milestone work, not Milestone 1 foundations.

Proposed initial avatar editor: choose a supplied body appearance, hair and clothing colors. All initial choices are available without purchases. This is a starting recommendation because customization details remain open; economy and upload behavior remain undecided.

## Character art

Confirmed: use [Universal LPC spritesheets](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/tree/master/spritesheets). Begin with a small compatible body, hair and clothing selection; standing poses and four-direction walking must keep layers aligned and animation synchronized. Keep appearance selections data-driven for the planned editor; full customization is deferred. Separate source frame dimensions, display scale and collision footprint; render crisp pixels and anchor characters at their feet. Serve selected assets locally and record the upstream commit, imported paths, animation metadata, licenses and accessible credits. Orthographic projection remains confirmed.

Initial implementation: five modular layers (including the required separate head), native 64 × 64 frames in individual 576 × 256 walk sheets. See [asset integration](LPC_ASSETS.md). These inspected dimensions describe this selection only, not the entire upstream catalog.

## Registration and authentication

Confirmed: registration can require a valid, single-use beta key. Only the administrator can generate keys. The gate can be disabled, allowing registration without keys. Existing users can log in regardless of gate state.

Proposed implementation:
- Use a maintained authentication library for passwords, sessions, account recovery and OAuth.
- Treat beta-key consumption and account creation as one atomic operation in the identity service.
- Enforce the gate for both password signup and first-time social signup. An OAuth callback must not create an ungated account.
- Existing linked social accounts continue to log in without keys.
- Store key hashes, issue/revoke timestamps and redemption identity; show raw keys only when issued.
- Rate-limit registration, login and key guessing. Never put raw keys, room passwords or sessions in logs.
- Provide administrator key generation/revocation and registration-gate controls.
- Social login provider selection and email verification policy are open; password login can be built first.

Identity establishes who a user is. Each owning service still enforces its own permissions. A valid session alone does not authorize room entry, moderation or level changes.

## Screens and navigation

Proposed screen inventory:

| Screen | Purpose |
| --- | --- |
| Welcome/login | Password login, enabled social providers, registration and recovery links |
| Registration | Credentials, conditional beta-key input, actionable errors |
| Recovery | Request reset and set a new password |
| First-time setup | Display name and initial avatar |
| Room navigator | Public system/user rooms, occupancy, available capacity, join |
| Private-room entry | Enter a shared room link/code and password; never list private rooms publicly |
| Create room | Name, predefined layout, capacity class, public/private and password |
| Room view | Game canvas, chat, navigation, friends and settings controls |
| Avatar window | Preview and save supplied appearance choices |
| Friends window | Requests, friends, presence and whisper action |
| Settings | Account options, sound/display controls and logout |
| Reporting | Select user/message and submit a report |
| Administration | Beta keys, gate switch, reports and moderation |
| Connection overlay | Connecting, reconnecting, failure and retry |

Private-room links/codes are proposed discovery mechanics, since hidden rooms still need an entry route.

On desktop, keep floating windows draggable and constrained within the viewport. Proposed mobile adaptation: dock or expand the same panels so dragging does not make controls unreachable. Keep chat input usable above the software keyboard. UI focus suspends movement shortcuts.

## Rooms and movement

Confirmed starter-template rules:

- `floor_0_lobby` remains a unique authored official destination and is not used as a reusable starter template.
- A newly created floor starts from a lobby template.
- A newly created account receives an apartment created from the apartment template.
- A user-created room starts from the applicable small, medium or large room template.
- Multiple themed lobby templates are planned; when they exist, floor creation chooses a starter theme randomly. Selection remains server-owned so clients cannot substitute an unauthorized layout.

Persist an immutable internal room ID independently from the public floor/room address. Persist owner, template, capacity class and privacy settings with the room record. A room record, a reusable room template and a temporary running room instance are distinct concepts.

Confirmed floor/address rules:

- Floor 0 contains official destinations only: lobby, directory, elevator, cafe, store, help, events and an apartment entry point.
- User rooms begin on Floor 1. The service allocates the next available address automatically and safely under concurrent creation.
- A floor exposes at most 500 registered room slots; this is not the same as concurrent player capacity.
- Private-room authorization still applies when an address or internal ID is known.
- Whether a deleted room address can be reused remains open.

The Milestone 1 lobby uses a stable room template identifier shared by Phaser and realtime. Persistent room records and public address allocation are introduced only when a milestone needs working multi-room behavior; do not pre-create speculative schemas.

Server checks on creation: authenticated user, selected template validity, permitted capacity class and configured ownership limit. Numbers stay configuration-driven.

Server checks on every join: identity, bans, capacity and private-room authorization. Hidden listing status is not access control. Password verification occurs server-side using a password hash. Return a short-lived, room-scoped admission grant if services are separate.

Proposed Colyseus arrangement: each active room has one authoritative owner process; a process may host multiple rooms. Accept movement intents rather than trusting client coordinates. Enforce walkable areas, speed and boundaries on the server; interpolate movement in the browser. Proposed click-to-walk pathfinding uses the same walkability data as keyboard movement.

Keep layout dimensions separate from player capacity. “Large” capacity does not necessarily dictate visual floor area.

Do not write every position update to PostgreSQL. Disconnects remove room membership after a configurable grace period. Reconnects receive current room state without missing-message replay.

## Chat and whispers

Confirmed:
- Normal chat reaches everyone currently in the room.
- One accepted message appears in chat and as a temporary avatar bubble.
- Whispers work between online users, including across rooms.
- Only sender and recipient see whisper contents. Other observers see a generic whisper indication.
- No offline delivery.
- Users see only messages they were present to receive. No historical backfill.

Proposed protocol:
- Commands include a client request ID; accepted events include server message ID, sender ID, timestamp, channel and text.
- Validate lengths, rate limits, room membership, mute state and recipient/block rules.
- Treat text as plain text; never render arbitrary user HTML.
- Deliver whisper text only to the two participants. Broadcast a separate generic event in the sender's room, without recipient identity or private text.
- Route cross-room whispers through a user connection directory.
- If the recipient is offline or delivery cannot occur, report failure rather than queue for later.
- Keep delivered messages in bounded client memory. Proposed behavior: clear on logout/reload and do not recover messages missed during a disconnect.
- Prevent duplicate display when a send is retried.

User-visible historical backfill is excluded by the confirmed chat requirement. Server retention is a separate open decision. Proposed starting point: transient chat delivery and reports containing submitted evidence and relevant IDs, with retention and access rules documented when implemented.

## Friends, presence and moderation

Confirmed features: friends, presence indicators, blocks, reports and moderator tools.

Proposed minimal behavior:
- Friend requests require acceptance; either user can remove a friendship.
- Presence shows online/offline initially. Private-room locations are not exposed through presence.
- Blocking suppresses the blocked person's messages/bubbles and rejects whispers and friend requests. Avatar hiding is open.
- Global moderators can mute, kick and ban under server-enforced permissions.
- Administrator manages moderator roles and beta access.
- Room-owner moderation privileges remain open.
- Keep audit records for administrative actions.
- Reports enter an administrator review queue.

Future moderation is layered: deterministic server rules enforce permissions and safety invariants; AI may assist classification or prioritization; human moderators retain review, override and appeal responsibility. AI does not receive direct administrative authority. A room assistant is separate from platform moderation and cannot disable it.

System bots use reserved backend identities and are always visibly marked as automated. Their actions pass through the same server authorization and audit boundaries as other system actions.

Audience/age policy remains open for public launch. It does not prevent local development.

## Levels and permissions

Confirmed: user levels gate medium/large room creation.

Proposed implementation:
- Server owns XP and level; clients cannot assign them.
- Define level thresholds and room permissions in data/configuration.
- Implement permission checks and an administrator test override before choosing earning rules.
- Keep XP awards idempotent and attributable to an event.
- Do not award XP solely for raw message count because it encourages spam.
- Public leveling rules and anti-idle behavior remain open; initial permission testing can use seeded levels.

Level names, thresholds, earning rules and hosting values remain open. The server remains authoritative for all of them.

## Future economy and creator marketplace

Confirmed direction, deferred until a milestone requires working behavior:

- The official store sells server-owned products and grants inventory/entitlements through idempotent orders and payment transactions. Equipped state and refunds must reconcile with entitlements.
- A curated creator marketplace may accept assets only with explicit license/provenance, technical-format validation, moderation and payout rules.
- Client receipts or callbacks never grant inventory directly.

Do not add empty economy, marketplace or payout services and do not speculate their database schemas during Milestone 1.

## Recommended stack and service boundaries

The following is a proposal, not a claim that the owner approved every dependency.

| Component | Proposed technology | Ownership |
| --- | --- | --- |
| Web client | Vue, TypeScript, Vite, Phaser | HTML menus/chat and 2D rendering |
| Identity service | Fastify with Better Auth | Accounts, sessions, OAuth, beta keys |
| Application API | Fastify with PostgreSQL access | Profiles, room metadata, friends, blocks, levels, reports |
| Realtime service | Colyseus on Node.js | Live rooms, movement, message delivery and connection presence |
| Database | PostgreSQL | Durable identity/application records |
| Shared transient coordination | Redis when running multiple realtime replicas | User routing, room discovery and ephemeral coordination |

Recommended starting arrangement: these deployable boundaries in one repository, with friends, levels and reports as API modules. Service extraction remains possible as deployment and scaling needs become concrete. This provides independent scaling for live connections while keeping ordinary business transactions manageable.

Proposed data ownership: one PostgreSQL instance initially, separate identity/application schemas and credentials. Identity owns beta-key redemption alongside account creation. Other services must not mutate identity tables. Realtime obtains authoritative permissions through internal APIs and uses bounded caches with revocation/invalidation behavior.

When persistent rooms arrive, API owns room records and public address allocation while realtime owns running instances. Store, marketplace and moderation boundaries should be introduced with their first working milestone rather than as empty services.

Analytics is an anticipated service area; its initial scope is open. Recommended first instrumentation: connected users, active rooms, join failures, message delivery latency and service errors. These explain whether the game works. Product analytics such as return rates can be added when there is a concrete question; chat contents are not analytics payloads.

## Version evidence

At drafting time, official listings show Phaser 4.2.1 and Vue 3.5.42. Recheck at bootstrap; these are observations, not evergreen “latest” pins.

- [Phaser stable release list](https://phaser.io/download/phaser4)
- [Vue official changelog](https://github.com/vuejs/core/blob/main/CHANGELOG.md)
- [Colyseus official documentation](https://docs.colyseus.io/)
- [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify)

Colyseus supplies room-oriented multiplayer infrastructure. Better Auth documents Fastify integration. The proposed combination still requires a bootstrap compatibility check. Exact stable versions of Node.js, Vite, TypeScript, Fastify, Better Auth, Colyseus, PostgreSQL and any Redis dependency have not been verified in this document. Resolve and record them before installation; do not guess numbers.

## Development and deployment

Proposed repository layout:
- apps/web
- services/identity
- services/api
- services/realtime
- packages/contracts — validated request/event definitions
- packages/room-data — shared layout/walkability format
- infra/compose
- docs — product design and technical documentation
- AGENTS.md — repository instructions for AI coding agents
- agents — persistent AI context, task tracking and handoffs

Local development: hot reload for browser and services; database and required infrastructure in Docker Compose. Docker testing: containerize all application services and run the complete flow. Keep configuration in environment variables, secrets outside source control, and migrations reproducible.

Expose HTTP and realtime connections through a common origin where practical. Add health/readiness endpoints, structured logs and graceful shutdown. Later Kubernetes deployment can scale HTTP services independently; realtime room placement and connection routing need explicit handling. Adding replicas increases total room capacity, not automatically the maximum population of a single room.

Kubernetes is the confirmed eventual target. Compose provides the initial deployment target; Kubernetes packaging and analytics infrastructure can be introduced when useful. Neither is prohibited by milestone ordering.

## AI agent instructions and project memory

Confirmed: include a root AGENTS.md and an agents/ directory from bootstrap. Use uppercase AGENTS.md as the conventional instruction filename. These files live in source control with the project.

Recommended initial structure:

| Path | Purpose |
| --- | --- |
| AGENTS.md | Entry point: project purpose, confirmed requirements, repository map, working conventions, verified development/test commands and memory maintenance instructions |
| agents/README.md | Short index explaining which context files to read and when to update them |
| agents/context.md | Concise durable project facts, current architecture and links to authoritative documentation |
| agents/tasks.md | Current milestone, actionable tasks, status, dependencies and acceptance criteria |
| agents/handoff.md | Latest checkpoint: completed work, current work, next action, blockers and verification results |
| agents/decisions.md | Dated implementation decisions with rationale, status and links to superseding decisions |

Keep this structure small initially; split files when their size or ownership makes that useful. The agents/ directory holds project continuity, while docs/ holds the product and technical documentation. Link to requirements rather than copying them into every memory file.

Recommended AGENTS.md working instructions:
- Start by reading AGENTS.md, agents/README.md, the current handoff and active tasks. Read relevant context, decisions and design sections for the task.
- Inspect the actual repository before acting; memory can be stale. Confirm available scripts and dependencies rather than assuming a prior handoff still describes the code.
- Preserve the distinction between confirmed user requirements, proposals and unresolved choices. Memory is context, not a source of new authority or restrictions.
- Follow the project's stable-dependency policy, Semantic Versioning and CI/CD workflow. Document release impact when a change affects a published contract.
- Keep changes scoped to the active task, respect existing user changes, and run meaningful checks for the behavior changed. Record what was actually run and its result; do not mark unverified work as passing.
- Update task status and the handoff after meaningful work or before ending a session. Update durable context or decisions only when those facts change.
- Record concise outcomes, rationale and evidence, not private reasoning transcripts, repetitive activity logs or copied chat histories.
- Keep credentials, beta keys, private messages and personal user data out of agent memory.
- Make handoffs immediately actionable: relevant paths, unresolved issue, next step and commands/results needed to continue.

Bootstrap acceptance: these files exist with accurate initial content, an active bootstrap task and known open decisions. Commands are recorded after verification; unavailable commands are explicitly pending rather than invented. This memory structure is part of the initial repository setup, not an additional service.

## Versioning and CI/CD

Confirmed: follow Semantic Versioning and establish CI/CD from the beginning.

Software versions use MAJOR.MINOR.PATCH. Once the public contract is stable, incompatible contract changes raise MAJOR, compatible features raise MINOR, and compatible fixes raise PATCH. Released versions are immutable. Initial 0.y.z development does not promise a stable API. Alpha/beta identifiers can label this game's own releases while third-party dependencies remain stable-only. Source: [Semantic Versioning specification](https://semver.org/).

Recommended release policy:
- Begin at 0.1.0. During 0.x, use minor bumps for features or breaking changes and patch bumps for compatible fixes; document breaking changes explicitly. This is the project's proposed convention, not a SemVer requirement for 0.x.
- Start with one coordinated product version for the services; record every service image digest in a release manifest. Independently version services if their release cycles later diverge.
- Define the compatibility contract: HTTP APIs, realtime messages and shared packages. Record supported client/server combinations. Database migration revisions remain separate from product versions.
- Keep the product version in one authoritative location, generate release notes, and create matching Git release tags such as v0.1.0. Record commit SHA and version in builds and service diagnostics.
- Pin resolved dependency versions and container inputs for reproducibility. Update to current stable dependencies through tested changes; do not resolve floating latest versions during deployment.

Recommended pipeline, implemented incrementally from bootstrap:

| Trigger | Work | Result |
| --- | --- | --- |
| Pull request / equivalent change | Locked dependency install, formatting/lint, type checks, relevant tests and production builds; build service containers | Reviewable checks and artifacts |
| Main-branch integration | Integration tests with temporary dependencies, migration checks, Compose startup and smoke tests | Tested deployable candidate |
| Versioned release | Validate version/tag/changelog consistency; associate passing checks with exact commit; publish immutable images and release manifest | Traceable release |
| Deployment | Deploy selected image digests, run controlled migrations, wait for readiness and execute smoke checks | Recorded deployment outcome |

Build once and promote the same artifacts between environments. Tag containers with the release version and commit SHA; deployments resolve immutable digests. CI provider, Git host, registry and deployment trigger are implementation choices, not fixed requirements here.

At bootstrap, establish actual checks, Dockerfiles, a Compose smoke test and a reusable deployment entry point. The initial automated deployment target can be an ephemeral Compose environment in CI; remote credentials and Kubernetes are not prerequisites. Extend tests alongside implemented features rather than creating empty checks claiming coverage.

Plan migration and rollback behavior from the first schema change: validate fresh installation and upgrades, run migrations once per deployment, and favor compatible schema expansion before removing fields. Application rollback is safe only while the schema remains compatible; document recovery or forward-fix steps for incompatible changes. Realtime deployment should drain rooms or reconnect clients predictably and reject unsupported protocol combinations clearly.

Keep release credentials scoped to publishing/deployment jobs. Untrusted change checks must not receive deployment secrets or run with access to the self-hosted production network. Record release version, migration state and health outcome for troubleshooting.

## Build sequence and acceptance

### Milestone 0 — Bootstrap
Resolve current stable dependencies and validate a Vue/Phaser integration. Establish repository, root AGENTS.md, agents/ memory and task files, service skeletons, Compose, migrations, contracts, initial semantic version and CI/CD workflow. Deliver a running shell, documented start commands, passing build/check jobs, container smoke tests and a documented release/deployment path. Remote deployment can be connected when a target exists.

### LPC integration — after completed bootstrap, before identity
Adapt the existing preview incrementally using a minimal compatible LPC catalog. Verify standing, four-direction walking, layer alignment, local asset loading and accessible credits against a production build. Preserve completed Milestone 0 work and the identity slice as the next gameplay dependency.

### Milestone 1 — First playable experience
Password registration/login with beta gating, basic avatar choice, one predefined room, both movement controls, collision checks, chat log and speech bubbles.

Acceptance: two authenticated browser sessions join the same room, see movement and exchange messages. Walls block movement; players do not block one another. Typing never moves the avatar. Late joiners see no earlier chat. Reusing a beta key fails; disabling the gate permits signup without a key.

Use the maintained LPC sheets with inspected per-asset frame metadata and native dimensions; no 16 × 16 character assumptions remain. Author the lobby in Tiled and generate the Phaser tilemap plus matching authoritative collision data from the same source. Use provisional capacity/test settings explicitly marked as development values. Prototype visuals must use the confirmed orthographic projection.

### Milestone 2 — Rooms and social features
Introduce persistent room records with immutable internal IDs, separate floor/room addresses and concurrency-safe automatic allocation beginning on Floor 1. Add navigator/directory basics, user-created template rooms, private-room entry, friends/presence, online cross-room whispers and saved avatar configuration. Add selected social provider once chosen.

Acceptance: private rooms never appear in public results; knowing a room ID cannot bypass its password. Whisper contents never arrive at bystander clients. Offline recipients do not receive queued messages.

### Milestone 3 — Controlled alpha features
Build the useful Floor 0 destinations (lobby/directory/elevator/help first), personal apartment creation and navigation foundations, bookmarks/events/featured discovery, blocks, reports, layered moderation, administrator controls, visibly identified system bots and level-based room permissions. Implement agreed XP rules when chosen.

Acceptance: unauthorized moderation and capacity upgrades fail server-side. Blocks prevent whispers. OAuth account creation cannot bypass beta gating. Reports are reviewable and moderation actions are audited.

### Milestone 4 — Expanded deployment and capacity validation
Add apartment customization and the official store with server-authoritative entitlements and idempotent transactions. Extend Docker and CI/CD with representative mobile checks, reconnect behavior and measured capacity testing. Introduce shared coordination before testing multiple realtime replicas.

Acceptance: no duplicate membership after reconnect, no chat replay, clean failure when a room is full, and cross-room whispers route correctly across replicas.

### Milestone 5 — Curated creator marketplace

Introduce creator submission, provenance/license and technical validation, moderation, catalog publishing, purchases and payout accounting. Expand Floor 0 store/events experiences as working product behavior requires.

Acceptance: unreviewed assets cannot publish; purchases grant exactly one reconciled entitlement; refunds and moderation withdrawal produce auditable outcomes.

## Meaningful verification

Prioritize integration checks for simultaneous redemption of one beta key, first-time OAuth gating, private-room authorization, whisper non-disclosure, server-side movement, block enforcement and capacity races. Browser checks should exercise typing focus, draggable windows, touch movement and the mobile keyboard.

Do not claim room capacity or scalability from framework choice alone; measure it.

## Open decisions that do not block the first build

OAuth providers; verification policy; avatar catalog details; concurrent player capacity values; level names/thresholds/XP rules; ownership limits; deleted-address reuse; room-owner powers; audience policy; report retention; store catalog/payment provider; creator terms/payouts; optional product analytics.

Keep these listed as open. Ask only when a decision is needed for the milestone being implemented.

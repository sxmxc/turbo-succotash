# Durable context

Panverse Plaza is a self-hosted browser social game. [Design revision 6](../docs/PANVERSE_PLAZA_DESIGN.md) is the product authority. Software is 0.2.3 independently of document revisions. Milestones 0 and 1 are complete; Milestone 2 is active.

One npm workspace repository with Vue/Phaser web, identity, API, realtime and migration images. Vue owns DOM UI; Phaser owns game rendering/input/animation/scale through `mountRoom`; realtime owns authoritative live state and collision. Identity owns Better Auth password accounts, sessions and atomic beta gating. PostgreSQL uses separate identity/application roles and schemas.

The current playable slice is one authenticated Colyseus lobby: LPC avatar layers, Tiled map, keyboard/click movement, environment collision, presence, live-only room chat and speech bubbles. `scripts/tiled-rooms.mjs` turns source TMX/TSX/PNG into Phaser assets and generated shared room data. The unique source lobby layout ID is `floor_0_lobby`. Collision comes primarily from tile-attached Tiled objectgroups with class/type `collision`; spawn remains a map point object.

`floor_0_lobby` is unique. Reusable authored starters live under `assets/rooms/templates`: `appartment_template`, `lobby_template`, and small/medium/large room templates. New floors use a lobby starter, new accounts receive a template-based apartment, and user rooms use their size-class template. Empty template directories are valid before their TMX files exist; nested theme paths become namespaced template IDs. Future floor creation randomly selects from available themed lobby starters on the server.

Phaser core currently covers the needed scene lifecycle, Loader/Tilemap APIs, keyboard/pointer input, Containers, animations and ScaleManager. The Rex catalog was reviewed as an extension source, but no plugin is justified for this slice; adopted plugins must solve a concrete missing capability, be license-compatible, pinned and documented.

Future confirmed architecture: persistent rooms use immutable internal IDs separate from public floor/room addresses; API owns room records/allocation and realtime owns running instances. Floor 0 is official, user rooms auto-allocate from Floor 1, and a floor has at most 500 registered addresses. Apartments, discovery, store/economy, curated creator marketplace, visible backend system bots and layered moderation are roadmap items, not present schemas/services.

Git remote is GitHub `sxmxc/turbo-succotash`. Compose is the working deployment target; Kubernetes and remote deployment are later integration work. See [setup](../README.md), [Tiled pipeline](../docs/TILED_ROOMS.md), [Phaser approach](../docs/PHASER.md), [decisions](decisions.md) and [verification](../docs/VERIFICATION.md).

Open decisions include OAuth providers, verification policy, broader avatar catalog, concurrent capacity values, level names/thresholds/earning and hosting values, ownership limits, deleted-address reuse, room-owner powers, audience policy, retention, store/payment details, creator terms/payouts and optional analytics.

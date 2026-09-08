# Durable context

Self-hosted browser social game; product name undecided. [Design revision 5](../docs/SOCIAL_ROOM_DESIGN.md) is the working specification. Software starts at 0.1.0, independently of document revisions.

One npm workspace repository; four deployable services plus a migration image. Vue UI communicates with Phaser via `mountRoom`; no game objects in application state. PostgreSQL has separate identity/application roles and schemas, DDL performed by controlled migrations. Colyseus has no joinable rooms yet. Better Auth is configured, with only session inspection exposed. The shell is a clearly labeled local visual prototype. LPC character art replaces the original 16×16 placeholder; its small data-driven catalog and native-frame metadata are documented in docs/LPC_ASSETS.md.

Git remote is GitHub `sxmxc/turbo-succotash`; GitHub Actions is selected accordingly. Compose is the working deployment target; Kubernetes and remote deployment are later integration work. Shared room-data package is deferred until a walkability contract is implemented in Milestone 1.

Open: product name, OAuth providers, verification policy, avatar catalog, capacity/ownership limits, leveling/XP, room-owner powers, audience policy, report retention, optional analytics. None blocks bootstrap. See [architecture/setup](../README.md) and [releases](../docs/RELEASES.md).

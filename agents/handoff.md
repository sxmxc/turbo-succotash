# Latest checkpoint — Milestone 0 complete

Usable bootstrap is committed. Initial implementation/lockfile: `bf57804`; final application/container source: `7440d89`. The following documentation checkpoint records outcomes without changing the tested application. Full Compose deployment remains running at **http://localhost:8080**. Host dev/temporary preview servers were stopped. Local secrets remain only in ignored `.env`.

Verified: pinned-runtime `npm ci`; `npm run check` (format, lint, both type checks, four tests, production build); fresh DB setup/migrations; hot-reload startup and smoke; all five container targets; Compose startup/smoke; transactional migration/upgrade/isolation tests; real dependency outage/recovery; two desktop/mobile browser tests including short-window containment; release-tag validation; manifest generation and immutable deployment with migration/readiness/post-deploy smoke. See [exact evidence and limitations](../docs/VERIFICATION.md).

`artifacts/release.json` identifies the tested 0.1.0 images from commit `7440d89506fa55634efa5f5b411e49d2e0f8e994`; `artifacts/deployment.json` records success. These are local ignored artifacts, not a published release. Reuse with `npm run deploy -- artifacts/release.json`, or rebuild/regenerate for a later commit. Standard setup is in [README](../README.md).

Limitations: accounts, gameplay, multiplayer and chat are not implemented; current session-read adapter and closed mutations are explicit foundations. No remote Actions run, GHCR publication, Kubernetes or production deployment is claimed. Mobile tests use Chromium emulation. Phaser bundle size remains a future optimization.

Next concrete task: implement the Milestone 1 identity slice in [tasks](tasks.md): password signup/login with administrator-controlled beta gating and atomic single-use hashed-key redemption. Begin with simultaneous redemption and gate-toggle integration tests; keep signup closed until those invariants pass. Inspect actual code before using this memory, preserve user edits, and keep the design's open decisions open.

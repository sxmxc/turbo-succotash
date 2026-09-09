# Versions and deployment

Root `package.json.version` is the single authoritative product version. Workspaces are private and deliberately have no duplicate product version. `CHANGELOG.md` carries release notes; document revisions and SQL migration revisions are independent. Follow [Semantic Versioning](https://semver.org/): during 0.x this project uses minor increments for features or breaking contracts and patches for compatible fixes. After 1.0, incompatible public changes require a major increment.

HTTP and realtime schemas are compatibility contracts. Release 0.2.0 uses protocol 2; only coordinated 0.2.x web, identity, API and realtime builds are supported. Realtime joins validate the protocol version and reject unsupported clients. Document supported combinations and migration compatibility in every release; deploy coordinated services until independent compatibility is tested.

## Build once and promote

```sh
npm run check
npm run compose:build
npm run compose:up
npm run smoke
npm run test:database
npm run test:dependencies
npm run test:browser
npm run release:check -- v0.2.5
npm run release:manifest
npm run deploy -- artifacts/release.json
```

Build scripts inject the Git commit and root version; service diagnostics and OCI image labels identify them. Development defaults say `development`; Compose builds from uncommitted work append `-dirty` to the commit and cannot produce a release manifest. Commit the reviewed source and lockfile before tagging. `release:check` rejects a mismatched tag or absent changelog version. Released versions/tags are immutable.

`release:manifest` records tested image IDs and available registry digests, and checks their labels against the source commit/version. `deploy` validates immutable references and metadata, starts PostgreSQL, executes migrations as a one-off job, promotes the same images without rebuilding, waits for readiness and runs post-deploy smoke with commit verification. It writes `artifacts/deployment.json` with version, commit and health/migration outcome. Local image IDs are valid only on the same Docker daemon (or after `docker save`/`load`); registry-qualified digests are portable.

The GitHub Actions workflow runs locked install, formatting/lint, types, tests, production/container builds, fresh Compose startup, migration/database integration tests, browser checks and immutable local promotion. Tag builds additionally validate release metadata and export **the tested images**. The separate `release` environment job loads those artifacts and publishes version/commit tags to GHCR, recording digest references. Publishing never rebuilds. Each version and commit tag is independently resumable after partial publication: an existing tag is accepted only when its remote image config digest exactly matches the tested local image ID; different content hard-fails and is never overwritten. Missing tags use bounded push retries, and the final manifest records registry-qualified immutable digest references. Configure the GitHub `release` environment and package access before first tag; protected tags and environment reviewers are recommended repository settings. Untrusted PR verification receives only read access and no deployment credentials. Publishing job alone gets `packages: write`.

The tagged `v0.2.1` CI verification ran remotely, but GHCR publication stopped partway through and no production deployment is claimed. Because rerunning that workflow uses the old tagged publisher, version `0.2.2` contains the recovery fix; versions `0.2.3` and `0.2.4` contain subsequent prepared changes. Never move an existing tag or overwrite a mismatched GHCR tag. Creating or publishing a tag still requires explicit owner approval. For an approved release, download the published release manifest. On an authorized target, authenticate for image pulls, provision `.env`/database, and run the reusable deployment entry point with that manifest. Keep the root checkout/scripts at the release version. Kubernetes packaging, TLS, production secret management and realtime room draining are later target-specific work.

## Migrations and rollback

Migration jobs serialize with an advisory lock; checksums reject edited applied SQL; each new revision commits atomically. Fresh installation and repeat application are integration-tested. Add forward-only compatible schema expansion before code adoption; remove obsolete fields only after all supported binaries stop using them.

An application rollback can redeploy a previous manifest only while its schema assumptions remain compatible. The deployment tool does not undo migrations and is not a database backup system. For incompatible schema changes, prefer a forward fix or explicitly restore a verified backup during a planned outage; restoring can lose later writes. Rehearse this per release. Current Colyseus has no occupied rooms to drain; Milestone 1 must add predictable disconnect/reconnect behavior before live rollout.

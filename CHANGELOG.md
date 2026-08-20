# Changelog


## [v3.8.3] - August 2026
Security patch release: resolve npm audit findings across transitive and direct dependencies. No API or operator-facing behavior changes intended.
### Changed
- **`js-yaml` 4.3.0 → 4.3.1** — address GHSA-5p4m-2wfm-xmqj (quadratic CPU consumption in `!!omap` resolution).
- **`oidc-provider` ^9.8.4 → ^9.11.3** — pulls in upstream dependency cleanup (removes vulnerable transitive `nanoid`; GHSA-28wg-ghj8-5hjv) and adapter/logout fixes within the 9.x line.
- **`undici` ^7.29.0** (direct) and **`node-gyp` → `undici` ^6.28.0** override — address HTTP client advisories in runtime and native-module build tooling.
- **`ip-address` ^10.3.1** override — address SSRF/trust-boundary advisories in the Kubernetes client SOCKS dependency chain.
- **`brace-expansion` 5.0.9** override refresh.
- Dockerfile **`ubi9/nodejs-24-minimal`** base image digest pin refreshed.
- Embedded **EdgeOps Console** default version **v1.0.12** → **v1.0.13**
### Fixed
- Production **`better-npm-audit`** CI gate passes with zero outstanding advisories.

## [v3.8.2] - 2026-08-06

Plan 21: liveness/readiness probe split and structured agent auth errors (coordinate with Edgelet v3.8.2). Also embedded OAuth logout/re-login hardening, EdgeOps Console **v1.0.12**, operator sizing docs, **SQLite write-queue self-recovery** for long-running single-node deployments, and **`NATS_SERVER_URL`** for NATS-enabled application microservices.

### Added

- **`GET /api/v3/live`** — public **liveness** probe (process up; always 200 while HTTP server listens).
- Structured agent fog JWT errors on **`/api/v3/agent/*`**: **`code`** + **`retryable`** on 401 (credential failure) and 503 (Controller dependency failure).
- **`docs/operations/sizing.md`** — hardware sizing guide by fog count (Kubernetes and Remote ControlPlane).
- **SQLite transaction recovery settings** — `settings.dbWriteQueueBackpressureDepth` (default **32**), `settings.dbTransactionTimeoutReadinessMs` (**5000**), `settings.dbTransactionTimeoutInteractiveMs` (**15000**), `settings.dbTransactionTimeoutBackgroundMs` (**120000**); env overrides **`DB_WRITE_QUEUE_BACKPRESSURE_DEPTH`**, **`DB_TRANSACTION_TIMEOUT_*_MS`** (see `docs/operations/database-transactions.md`).
- **OTEL DB metrics** — `db.transaction.timeouts` and `db.write_queue.background_shed` for queue surgery and stuck-transaction visibility.
- **Microservice NATS connection URL** — when `natsConfig.natsAccess` is enabled, Controller injects **`NATS_SERVER_URL`** alongside **`NATS_CREDS_PATH`** into the microservice env (delivered on `GET /api/v3/agent/microservices`). Resolution: fog with local NATS + bridge mode → `nats://nats.default.svc.bridge.local:{serverPort}`; fog with local NATS + `hostNetworkMode` → `nats://localhost:{serverPort}`; fog without local NATS → `nats://{hub.host}:{serverPort}` (default port **4222**). Enable/update/disable follows the same lifecycle as NATS creds; missing hub when no local NATS returns **400**.
- **Agent propagation outbox** — catalog and registry microservice/fog fan-out runs in the background via **`ReconcileOutbox`** kind **`agent_propagation`** (~1 drainer tick eventual consistency). Config: **`settings.agentPropagationFogNotifyBatchSize`** (default **100**), env **`AGENT_PROPAGATION_FOG_NOTIFY_BATCH_SIZE`**.

### Changed

- **`GET /api/v3/status`** — public **readiness** probe: verifies database, vault (if enabled), and embedded auth signing material; returns **503** with **`Retry-After: 5`** when not ready (same JSON fields as before on **200**).
- **`checkFogToken`** — infrastructure failures map to **503** instead of generic **401**; credential failures return explicit agent auth codes (e.g. **`AGENT_JWT_ALREADY_USED`**).
- **`iofog-controller` daemon elevation check** uses **`/api/v3/live`** instead of **`/status`**.
- Embedded **EdgeOps Console** default version **v1.0.10** → **v1.0.12** (Dockerfile, Makefile, CI build env, `.env.example`, `build-console-dev.js`).
- Embedded OAuth BFF authorize sends **`prompt=login`** so each browser sign-in starts a fresh issuer interaction.
- **`POST /api/v3/user/logout`** (embedded) clears issuer Session/Grant/Interaction state and destroys the BFF express-session when present (refresh-token revocation unchanged).
- Dependency bumps: OpenTelemetry **0.221.x**, **`body-parser` 1.20.6**, **`js-yaml` 4.3.0**, **`undici` ^7.28.0**; Dockerfile base image digest pins refreshed.
- **SQLite write queue backpressure** — when total queued depth exceeds **`dbWriteQueueBackpressureDepth`**, new **background** enqueue is rejected (`QueueBackpressureError` → **503** when surfaced through agent auth); **`dbWriteQueueMaxDepth`** (**256**) remains alert-only.
- **SQLite transaction timeouts** — per-lane timeouts abort stuck work, recycle the sqlite pool, and allow the queue worker to continue (interactive **15s**, background **120s**).
- **`checkFogToken` transaction scope** — agent handler runs inside the auth transaction via **`runWithTransactionContext`**, so nested **`runInTransaction()`** reuses the parent writer instead of enqueueing a second sqlite transaction.
- **Readiness database probe (SQLite)** — **`SELECT 1`** for **`GET /api/v3/status`** runs outside the global write queue with a **5s** timeout, so health checks stay responsive under write-queue pressure.
- **Catalog/registry propagation** — interactive catalog image/registry updates and registry CRUD commit source-of-truth + outbox enqueue only; bulk microservice rebuild, registry-id propagation, and fog change-tracking notify run in the background drainer (chunked for large fleets).

### Fixed

- **SQLite ControlPlane freeze after multi-day uptime** — a hung sqlite transaction could block the global write queue indefinitely (queue depth > **256**, console/potctl/iofogctl and **`/api/v3/status`** unresponsive until restart). Self-recovery: transaction timeouts, pool recycle, and background queue shedding under sustained backpressure.
- **Agent auth nested-transaction deadlock (SQLite)** — **`checkFogToken`** authenticated in one transaction then invoked the handler outside ALS, allowing nested writes to deadlock the single-connection pool on hot agent routes (e.g. status/config polling).
- **Secret PATCH** — omitted **`type`** in the update body now defaults to the existing secret type instead of **400** `Secret type mismatch` (fixes JSON PATCH and YAML secret updates that send only **`data`**).
- **Embedded OAuth re-login after logout** — stale issuer session could yield **`access_denied`** on callback; logout now tears down issuer/BFF OAuth state and authorize forces fresh login.
- **OAuth callback errors** — issuer errors (e.g. **`access_denied`**) redirect to **`{consoleUrl}/login?oauthError=...`** instead of **401 JSON** on the API port.

### Edgelet / ControlPlane

- Kubernetes: **`livenessProbe`** → **`/api/v3/live`**, **`readinessProbe`** → **`/api/v3/status`**.
- Edgelet must retry **503** and must not deprovision on retryable failures. See **edgelet-invariants.md** §16.

---

## [v3.8.1] - 2026-07-11

Patch release: EdgeOps Console refresh, console caching, RBAC and upload hardening, cluster-controller list filtering, and application-template deploy cleanup.

### Added

- **`GET /api/v3/cluster/controllers`** — optional query param **`includeInactive=true`** returns historical inactive replica rows; default list excludes inactive controllers.
- **`scripts/check-dockerfile-digests.sh`** — skopeo-based check that digest-pinned Dockerfile base images match current registry manifest lists (multi-arch aware).

### Changed

- Embedded **EdgeOps Console** default version **v1.0.9** → **v1.0.10** (Dockerfile, Makefile, CI build env, `.env.example`, `build-console-dev.js`).
- **`multer`** upgraded to **2.2.0**; multipart uploads capped at **1** file, **10** fields, **`fieldNestingDepth: 0`**.
- Dockerfile base image digest pins refreshed for **`node:24-bookworm`** and **`ubi9/nodejs-24-minimal`**.
- EdgeOps Console static serving — **`Cache-Control`** policy: **`no-cache`** for `index.html` and SPA fallbacks, **`no-store`** for `controller-config.js`, **`immutable`** long cache for hashed **`assets/`**, **24h** cache for **`branding/`**.

### Fixed

- **RBAC authorization pool pressure** — fresh RBAC cache hits serve cached allow/deny decisions without opening a DB transaction; full auth path runs only on cache miss or stale version.
- **Multipart upload DoS** — multer limits mitigate unbounded field nesting / file count abuse on file-upload routes.
- **Application template deploy** — template populate excludes **`created_at`** / **`updated_at`** so deploy-from-template does not leak template metadata into the generated application payload.

---

## [v3.8.0] - 2026-07-03

Controller v3.8 is a **greenfield** release aligned with **Edgelet**. There is **no upgrade path** from v3.7: use a fresh database and redeploy Controller + Edgelet together.

### Breaking changes

#### Agent runtime

- **Edgelet only** — v3.7 legacy field agents are **not supported**.
- Requires **Edgelet v1.0.0-rc.1+** on the same release train (pin e.g. `v1.0.0-rc.1` with Controller `v3.8.0`).
- Provision accepts `containerEngine`: `edgelet` | `docker` | `podman` (was docker-implied).
- Agent config: `dockerUrl` → **`containerEngineUrl`**; `dockerPruningFrequency` → **`pruningFrequency`**.
- Agent architecture: `fogType` / `fogTypeId` → **`arch`** / **`archId`** (ids: 0=auto, 1=amd64, 2=arm64, 3=riscv64, 4=arm).
- Agent status: removed **`processedMessages`**, **`messageSpeed`**; added **`availableRuntimes`**, optional **`runtimeAgentPhase`**, **`controlPlaneQuiesced`**.
- Default container registry: **`docker.io`** (was `registry.hub.docker.com`).
- Reserved ports: **54321**, **54322**, **53**.
- New field-agent endpoint: **`POST /api/v3/agent/controller/register`** (system fogs only; Edgelet rc.1+). Register body accepts full container workload fields (`cmd`, `isPrivileged`, `healthCheck`, `capAdd`/`capDrop`, `extraHosts`, resources, etc.) with the same semantics as user microservice deploy; excludes `serviceAccount`, `natsConfig`, and ownership fields.

#### API — architectures and applications

- **`GET /api/v3/fog-types`** → **`GET /api/v3/architectures/`** (public).
- **`/api/v3/flow/*`** → **`/api/v3/application/*`**; RBAC resource **`flows`** → **`applications`**.
- Microservice create: **`application`** string (name) in body — **`flowId` query param removed**.
- Error codes: **`INVALID_FLOW_*`** → **`INVALID_APPLICATION_*`**.
- Catalog and microservice images: **`images[]`** with `{ containerImage, archId }` (up to **4** per arch 1–4); single-image-only create removed.
- Microservice **`runtime`** must be in agent **`availableRuntimes`**.
- Service account volume type **`serviceAccount`** (immutable); `roleRef.apiGroup` **`edgelet.iofog.org/v1`** (was `agent.datasance.com/v3`).
- System microservice **`controller`** in application `system-{agentName}`; user delete → **403**, user PATCH → **400**.
- **TCP bridge** connector `host` depends on target agent **router mode** and service type. A router is **required** (`routerMode` ≠ `none`) for `microservice` and `agent` services. **Interior** router: **`127.0.0.1`**. **Edge** router: **`edgelet.default.svc.bridge.local`** for host-network microservices and `agent` services; **`{appName}.{microserviceName}`** for pod-network microservices (removed `iofog`, `iofog_{uuid}`, and `edgelet.default.bridge.local`).
- Skupper router **`siteId`** removed from persisted **`tcpConnector`** / **`tcpListener`** entries in router microservice config (target router is implied by which router microservice holds the config).
- NATS system microservice env and config templates: **`NATS_SSL_DIR`** → **`NATS_TLS_DIR`**.
- Debug catalog image: **`ghcr.io/eclipse-iofog/node-debugger`** → **`ghcr.io/eclipse-iofog/debugger`** (seeders and `config.yaml`).

#### Removed APIs

- **EdgeResource** APIs, models, and RBAC.
- **Diagnostics**, **strace**, image **snapshot** / **download** APIs.
- All **`/api/v3/flow`** routes.

#### WebSocket exec — multi-session

- **Microservice exec REST removed** — `POST/DELETE /api/v3/microservices/:uuid/exec` and `…/system/:uuid/exec` no longer exist. Open exec with **direct WebSocket** only: `WS /api/v3/microservices/exec/:uuid` (or `…/system/exec/:uuid`).
- **5 concurrent exec sessions** per microservice (was 1 user exec WS per MS).
- **Per-session lifecycle** — closing one exec session deletes only that session row only (no microservice-level exec flag).
- **`execEnabled` removed** — dropped `microservices.exec_enabled` column and agent MS list field; exec attach is poll-driven only (`GET /agent/exec/sessions`).
- **Agent exec discovery** — new `GET /api/v3/agent/exec/sessions` when change tracking reports `execSessions: true`.
- **Agent exec WebSocket** — `WS /api/v3/agent/exec/microservice/:microserviceUuid/:sessionId` only; legacy `WS /api/v3/agent/exec/:microserviceUuid` with initial MessagePack pairing frame **removed**.
- **User session announce** — Controller sends **ACTIVATION** (type 5) to user with `{ sessionId, microserviceUuid }` on connect.
- **Fog debug** — `POST/DELETE /api/v3/iofog/:uuid/exec` unchanged (provisions debug system MS); interactive shell via `WS /api/v3/microservices/system/exec/:debugMsUuid` (system path — debug MS is a system microservice).

#### Authentication

- **`keycloak-connect` removed** — generic OIDC (`openid-client` + JWKS discovery).
- Keycloak-specific env removed: **`KC_*`**, **`auth.realm`**, **`auth.realmKey`**, realm public key.
- Canonical OIDC env: **`OIDC_ISSUER_URL`** (full issuer URL), **`OIDC_CLIENT_ID`**, **`OIDC_CLIENT_SECRET`**, **`OIDC_CONSOLE_CLIENT_ID`**, **`AUTH_MODE`** (`embedded` | `external`).
- Embedded issuer at **`{CONTROLLER_PUBLIC_URL}/oidc`** when `AUTH_MODE=embedded`.
- TLS env renamed: **`SSL_*`** → **`TLS_*`**; use **`CONTROLLER_PUBLIC_URL`** + **`TRUST_PROXY`** behind reverse proxies.
- Browser login: OAuth BFF (`GET /api/v3/user/oauth/authorize`) — not browser `POST /user/login`.
- Bootstrap admin: **`OIDC_BOOTSTRAP_ADMIN_USERNAME`**, **`OIDC_BOOTSTRAP_ADMIN_PASSWORD`** (embedded first boot).

#### EdgeOps Console (replaces ECN-Viewer)

- **Container-only ship** — no npm publish of `@datasance/iofogcontroller` or `@datasance/ecn-viewer`.
- **EdgeOps Console** static SPA embedded in the Controller image (replaces **`@datasance/ecn-viewer`** / **`@iofog/ecn-viewer`** npm package).
- Build flavors: **`datasance`** | **`iofog`** via **`EDGEOPS_CONSOLE_FLAVOR`** / **`EDGEOPS_CONSOLE_VERSION`**.
- Env renames (no aliases):

  | Remove | Canonical |
  |--------|-----------|
  | `VIEWER_URL` | **`CONSOLE_URL`** |
  | `VIEWER_PORT` | **`CONSOLE_PORT`** |
  | `ECN_VIEWER_PATH` | **`EDGEOPS_CONSOLE_PATH`** |
  | `OIDC_VIEWER_CLIENT_ID` | **`OIDC_CONSOLE_CLIENT_ID`** |
  | `AUTH_VIEWER_CLIENT_ENABLED` | **`AUTH_CONSOLE_CLIENT_ENABLED`** |

- Runtime **`controller-config.js`** uses **`consoleUrl`** (not `viewerUrl`); **`auth.*`** endpoints only — no `keycloak*` or `oidcIssuerUrl` keys in Console config.
- Dual-port default: API **51121**, Console **8008**.
- Status API field **`versions.ecnViewer`** retained for compatibility; value is the embedded Console version string.

#### Database and distribution

- **Greenfield schema** — **new install required**; no v3.7 → v3.8 database migrator.
- PKI: central router/NATS local CAs; legacy per-agent CAs migrated via one-time **rotation job**.
- **Node.js 24.x** required for dev and CI (was 16/18).
- Dual-mirror container images: **`ghcr.io/eclipse-iofog/controller`** and **`ghcr.io/datasance/controller`** from the **same commit SHA**; publish on **`v*` tags only** via repo variable **`IMAGE_REGISTRY`**.

### Added

- Embedded OIDC identity service with TOTP MFA (`mfaRequired` per auth group; all system groups default to MFA off on install).
- **`GET /api/v3/user/profile`** (embedded mode) — includes **`mfaEnabled`** for the authenticated user.
- **`POST /api/v3/auth/migration/export`** — one-way embedded → external IdP migration.
- **`POST /api/v3/auth/jwks/rotate`** — manual JWKS rotation (embedded mode).
- Built-in rate limiting on auth endpoints.
- HA BFF session store support for multi-replica Controller deployments.
- **NOTICE** file replaces per-file copyright headers.
- Neutral in-tree identity: RBAC **`iofog.org/v3`**, default namespace **`iofog`**, `package.json` name **`controller`**.
- NATS account/user rule **JWT Latin-1 validation** — rejects rules whose fields cannot be encoded in a NATS JWT (create/update on rules, applications, microservices, and NATS API).
- RBAC **route catalog utils** (`isPublicCatalogRoute`) — shared lookup of public routes from `rbac-resources.yaml` (empty verb list = no auth required).
- **Fog + service platform reconcile** — declarative router/NATS and service endpoint lifecycle replaces fire-and-forget `setImmediate` in `iofog-service.js` and `services-service.js`.
- Tables: **`FogPlatformSpecs`**, **`FogPlatformStatuses`**, **`FogPlatformReconcileTasks`**, **`ServicePlatformReconcileTasks`**, **`HubRouterConfigLocks`** (greenfield migrations amended for sqlite, mysql, postgres).
- **`platform-reconcile-worker-job.js`** — one worker, two DB-backed claim paths (fog + service); stale reclaim, exponential backoff, max attempts.
- **`fog-platform-sweep-job.js`** — periodic drift detection for fog and service platform state.
- **`GET /api/v3/iofog/{uuid}`** — optional **`platformStatus`** (`phase`, `generation`, `lastError`, conditions).
- **`POST /api/v3/iofog/{uuid}/reconcile`** and **`POST /api/v3/services/{name}/reconcile`** — manual retry after failed or stuck reconcile.
- Service **`provisioningStatus`** — hub semantics: **`ready`** when hub connector/listener and K8s Service reconcile succeed; edge TCP bridges converge asynchronously via fog platform reconcile fan-out.
- **K8s control plane:** hub **`iofog-router`** ConfigMap patches serialized via DB lock; K8s Service create/update/delete with LoadBalancer watch timeout.
- **`service-bridge-config.js`** — full recompute of service-derived TCP bridge config per fog on reconcile (preserves router base config).
- **SQLite single-node production hardening** — WAL + `busy_timeout` pragmas, reconcile task claim retry on `SQLITE_BUSY`, staggered startup for reconcile-heavy background jobs (`settings.jobStartupDelaySeconds`).
- **WebSocket exec & log session hardening** — quotas (**5 exec** / 5 log WS per resource), per-session exec lifecycle, 60s/120s pending timeouts, 8h exec max, 30s graceful drain, OTEL metrics, HA AMQP fail-fast, integration tests, swagger WS protocol docs, operator guide (`docs/operations/ws-sessions.md`).
- **Multi exec sessions** — `GET /api/v3/agent/exec/sessions`; agent exec WS `…/agent/exec/microservice/:uuid/:sessionId`; user ACTIVATION with `sessionId`; `MicroserviceExecSessions` table; `execMaxConcurrentPerResource` config (default **5**).
- **WebSocket relay production** — unified **`WsRelayTransport`** abstraction; cross-replica exec/log relay backend selected at startup by **`nats.enabled`** (`NATS_ENABLED`): **AMQP** router pool (8 connections per replica, overflow recovery, sendable gating) when `false`, **NATS Core** pub/sub on platform hub (`controller-relay` account) when `true`. Fail-fast activation on both transports; log backpressure drops `LOG_LINE` under pressure. Config: `server.webSocket.relay.amqp.*`, `server.webSocket.relay.nats.*`. No new relay env var; HA swagger/docs updated per R112.
- **ransaction safety** — unified **`runInTransaction()`** write path for API, jobs, and WebSocket cleanup; **`fakeTransaction`** and **`bypassQueue`** removed; **`ReconcileOutbox`** transactional outbox with background drainer; SQLite priority write queue (`interactive` > `background`); mysql/postgres reconcile task claims use **`FOR UPDATE SKIP LOCKED`**; OTEL DB metrics and ops runbook (`docs/operations/database-transactions.md`). **Breaking: internal only** — no agent wire or public REST shape changes.
- **— pre-close transaction audit** — fixes SQLite hangs from nested `generateTransaction` (`certificate-service` → `SecretService` tx propagation), JTI cleanup job queue bypass, OAuth interaction OIDC reads outside tx, external-mode user IdP HTTP outside tx, service platform LoadBalancer watch outside long tx; extended grep gates and unit tests. threads optional `transaction` through `cert.js` `loadCA` / `getCAFromK8sSecret` / `getCAFromInput` so fog platform reconcile no longer deadlocks on SQLite when signing site-server certs after router-site-ca. NATS hub ConfigMap cluster routes, StatefulSet rollout, and JWT bundle K8s patches moved outside DB transaction bodies in `nats-service.js` (phased reconcile + `afterCommit` deferral when called from `reconcileFog`). HashiCorp Vault HTTP for secret/configmap/registry create/update/delete deferred via `transaction.afterCommit` (`vault-transaction-helper.js`); DB rows use internal encryption during tx, vault store/delete after commit. splits `FogPlatformService.reconcileFog` into phased background transactions (`prepare` → `certPrep` → NATS self-tx → `platform` → `finalize`) mirroring service-platform reconcile — no single tx spans cert generation, NATS, and router reconcile end-to-end. AMQP router cert provisioning in one transaction; agent CA endpoint without pointless DB tx; removed unused services-service TCP bridge K8s-in-tx helpers (operator CRUD uses enqueue + service-platform reconcile only); OIDC provider adapter routed through write queue.
- **unified ALS transaction context** — `runWithTransactionContext` registers existing Sequelize transactions in AsyncLocalStorage; `generateTransaction` uses it for explicit-tx and ALS-inject paths so nested `runInTransaction()` reuses the parent writer on SQLite instead of enqueueing a second transaction.
- **NATS phased reconcile** — `ensureNatsForFog` splits into `nats.ensure.certPrep` (certs + JetStream key), `nats.ensure.authPrep` (JWT bundle + sys-user creds), and `nats.ensure.topology` (instance, mounts, microservice) short background transactions; K8s hub routes remain post-tx. `reconcileFogNats` calls `ensureNatsForFogPhased` / `cleanupNatsForFogPhased` instead of one monolithic `fogPlatform.natsEnsure` tx.
- **enforcement grep gates** — extended `transaction-grep-gates.test.js` for managers-never-enqueue, cert utils branch, K8s-outside-tx (nats + service-platform), vault afterCommit, volume-mount association tx, phased fog platform labels, OIDC adapter queue routing, JTI cleanup via runner.
- **first-fog integration + close docs** — `test/src/integration/first-fog-reconcile-sqlite.test.js` (gate: `RUN_INTEGRATION=1`); ops/architecture docs for R126–R135; plan close checklist updated for integration + load probe.
- **unwrap internal `_`** — `iofog-service.js` internal helpers (`_handleRouterCertificates`, `_deleteFogRouter`, router/TCP/HAL/Bluetooth/NATS helpers) export plain functions; callers in `fog-platform-service` and sweep jobs pass explicit `transaction` from phased orchestrators. Public API entrypoints remain wrapped with `generateTransaction`.

### Fixed

- **Agent fog-token auth hang (SQLite)** — `checkFogToken` updated `lastActive` via `FogManager.updateLastActive` without passing the open Sequelize transaction on a single-connection pool (`pool.max: 1`), deadlocking the write queue after provision when Edgelet first called JWT-authenticated routes (`PATCH /agent/config`, `GET /agent/registries`, etc.).
- **WebSocket audit event logging (SQLite)** — `persistAuditEvent` (`PRIORITY_BACKGROUND`) reused a committed parent transaction from AsyncLocalStorage when `createWsConnectEvent` ran in `setImmediate` after the log-session handler committed, causing `commit has been called on this transaction` errors. Background `runInTransaction` on SQLite now always enqueues a fresh transaction.
- **WebSocket log/exec session deadlock (SQLite)** — log and exec handlers awaited NATS relay setup inside the open interactive transaction; relay hub lookup enqueues a background transaction on the single SQLite connection and deadlocked. Relay setup now runs in `setImmediate` after DB work commits; relay cleanup callbacks open fresh transactions instead of capturing the handler transaction.
- **WebSocket exec/log session cleanup race (postgres / NATS relay)** — concurrent teardown paths (pending timeout + disconnect, NATS CLOSE + CLOSE ack, relay callback + `ws.on('close')`) reused one Sequelize transaction via AsyncLocalStorage, causing `commit has been called on this transaction` on session row delete. Exec and log cleanup are deduplicated per `sessionId`, use fresh background transactions, pending timeouts only close sockets, and relay CLOSE acks no longer trigger DB teardown.
- **WebSocket exec/log cross-replica pairing** — pending timeouts no longer require a local `session.agent`; user pods mark `remoteAgentPaired` via relay delivery hooks and DB fallback (`agentConnected`). Agent pods publish **ACTIVATION** (exec) and **LOG_LINE** user notifications via NATS/AMQP relay when the user is on another replica. Same-replica log “agent connected” notify uses **LOG_LINE** (not `LOG_START` + embedded message). **`ws_pending_pairings`** and **`ws_pairing_duration_ms`** metrics are recorded from user connect through pairing completion or timeout. Cross-replica paired sessions use **max/idle duration** (not pending timeout) in periodic cleanup; agent disconnect on an agent-only pod relays **CLOSE** (exec) or **LOG_LINE** (log) to the user pod and detaches local state without deleting the DB row.
- **WebSocket cross-replica exec activation** — `setupExecMessageForwarding` read `shouldUseRelay` before `enableForSession`, so agent-only pods skipped relay **ACTIVATION** and user notify on first connect (log setup was already correct). Info logs added for log session user/agent disconnect, full cleanup, and local detach.
- **WebSocket exec/log orphan session cleanup (multi-replica HA)** — agent partial disconnect no longer triggers solely because relay is enabled; teardown uses DB `userConnected` (not stale `remoteUserPaired`). Full DB delete when both sides are gone. Concurrency limits raised to **5** per resource; `GET /agent/logs/sessions` / `GET /agent/exec/sessions` count or list only `userConnected: true` rows. Reconcile job immediately removes rows with both flags false. Same-replica user disconnect still full-cleans when the agent socket is local.
- **WebSocket protocol heartbeat (exec + log)** — Controller sends RFC 6455 **Ping** frames on all four session sockets (user/agent, exec/log) every **`WS_PING_INTERVAL`** (default 30s). Keeps idle agent log/exec streams alive through Edgelet read deadlines and ingress; browsers auto-respond with Pong. Application **`CONTROL/keepalive`** on user exec unchanged (EdgeOps Console contract). No server-side pong-timeout terminate in v1.
- **Volume mount manager transaction propagation** — `VolumeMountingManager.findOne` / `findAll` passed `transaction` as a second Sequelize argument instead of inside the options object, so NATS fog reconcile could create a volume mount in an open transaction then fail to link it (`nats-server-conf-* not found`). Reads now honor the parent transaction like `BaseManager`.
- **Volume mount service transaction propagation** — `VolumeMountService.linkVolumeMountEndpoint` / `unlinkVolumeMountEndpoint` passed `transaction` as a second Sequelize argument to `getFogs` / `addVolumeMount` / `removeVolumeMount` instead of inside the options object, causing NATS fog reconcile to hang when linking volume mounts after auth bootstrap.
- **Fog platform reconcile stale errors** — `reconcileFogPrepare` clears `lastError` when entering `Progressing` so prior `SQLITE_BUSY` does not mask current reconcile state.
- **Fog platform NATS provisioning hang (SQLite)** — `reconcileFogNats` calls `ensureNatsForFogDb` directly in a background transaction (no `ensureNatsForFog` re-wrap). `generateTransaction` inlines the active AsyncLocalStorage transaction instead of enqueueing nested `runInTransaction`; duck-typed Sequelize transaction detection; `NatsConnectionManager.findAllWithNats` and `VolumeMappingManager.findAll` pass `transaction` inside Sequelize options. Fixes deadlock after router cert prep when provisioning hub NATS on first fog.
- NATS relay and AMQP router connection resolvers — **Remote CP** uses Edgelet bridge DNS then DB host only (no `*.svc.cluster.local`); **Kubernetes CP** uses `nats-server.{namespace}.svc.cluster.local` / `router.{namespace}.svc.cluster.local` with DB host fallback; connect failures log and throw aggregate errors for all attempts; relay log messages are transport-aware.
- NATS relay **`controller-relay` creds loading** — read Opaque secret values as plain UTF-8 `.creds` text (matches `nats-service.js` and DB storage); fixes **`unable to parse credentials`** on hub connect when `NATS_ENABLED=true`.
- NATS platform relay identity renamed to account/user **`controller`** with rules **`controller-account`** / **`controller-user`**; **`GET /nats/accounts/controller/users/controller/creds`** supported for operator cred export.
- Exec AMQP relay re-attaches queue receivers whenever user or agent WebSocket connects (fixes user-first sessions where ACTIVATION and STDIN never reached Edgelet); ACTIVATION is resent on agent WS reconnect.
- Controller register accepts optional **`schedule: 0`**; server always enforces schedule **0** on create, re-register, and **`PATCH /api/v3/microservices/system/:uuid`** for controller workloads.
- Agent version command (**`GET /api/v3/agent/version`**) refreshes the provision key on each pull instead of returning a stale or deleted key.
- Controller AMQP certificate provisioning uses shared **`default-router-local-ca`** instead of per-fog router local CA secret names.
- Central local CAs (`default-router-local-ca`, `default-nats-local-ca`) are ensured on first agent provision (or via operator direct import before first agent), not at Controller boot — allows custom local CAs before agent deployment.
- Fog teardown drops obsolete per-fog **`nats-local-ca-*`** and **`router-local-ca-*`** secret names from cleanup lists.
- OIDC discovery with **`AUTH_INSECURE_ALLOW_HTTP`** uses the supported `openid-client` insecure-request hook for local **`http://`** issuers.
- **Postgres OAuth/session expiry (TIMESTAMPTZ)** — greenfield postgres migration uses **`TIMESTAMPTZ`** for all temporal columns; Sequelize **`timezone: '+00:00'`** on postgres/mysql providers so auth interaction, BFF session, and certificate/heartbeat date comparisons are UTC-correct regardless of host **`TZ`**. OIDC adapter upsert uses **`conflictFields: ['model', 'record_id']`** for postgres **`ON CONFLICT`**.
- **Cross-DB TEXT column defaults** — removed **`DEFAULT`** from **`TEXT`** columns (`Fogs.warning_message`, `RbacRoles.kind`, `RbacRoleBindings.kind`) in sqlite/mysql/postgres greenfield migrations; Sequelize model **`defaultValue`** applies on insert (fixes MySQL **`ER_BLOB_CANT_HAVE_DEFAULT`** in strict mode).
- **Postgres reconcile outbox enqueue** — `ReconcileOutboxManager.enqueue` uses find-first dedup (postgres aborts transactions on duplicate insert); processed rows with the same idempotency key are re-opened for drain; insert races use a savepoint on postgres.
- **Fog delete reconcile** — platform worker runs delete when status phase is **`Deleting`** even if task reason is still spec/manual-retry; **`reconcileFog` skip → delete** fallback; delete enqueue preempts **`in_progress`** tasks; delete failures keep phase **`Deleting`**; shorter delete-task staleness reclaim (default 60s).
- **Fog delete NATS cleanup (postgres)** — `cleanupNatsForFog` reuses the caller transaction when provided (fixes postgres hang/deadlock from nested tx); NATS cleanup runs before microservice deletes in `_processDeleteCommand`.
- **MySQL `MicroserviceHealthChecks.interval`** — quote reserved column name as **`` `interval` ``** in mysql migration (fixes **`ER_PARSE_ERROR`** on greenfield install).
- **MySQL `MicroserviceExecSessions.session_id`** — use **`VARCHAR(255) UNIQUE`** instead of **`TEXT UNIQUE`** (fixes ignored **`ER_BLOB_KEY_WITHOUT_LENGTH`** and subsequent **`ER_NO_SUCH_TABLE`** on index creation); model aligned to **`STRING(255)`**.
- **MySQL RBAC TEXT unique keys** — remove inline **`TEXT UNIQUE`** on **`RbacRoles.name`** / **`RbacRoleBindings.name`** (keep **`UNIQUE KEY … (name(255))`**); prefix **`RbacServiceAccounts`** composite unique index with **`name(255)`** (fixes greenfield **`ER_FK_CANNOT_OPEN_PARENT`** / blob-key errors).
- Embedded OAuth BFF builds the in-process issuer client from local metadata and trusts listener TLS material (**`TLS_PATH_*`** / **`TLS_BASE64_*`**) for token exchange — fixes **`fetch failed`** on **`GET /api/v3/user/oauth/authorize`** with self-signed HTTPS certs without **`NODE_EXTRA_CA_CERTS`**.
- Provisioning key and **`GET /api/v3/agent/cert`** derive **`caCert`** from listener TLS material (**`TLS_PATH_*`** / **`TLS_BASE64_*`**) via shared **`tls-config`** — always base64-encoded for Edgelet trust store; fixes empty **`caCert`** when legacy **`SSL_CERT`** / **`INTERMEDIATE_CERT`** were unset.
- Config keys **`auth.bootstrap.adminUsername`** / **`adminPassword`** renamed to **`auth.bootstrap.username`** / **`password`** (**`OIDC_BOOTSTRAP_ADMIN_*`** env vars unchanged).
- Microservice create/update **strips** user-supplied **`serviceAccount`** volume mappings instead of rejecting them — allows GET → PATCH round-trips; system still injects the canonical binding.
- OIDC middleware **skips Bearer validation** on public catalog routes (e.g. **`GET /api/v3/status`**, **`GET /api/v3/architectures/`**, OAuth BFF) so agent/controller tokens on health checks no longer spam JWKS warnings.
- TCP bridge background provisioning resolves agent router mode via **`RouterManager.findOne`** (fixes **`TypeError`** when **`fakeTransaction`** is used in background jobs).
- TCP bridge / router provisioning **background error logging** uses pino object-first `{ err, msg, … }` so failures are no longer logged as empty errors.
- Router microservice **`siteConfig.platform`** defaults to **`edgelet`** (was **`docker`**) when the agent uses the Edgelet runtime.
- Boolean env vars (`TRUST_PROXY`, `SERVER_DEV_MODE`, `DB_USE_SSL`, `VAULT_ENABLED`, `ENABLE_TELEMETRY`, and other mapped flags) are parsed consistently from Kubernetes string values (`true`/`false`, `1`/`0`) via shared **`config.getBoolean()`** — fixes startup crash when **`TRUST_PROXY=true`** was passed as a string to Express.
- Postgres/MySQL SSL reads canonical **`DB_SSL_CA`** (via config) instead of undocumented **`DB_SSL_CA_B64`**; **`database.*.useSSL`** config key honored (was **`useSsl`** typo).
- Spurious **`routerMode`** / **`natsMode`** **`none`** on fog list/get when runtime rows were pending — read path now falls back to **`FogPlatformSpecs`** during reconcile.
- **`PATCH /api/v3/iofog/{uuid}`** on system fogs with full config (potctl redeploy) — **400** **`Invalid NATS mode 'undefined'`** when `natsMode` was omitted from PATCH body.
- Partial fog delete orphans when router/NATS teardown failed mid-flight — delete is async via platform reconcile **`Deleting`** phase.
- Service provisioning races and lost hub ConfigMap updates under multi-Controller — serialized hub lock and DB-backed service reconcile tasks.
- Dual writers to router microservice bridge config from fog create/update and service create/update/delete — single full-recompute path on fog reconcile.
- SQLite startup lock contention on single-controller deployments — WAL + `busy_timeout` pragmas on connect, `withDbBusyRetry` on fog/service/NATS task claims, staggered reconcile-heavy job startup.
- **`reconcileFog` transaction parameter** — removed unused `options` argument so worker-decorated calls receive the transaction correctly.
- **NATS auth post-commit orchestration** — account/user rule reissue and application NATS orchestration run in background `PRIORITY_BACKGROUND` transactions after API commit; no longer inherit committed ALS transactions (`commit has been called on this transaction`).
- **NATS resolver bundle ordering** — hub + leaf JWT bundles rebuild only after reissue/revocation commits; outbox enqueue removed from eager `scheduleReissueFor*` paths.
- **Application NATS rule / disable** — `_scheduleApplicationNatsOrchestration` post-commit with guaranteed outbox enqueue on success (R139).
- **Microservice NATS PATCH** — normalized `natsConfig` gates enable/disable/rule change; resolver bundle uses fresh account JWT reads; idempotency keys include `authGeneration` / `microserviceUuid` (R137, R140, R142).
- **User rule fan-out** — `reissueForUserRule` covers all `NatsUserManager` rows by rule id including Bearer users; revocations propagate (R143).
- **Fog router MS upstream** — router microservice config built from live router DB + connections, not stale persisted JSON; upstream topology change forces persist (R144, R145).
- **Downstream fog fan-out** — upstream interior-router or server-NATS host/port change enqueues downstream platform reconcile (R146).
- **`upstreamNatsServers` preserve-on-omit** — PATCH omitting `upstreamNatsServers` preserves existing NATS upstream connections (R147).

### Changed

- Embedded auth login MFA challenge — users with enrolled TOTP (**`mfaEnabled`**) are always prompted for TOTP at login, including voluntary My Account enrollment when all groups have **`mfaRequired: false`**. Group **`mfaRequired`** still forces enrollment for members who have not enrolled.
- OpenTelemetry SDK dependencies bumped to **0.219.x**; telemetry init simplified (removed custom resource detector wrapper).
- **`js-yaml`** bumped to **4.2.0**.

### Removed

- v3.7 legacy field-agent wire protocol and deprecated agent field names.
- npm package distribution of Controller and ECN-Viewer.
- EdgeResource, diagnostics, strace, and legacy flow APIs.
- Keycloak-specific configuration and `keycloak-connect` dependency.
- `processedMessages`, `messageSpeed`, and dual-read aliases for deprecated agent fields.

---

## [v3.0.0] - 11-05-2022

### Features

* Updated ecn-viewer to v3.0.2
* Updated job schedular logic
* Removed sentry from the code (#744)
* Removed sentry and analytics from the code as they were obsolete.
* Updated the down  migration of TrackingEvent table
* Added timeZone in agentConfig
* Removed node 10 tests and added node 16 tests
* Removed node 12
* Minimum node version is now >= 12
* Updated Docker Node.js version to Gallium
* Updated API to use name instead of uuid as primary identifier
* Allow password update without sending email

## [v3.0.0-beta1] - 13-08-2021

### Features

* Update ECN Viewer version to 2.0.1

### Bugs
* Fixed issue when rebuild flag was not set to true when images are updated
* Fixed issue when microservice states were inconsistent on moving from one agent to another

## [v3.0.0-alpha1] - 24 March 2021

* Add Edge Resources API endpoints and functionality
* Add Application Templates API endpoints and functionality
* Add Applications API endpionts
* Use LiquidJS templating engine for any incoming request
* Update Docker Node.js version to Fermium
* Add UDP port mapping support

## [v2.0.1] - 2020-10-23

#### Features

* Return microservice download percentage

### Bugs

* Fix default available disk threshold being too high
* Replace Winston logger with Pino
* Make flowId query param optional for GET microservices endpoint

## [v2.0.0] - 2020-08-05

### Features

* Add graceful shutdown of servers when SIGTERM is received
* Add plugin support for Public Port allocation

## [v2.0.0-rc1] - 2020-04-28

### Features

* Volume mapping types
* Add logic to initDB to prevent CLI command to override values configured using env variables
* Remove connector from iofog-controller
* Update ECN Viewer
* Make system images configurable
* Add versions to status

### Bugs

* Fix migration column name
* Check for Agent duplicate name
* Fixed updating proxy config when an agent is deleted
* Set agent/ms status to UNKNOWN


## [v2.0.0-beta2] - 2020-04-06

### Features

* Sort ioFog and Microservice list response
* Updated default value of dockerPruningFreq to 1
* Add system query param to /iofog-list endpoint
* Changed router images to `iofog/router`
* Update messageSpeed datatype to float
* Update diskThreshold to availableDiskThreshold

### Bugs

* Check for reserved ports
* Only log error and warnings
* Bump ECN Viewer version
* Fix list agents query param logic


## [v2.0.0-beta] - 2020-03-12

No changes

## [v2.0.0-alpha] - 2020-03-11

### Features

* Added endpoint to return public ports
* Add agent docker pruning endpoint
* Support websocket proxy
* Added rotation to log files
* Allow creation of microservice without catalog item
* Bump ECN Viewer to 1.0.4
* Support mixed k8s and non-k8s flows

### Bugs

* Throw error if router host is not provided
* Fix update microservice image command
* Fixed proxy deletion bug
* Fixed the bug for moving msvcs to new Agent
* Fix optional catalog-item in provisioning check of microservices
* Fixed k8s get pod issue
* Fixed `ProviderFailed` on k8s deployments
* Removed HA dependencies
* Fix catalog item id validation if no image provided
* Always return populated array for k8s get node addresses
* Fixed k8s deployment bug
* Add CLI support for microservice without catalog item
* Allow patch without catalogitem

## [v1.2.1] - 2019-07-13

### Features

* Return Agent's external IP for Kubelet
* Add uptime to status endpoint

### Bugs

* Requests not failing if with additional properties

## [v1.1.1] - 2019-07-03

### Features

* Added support for setting and passing through environment variables in docker containers at runtime (see iofog-controller CLI)
* Added support for overriding container CMD directives at runtime (see iofog-controller CLI)
* Added capability to return a microservice's public url when a public port is set
* New metrics being tracked:
  * Total CPU usage
  * Available disk
  * Available memory
* Controller Docker images now build from iofog-docker-images for stability

### Bugs

* Update microservice did always get picked up by Agent
* High CPU usage when Controller was running for couple of weeks
* Fixed log rotation (should work infinitely now)
* Fixed regression where Ports public directive was not honored

## [1.0.28](https://github.com/ioFog/Controller/releases/tag/1.0.28) (2018-12-14

## [1.0.27](https://github.com/ioFog/Controller/releases/tag/1.0.27) (2018-12-06)

### Features

* **npm-scripts:** allow to use only one image on catalog item creation ([#415](https://github.com/ioFog/Controller/issues/415)) ([2a3e5d4](https://github.com/ioFog/Controller/commit/2a3e5d4))
* **npm-scripts:** init db automatically after installation ([#413](https://github.com/ioFog/Controller/issues/413)) ([a77bea3](https://github.com/ioFog/Controller/commit/a77bea3))

### Bug Fixes

* **tests:** rename logLimit -> logSize ([#416](https://github.com/ioFog/Controller/issues/416)) ([7b6b310](https://github.com/ioFog/Controller/commit/7b6b310))
* **transactions:** fix transaction validation if last method's arg is undefined ([#414](https://github.com/ioFog/Controller/issues/414)) ([5369b05](https://github.com/ioFog/Controller/commit/5369b05)

## [1.0.26](https://github.com/ioFog/Controller/releases/tag/1.0.26) (2018-11-30)

## [1.0.25](https://github.com/ioFog/Controller/releases/tag/1.0.25) (2018-11-30)

## [1.0.24](https://github.com/ioFog/Controller/releases/tag/1.0.24) (2018-11-26)

## [1.0.23](https://github.com/ioFog/Controller/releases/tag/1.0.23) (2018-11-26)

## [1.0.22](https://github.com/ioFog/Controller/releases/tag/1.0.22) (2018-11-26)

## [1.0.21](https://github.com/ioFog/Controller/releases/tag/1.0.21) (2018-11-24)

## [1.0.20](https://github.com/ioFog/Controller/releases/tag/1.0.20) (2018-11-24)

## [1.0.19](https://github.com/ioFog/Controller/releases/tag/1.0.19) (2018-11-22)

## [1.0.19](https://github.com/ioFog/Controller/releases/tag/1.0.19) (2018-11-21)

## [1.0.16](https://github.com/ioFog/Controller/releases/tag/1.0.16) (2018-11-21)

## [1.0.15](https://github.com/ioFog/Controller/releases/tag/1.0.15) (2018-11-19)

## [1.0.14](https://github.com/ioFog/Controller/releases/tag/1.0.14) (2018-11-14)

## [1.0.0](https://github.com/ioFog/Controller/releases/tag/1.0.0) (2018-10-30)


[v2.0.0-rc1]:   https://github.com/eclipse-iofog/helm/compare/v2.0.0-rc1..v2.0.0-beta2
[v2.0.0-beta2]: https://github.com/eclipse-iofog/helm/compare/v2.0.0-beta2..v2.0.0-beta
[v2.0.0-beta]:  https://github.com/eclipse-iofog/helm/compare/v2.0.0-beta..v2.0.0-alpha
[v2.0.0-alpha]: https://github.com/eclipse-iofog/helm/compare/v2.0.0-alpha..v1.3.0
[v1.2.1]: https://github.com/eclipse-iofog/helm/compare/v1.2.1..v1.1.1
[v1.1.1]: https://github.com/eclipse-iofog/helm/releases/tag/v1.1.1

# Controller v3.8 — architecture overview

**Audience:** Platform operators, integrators, and contributors  
**Release:** v3.8.0 · Node **24.x** · **Edgelet only** (no v3.7 legacy field agent)

Controller is the fleet control plane for ioFog / Datasance PoT. It orchestrates **Edgelet** nodes, deploys system microservices (router, NATS, controller), manages applications and workloads, issues certificates, and enforces RBAC for operator APIs.

---

## System context

```mermaid
flowchart TB
  subgraph operators [Operators]
    Console[EdgeOps Console SPA]
    CLI[potctl / iofogctl / iofog-controller CLI]
  end

  subgraph controller [Controller container]
    API["REST + WebSocket API :51121"]
    ConsoleSrv["EdgeOps Console static :8008"]
    DB[(sqlite / mysql / postgres)]
    API --> DB
  end

  subgraph edge [Edge nodes]
    EL[Edgelet field agent]
    MS[Microservices: router, NATS, controller, workloads]
    EL --> MS
  end

  Console -->|Bearer JWT / OAuth BFF| API
  CLI -->|Bearer JWT or password login| API
  EL -->|Fog token /api/v3/agent/*| API
  MS -.->|Skupper-style bridge| MS
```

| Component | Role |
|-----------|------|
| **Controller API** | User RBAC routes (`/api/v3/*`), agent wire protocol (`/api/v3/agent/*`), embedded OIDC issuer (`/oidc` when `AUTH_MODE=embedded`) |
| **EdgeOps Console** | Static SPA served from `EDGEOPS_CONSOLE_PATH`; reads `controller-config.js` written at startup |
| **Edgelet** | Edge runtime and field agent; polls Controller for config, microservices, and change flags |
| **System microservices** | **router** (Skupper-style messaging), **NATS** (MQTT leaf), **controller** (remote ControlPlane on system fogs) — deployed on agents by Edgelet |

**Distribution:** container images only (`ghcr.io/eclipse-iofog/controller`, `ghcr.io/datasance/controller`). Same source tree on both mirrors; CI differs by `IMAGE_REGISTRY` only.

---

## Runtime layout

| Listener | Default port | Env override | Purpose |
|----------|--------------|--------------|---------|
| API | **51121** | `API_PORT` | REST, WebSocket exec/logs, OIDC routes |
| EdgeOps Console | **8008** | `CONSOLE_PORT` | Static operator UI |

Startup sequence (`src/init.js` → `src/server.js`):

1. Load config and OpenTelemetry.
2. Initialize vault (optional) and database.
3. Ensure central router/NATS local CAs.
4. Bootstrap embedded OIDC admin (embedded mode).
5. Register all routes from `src/routes/` and background jobs from `src/jobs/`.
6. Write `EDGEOPS_CONSOLE_PATH/controller-config.js` for the Console SPA.
7. Listen on API and Console ports (HTTP or TLS).

---

## Source modules

| Module | Path | Responsibility |
|--------|------|----------------|
| **Server** | `src/server.js`, `src/init.js`, `src/daemon.js` | Process entry, dual HTTP servers, middleware order, job scheduler |
| **Routes** | `src/routes/*.js` | Declarative HTTP/WebSocket route table (method, path, middleware) |
| **Controllers** | `src/controllers/*.js` | Thin handlers: validate input, call services, shape responses |
| **Services** | `src/services/*.js` | Business logic, change tracking, orchestration |
| **Schemas** | `src/schemas/*.js` | Request/response validation |
| **Data layer** | `src/data/models/`, `managers/`, `migrations/`, `seeders/` | Sequelize persistence (sqlite, mysql, postgres) |
| **Config** | `src/config/` | `config.yaml`, env mapping, OIDC, RBAC resource map, flavor |
| **RBAC** | `src/lib/rbac/`, `src/config/rbac-resources.yaml` | JWT subject extraction, route authorization |
| **Auth** | `src/config/oidc.js`, `src/services/auth-*` | Embedded/external OIDC, BFF, MFA, sessions |
| **Agent API** | `src/routes/agent.js`, `src/services/agent-service.js` | Edgelet field-agent wire protocol (fog token auth) |
| **WebSocket** | `src/websocket/` | Microservice exec and log streaming |
| **Jobs** | `src/jobs/*.js` | Periodic maintenance (status, tokens, NATS reconcile, cleanup) |
| **Certificates** | `src/services/certificate-service.js` | PKI for router/NATS and agent certs |
| **CLI** | `src/cli/` | `iofog-controller` administrative commands |
| **Vault** | `src/vault/` | Optional external secret backends |
| **API spec** | `docs/swagger.yaml` | Canonical OpenAPI for `/api/v3/*` |

---

## API surfaces

Controller exposes two authentication models on the same API port.

### Operator API (OIDC Bearer + RBAC)

Used by EdgeOps Console, `potctl`, `iofogctl`, and automation.

| Area | Route prefix | Notes |
|------|--------------|-------|
| Status & architectures | `/api/v3/status`, `/api/v3/architectures/` | Public status; architecture catalog |
| Agents (ioFog) | `/api/v3/iofog` | Provision keys, agent CRUD, config |
| Applications | `/api/v3/application` | Replaces legacy `/api/v3/flow` |
| Microservices & catalog | `/api/v3/microservices`, `/api/v3/catalog` | Multi-arch `images[]`, service accounts |
| Networking | `/api/v3/router`, `/api/v3/nats`, `/api/v3/tunnel`, `/api/v3/service` | Router/NATS config, TCP bridge |
| RBAC | `/api/v3/roles`, `/api/v3/rolebindings`, … | Kubernetes-style roles |
| Auth & users | `/api/v3/user`, `/api/v3/auth` | Login, OAuth BFF, profile, JWKS rotation |
| Secrets & config | `/api/v3/secret`, `/api/v3/configMap`, `/api/v3/registries` | Fleet configuration |
| Certificates | `/api/v3/certificate` | PKI operations |
| WebSocket | `ws` routes in `src/routes/` | Exec and logs (Bearer token) |

Browser login uses the OAuth BFF (`GET /api/v3/user/oauth/authorize`); CLI uses `POST /api/v3/user/login`. See [oidc-configuration.md](oidc-configuration.md), [external-oidc-client-setup.md](external-oidc-client-setup.md), and [rbac-reference.md](rbac-reference.md).

### Agent API (fog token — no OIDC)

Used by **Edgelet field agents** only. Paths under `/api/v3/agent/*` authenticate with the agent provisioning token, not user JWTs.

| Command family | Examples | Purpose |
|----------------|----------|---------|
| Lifecycle | `POST /agent/provision`, `PUT /agent/status` | Register agent, heartbeat |
| Config | `GET/PATCH /agent/config` | Pull/push agent configuration |
| Workloads | `GET /agent/microservices`, `GET /agent/changes` | Reconcile microservices and change flags |
| ControlPlane | `POST /agent/controller/register` | System fog registers controller MS |
| Supporting | `GET /agent/version`, `GET /agent/volumeMounts`, registries, logs | OTA, mounts, diagnostics |

Full request/response shapes: **`docs/swagger.yaml`** (agent paths).

---

## Background jobs

| Job | File | Role |
|-----|------|------|
| Fog status | `fog-status-job.js` | Mark agents offline when status pings lapse |
| Controller heartbeat | `controller-heartbeat-job.js` | Control-plane liveness |
| Fog token cleanup | `fog-token-cleanup-job.js` | Expire stale agent tokens |
| Controller cleanup | `controller-cleanup-job.js` | Orphaned controller MS housekeeping |
| Event cleanup | `event-cleanup-job.js` | Audit event retention |
| NATS reconcile | `nats-reconcile-worker-job.js` | NATS operator sync |
| Platform reconcile | `platform-reconcile-worker-job.js` | Fog + service platform claim/reconcile (one job, two queues) |
| Fog platform sweep | `fog-platform-sweep-job.js` | Drift detection; re-enqueue stale fog/service tasks |
| Stopped app status | `stopped-app-status-job.js` | Application state maintenance |

### Platform reconcile (fog + service + resolver)

Router/NATS **fog platform lifecycle**, **service endpoint provisioning**, and the existing **NATS resolver** layer are three separate reconcile queues — not fire-and-forget `setImmediate` blocks in `iofog-service.js` / `services-service.js`.

```mermaid
flowchart TB
  subgraph api [Synchronous API]
    FogAPI[POST/PATCH/DELETE /iofog]
    SvcAPI[POST/PATCH/DELETE /services + yaml]
    FogAPI --> FSpec[Upsert FogPlatformSpecs]
    SvcAPI --> SDB[Write Services + tags]
    FSpec --> FEnqueue[FogPlatformReconcileTasks]
    SDB --> SEnqueue[ServicePlatformReconcileTasks]
  end

  subgraph worker [One job — any Controller replica]
    ClaimF[claimNextFogTask]
    ClaimS[claimNextServiceTask]
    ReconcileF[FogPlatformService.reconcileFog]
    ReconcileS[ServicePlatformService.reconcileService]
    HubLock[Hub ConfigMap lock]
    ClaimF --> ReconcileF
    ClaimS --> HubLock
    HubLock --> ReconcileS
  end

  subgraph runtime [Observed state]
    Routers[(Routers)]
    Nats[(NatsInstances)]
    MS[System MS + secrets]
    K8sSvc[K8s Service]
    CM[ConfigMap iofog-router]
  end

  subgraph resolver [NATS resolver — unchanged]
    NRT[NatsReconcileTasks]
  end

  FEnqueue --> ClaimF
  SEnqueue --> ClaimS
  ReconcileF --> Routers
  ReconcileF --> Nats
  ReconcileF --> MS
  ReconcileS --> CM
  ReconcileS --> K8sSvc
  ReconcileS -->|fan-out service-changed| FEnqueue
  ReconcileF -->|topology change| NRT
```

| Layer | Table | Worker | Purpose |
|-------|-------|--------|---------|
| **Fog platform** | `FogPlatformReconcileTasks` | Same job: `claimNextFogTask` | Router/NATS instances, PKI, system MS, **full recompute** of service-derived TCP bridges per fog |
| **Service platform** | `ServicePlatformReconcileTasks` | Same job: `claimNextServiceTask` | Hub connector/listener, K8s Service, ConfigMap (DB lock), fan-out fog tasks on tag change |
| **NATS resolver** | `NatsReconcileTasks` | `nats-reconcile-worker-job.js` | JWT bundles, account/user creds after app deploy |

**Fog operator API:** `GET /iofog/{uuid}` includes optional **`platformStatus`** (`phase`, `generation`, `lastError`); list/get derive `routerMode`/`natsMode` from **`FogPlatformSpecs`** when runtime rows are pending. **`POST /iofog/{uuid}/reconcile`** for manual retry.

**Service operator API:** JSON + YAML create/update/delete enqueue service reconcile; **`provisioningStatus=ready`** marks hub complete (K8s Service + hub ConfigMap); edge listeners converge via fog fan-out. **`POST /services/{name}/reconcile`** for manual retry.

Full spec: [`.cursor/controllerv3.8/docs/15-fog-platform-reconcile.md`](../.cursor/controllerv3.8/docs/15-fog-platform-reconcile.md) · RFC R69–R79.

---

## WebSocket exec & log sessions

Interactive **exec** and **log streaming** use paired WebSocket sessions between operators (Bearer JWT), Controller, and Edgelet agents (fog token). Plan 16 hardens lifecycle, quotas, multi-replica HA relay, and observability — **without changing the Edgelet wire protocol**.

```mermaid
sequenceDiagram
  participant U as User WS
  participant C as Controller replica
  participant DB as Database
  participant Q as AMQP Router
  participant A as Agent WS

  Note over U,A: Exec (R80–R81, R84)
  U->>C: WS exec (RBAC)
  A->>C: WS agent/exec + execId
  C->>C: Pair SessionManager
  C->>Q: Enable agent-{execId} user-{execId}
  U->>C: STDIN
  C->>Q->>A: or direct WS same replica
  A->>C: STDOUT
  C->>Q->>U: relay
  U-->>C: close
  C->>DB: execEnabled=false INACTIVE

  Note over U,A: Logs (R82–R83, R84)
  U->>C: WS logs + tail params
  C->>DB: PENDING sessionId
  A->>C: WS agent/logs/:sessionId
  A->>C: LOG_LINE
  C->>Q->>U: logs-user-{sessionId}
```

| Topic | Normative value (RFC R80–R91) |
|-------|-------------------------------|
| Exec lifecycle | **exec_b** — WS close sets `execEnabled=false`; **1** user exec WS per microservice |
| Exec timeouts | **60s** pending for agent; **8h** max active session |
| Log concurrency | **3** user log WS per microservice (or per fog for node logs) |
| Log limits | Tail max **5,000** lines; **120s** pending; **2h** idle |
| Log content | Live relay only — no log line persistence; audit connect/disconnect |
| HA relay | Cross-replica sessions **require** AMQP (`WebSocketQueueService`); same-replica may use direct WS; **fail fast** when router down |
| Graceful drain | **30s** on SIGTERM / k8s `preStop` — CLOSE frames, queue cleanup, DB status update |
| Security | Agent handlers validate fog token **before** message processing; **50** upgrades/min/IP; **100** active WS/IP; JWT in `?token=` (ingress log redaction required) |
| Scale SLO | **500** concurrent WS per replica; **p99 pairing < 5s** |
| Observability | OpenTelemetry: active/pending sessions, pairing latency, AMQP failures, router connectivity |

**OTEL metric names (R87):** `ws_exec_sessions_active`, `ws_log_sessions_active`, `ws_pending_pairings`, `ws_pairing_duration_ms` (histogram), `ws_amqp_publish_errors`, `ws_router_connected` (gauge). Emitted when `ENABLE_TELEMETRY=true`; see `src/websocket/ws-metrics.js`.

**HA config (`server.webSocket.ha`):** `crossReplicaRequiresAmqp` (default `true`), `failFastOnRouterUnavailable` (default `true`). Env: `WS_HA_CROSS_REPLICA_REQUIRES_AMQP`, `WS_HA_FAIL_FAST_ON_ROUTER_UNAVAILABLE`. Graceful drain timeout: `server.webSocket.session.drainTimeoutMs` (default **30s**, env `WS_DRAIN_TIMEOUT_MS`).

**Core modules:** `src/websocket/server.js`, `session-manager.js`, `log-session-manager.js`, `src/services/websocket-queue-service.js`, `src/services/router-connection-service.js`.

**Operator guide:** [operations/ws-sessions.md](operations/ws-sessions.md) — ingress `?token=` log redaction, HTTPS/WSS, multi-replica AMQP requirement, k8s preStop drain, load SLO probe.

Full spec: [`.cursor/controllerv3.8/docs/16-ws-exec-log-hardening.md`](../.cursor/controllerv3.8/docs/16-ws-exec-log-hardening.md) · RFC R80–R91 · Edgelet contract: [edgelet-invariants.md §10](../.cursor/controllerv3.8/docs/edgelet-invariants.md).

---

## Edgelet agent contract (summary)

Controller v3.8 and Edgelet share a **frozen field-agent REST contract** on `/api/v3/agent/*`. The same release train must be deployed together (e.g. Controller `v3.8.0` + Edgelet `v1.0.0-rc.1`). Edgelet maintains the authoritative wire spec; Controller implements the server side.

**Greenfield rules**

- **Edgelet only** — v3.7 legacy field agents are unsupported.
- No read aliases for removed fields (`dockerUrl`, `fogType`, `messageSpeed`, etc.).
- Agent auth stays on **fog tokens**; OIDC applies to user routes only.

**Provision** — `POST /api/v3/agent/provision`

| Field | Semantics |
|-------|-----------|
| `key` | Provisioning key |
| `type` | Architecture code 0–4 (`archId`: auto, amd64, arm64, riscv64, arm) |
| `engine` | `edgelet` \| `docker` \| `podman` → stored as `containerEngine` |

**Config pull** (`GET config`) — must return `containerEngineUrl`, `pruningFrequency`, `watchdogEnabled`, and fleet keys Edgelet expects. Do **not** return `dockerUrl` or `dockerPruningFrequency`.

**Config push** (`PATCH config`) — Edgelet pushes agent-local overrides using canonical keys (`containerEngineUrl`, `pruningFrequency`, `networkInterface`, …).

**Status** (`PUT status`) — required keys include `daemonStatus`, resource usage, `microserviceStatus`, `version`, `tunnelStatus`, and v3.8 additions:

| Added (v3.8) | Removed (v3.8) |
|--------------|----------------|
| `availableRuntimes` | `processedMessages` |
| `runtimeAgentPhase` (optional) | `messageSpeed` |
| `controlPlaneQuiesced` (optional) | `microserviceMessageCounts` (do not persist) |

**Change flags** — unchanged names: `deleteNode`, `reboot`, `config`, `version`, `registries`, `prune`, `volumeMounts`, `microserviceConfig`, `microserviceList`, `execSessions`, `tunnel`, `microserviceLogs`, `fogLogs`.

**Microservice list** (`GET microservices`) — each entry includes derived flags `isRouter`, `isNats`, and DB-backed **`isController`** for the system controller microservice.

**Controller MS register** — `POST /api/v3/agent/controller/register` (system fogs only, beta.1+ Edgelet):

- Auth: agent fog token; `fog.isSystem === true`.
- Body: Edgelet-generated `uuid`, `images[]`, `registryId`, optional `ports`, `env`, `volumeMappings`.
- Server upserts MS with `isController: true` in application `system-{fogName}`; returns `{ "uuid": "..." }`.
- User `DELETE` / `PATCH` on controller MS → **403** / **400**; operator system PATCH allowed.

**Volume mounts** — `GET volumeMounts` returns bind/volume shapes plus system-injected immutable `serviceAccount` entries.

**Service account RBAC** — microservice roles use apiGroup **`edgelet.iofog.org/v1`**; SA/role changes trigger `microserviceList` change tracking.

For the full bilateral contract (including ControlPlane env vars and verification references), see Edgelet documentation:

- [Edgelet README / docs](https://github.com/eclipse-iofog/edgelet/blob/main/docs/edgelet/README.md)
- Edgelet mirror of this contract: `controller-invariants.md` in the [eclipse-iofog/edgelet](https://github.com/eclipse-iofog/edgelet) repository

---

## Data and PKI

| Topic | v3.8 behavior |
|-------|---------------|
| **Database** | Greenfield v3.8.0 schema — **new install only** (no v3.7 migrator). Supports **sqlite** (single-controller production), **mysql**, and **postgres** (multi-replica / HA). |

### SQLite single-node production

Small deployments with **one Controller process** may use SQLite as the production database (embedded OIDC requires a single replica in this profile).

| Topic | Behavior |
|-------|----------|
| **When to use** | Single Controller, no DB HA requirement, edge/small-cluster PoT |
| **Concurrency** | WAL journal mode + `busy_timeout` pragmas on connect; connection pool size 1 |
| **Background jobs** | Reconcile-heavy jobs start after a configurable delay (`settings.jobStartupDelaySeconds`, default 3s) and stagger by 500ms to avoid restart lock bursts |
| **Task claims** | Fog/service/NATS reconcile task claims retry on `SQLITE_BUSY` (same retry budget as `TransactionDecorator`) |
| **Persistence** | Mount a persistent volume for `controller_db.sqlite` and WAL sidecar files (`-wal`, `-shm`) |
| **Backup** | Use SQLite backup API or copy DB + WAL files during a quiet window |
| **HA path** | mysql/postgres + multiple Controller replicas — see [oidc-configuration.md](oidc-configuration.md) |
| **Applications** | Table `Applications` (was `Flows`); API identity by **name** string. |
| **Architectures** | Table `Architectures` (was `FogTypes`); `archId` 0–4. |
| **PKI** | Central **default-router-local-ca** and **default-nats-local-ca** for all new agents; no per-agent local CAs on provision (greenfield — no v3.7 PKI migration job). See [pki.md](pki.md). |
| **TCP bridge** | Connector `host` depends on target agent **router mode** and service type. **Router required** (`routerMode` ≠ `none`) for `microservice` and `agent` services. **Interior** router: `127.0.0.1` (router runs host-network; bridge is reached via localhost). **Edge** router: `edgelet.default.svc.bridge.local` for host-network microservices and `agent` services; `{appName}.{microserviceName}` for pod-network microservices. Reserved ports **54321**, **54322**, **53**. |

---

## Authentication modes

| Mode | When | Issuer |
|------|------|--------|
| **Embedded** | `AUTH_MODE=embedded` | In-process OIDC at `{CONTROLLER_PUBLIC_URL}/oidc` |
| **External** | `AUTH_MODE=external` | Third-party IdP via `OIDC_ISSUER_URL` |

Embedded mode bootstraps an admin from `OIDC_BOOTSTRAP_ADMIN_*` env vars on first start. External mode uses the OAuth BFF for browser login; CLI retains password + TOTP via `POST /api/v3/user/login`. Full env reference: [oidc-configuration.md](oidc-configuration.md).

Agent routes and WebSocket exec/logs for agents are **outside** OIDC — see [rbac-reference.md](rbac-reference.md) for which user routes are public or agent-scoped.

---

## Related operator docs

| Document | Topic |
|----------|-------|
| [README.md](../README.md) | Install, quick start, Edgelet pin |
| [CHANGELOG.md](../CHANGELOG.md) | v3.8.0 breaking changes |
| [swagger.yaml](swagger.yaml) | HTTP API reference |
| [rbac-reference.md](rbac-reference.md) | Roles, bindings, route map |
| [pki.md](pki.md) | Central CAs, cert renewal, NATS operator rotation |
| [oidc-configuration.md](oidc-configuration.md) | Embedded/external auth modes and env vars |
| [external-oidc-client-setup.md](external-oidc-client-setup.md) | External IdP client configuration |
| [CONTRIBUTING](../CONTRIBUTING) | Dual-mirror CI and development |

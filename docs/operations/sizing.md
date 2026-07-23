# Controller — sizing and hardware requirements

**Audience:** Platform operators planning production or test deployments  
**Release:** v3.8.0 · Node **24.x** · Edgelet only

This guide sizes the **Controller platform** by **edge (fog) node count**: Controller application, database, **hub networking** (Skupper Router + NATS), **load balancer / ingress**, and **per-edge** system microservices. Numbers assume the workload profile in [Assumptions](#assumptions). Validate on staging with the [load probes](#validation) at your target fleet size before production.

Related: [architecture.md](../architecture.md) · [database-transactions.md](database-transactions.md) · [ws-sessions.md](ws-sessions.md) · [oidc-configuration.md](../oidc-configuration.md)

---

## Platform layers

Size four layers independently, then sum for host or cluster totals:

| Layer | Components | Remote CP | Kubernetes CP |
|-------|------------|-----------|---------------|
| **A — Application** | Controller MS / pods, PostgreSQL | External DB + Controller on system fogs | In-cluster Deployment + Postgres |
| **B — Hub networking** | Interior Skupper Router, NATS **server** (hub) | On **each system fog** (interior + server by default) | In-cluster hub Router (`iofog-router`) + NATS StatefulSet (`nats`) |
| **C — Edge (per fog)** | Edgelet, **edge** Router, **leaf** NATS, user MS | Every edge node | Every edge node |
| **D — Load balancer** | L7 LB / ingress for Controller HA | **Required** when ≥ 2 Controllers | **Required** when ≥ 2 Controller replicas |

**Networking mode defaults:**

| Fog type | `routerMode` | `natsMode` |
|----------|--------------|------------|
| **System fog** (Remote CP) | **interior** | **server** |
| **Edge fog** | **edge** | **leaf** |

On **Remote CP**, the first provisioned fog is promoted to a system fog with interior router and NATS server. System fogs hosting HA Controller instances run **Edgelet + interior Router + NATS server + Controller MS** by default. Controller enforces `routerMode=interior` and `natsMode=server` on system fogs.

On **Kubernetes CP**, manual `isSystem` fogs are not created; the **default hub** Router and NATS deploy **in-cluster** (not on edge nodes). Edge fogs still run edge router + leaf NATS.

**External references for hub sizing:**

- Skupper Router: [Skupper sizing guide](https://skupper.io/docs/troubleshooting/index.html) — scale **CPU vertically**; memory scales with concurrent connections.
- NATS server / JetStream: [NATS hardware requirements](https://docs.nats.io/running-a-nats-service/introduction/installation) — production hub: **≥ 4 CPU / ≥ 8 Gi** baseline; use fast SSD for JetStream file store.

Controller NATS JetStream **config defaults** (not container RAM): `jsMemoryStoreSize=1g`, `jsStorageSize=10g` (`src/services/nats-service.js`). Container memory and disk must exceed these limits plus connection overhead.

---

## Assumptions

| Parameter | Value |
|-----------|--------|
| Agent **status** interval | **10 s** — per-fog `statusFrequency` |
| Agent **changes** poll interval | **10 s** — per-fog `changeFrequency` |
| Controller offline-detection job | **10 s** — `FOG_STATUS_UPDATE_INTERVAL`; tolerance **3** → offline after ~**30 s** without status |
| Concurrent operators (Console / CLI / API) | **10** |
| Applications per cluster | **~12** (varies) |
| Microservices per edge node | **5–7** (use **6** in formulas below) |
| Deploy / reconcile churn | **Low** — steady-state agent poll dominates |
| WebSocket ceiling | **500** concurrent exec + log sessions **per Controller replica** (normative) |
| WS relay (multi-replica HA) | **NATS Core** — `NATS_ENABLED=true` |
| Database (production) | **PostgreSQL** preferred; **MySQL** equivalent tiers |
| Production HA | **≥ 2 Controller replicas / instances** always |
| **Multi-Controller LB** | **Layer-7 load balancer or ingress** fronting **51121** (API/WSS) and **8008** (Console) — **Remote CP and K8s CP** |
| Remote ControlPlane | External DB + **≥ 2 Controllers** on **≥ 2 system fogs** from day one |
| Auth modes | Embedded OIDC and external IdP — **no sizing delta** |
| Vault | Optional (customer choice) — minor post-commit I/O; no separate tier |
| Edgelet baseline | **150–200 MiB** per node (field agent + embedded runtime) |

---

## Load and connection model

### Agent API load

Each Edgelet generates at minimum, every **10 s**:

| Call | Work |
|------|------|
| `PUT /api/v3/agent/status` | Interactive DB write |
| `GET /api/v3/agent/changes` | Interactive DB read (+ token activity) |

```
agent_txn/s  ≈  fogs × 2 / 10  =  0.2 × fogs
```

| Edge nodes | Agent txn/s | Reference |
|------------|-------------|-----------|
| 50 | 10 | ≈ Plan 19 load gate (200 fogs @ 40 s poll) |
| 100 | 20 | 2× gate |
| 200 | 40 | 4× gate |
| 500 | 100 | 10× gate |
| 1000 | 200 | 20× gate |

**Fleet microservices** (at 6 MS / node): `fogs × 6` (300 @ 50 … 6 000 @ 1000).

### Hub connection estimates

Use for NATS hub and Skupper interior router sizing:

```
hub_skupper_links   ≈  edge_fogs_with_router        # typically all edge fogs
hub_nats_leaf_conns ≈  edge_fogs_with_nats_leaf
                    +  controller_instances
                    +  interior_routers_on_system_fogs
```

| Edge nodes | ~NATS leaf connections to hub | ~Skupper inter-site links |
|------------|------------------------------|---------------------------|
| 50 | ~52 | ~50 |
| 200 | ~203 | ~200 |
| 1000 | ~1006 | ~1000 |

### Load balancer traffic

Agent poll is small and keep-alive friendly; LB sizing is driven by **concurrent WebSocket connections** and **TLS**, not bandwidth.

```
API req/s (steady)  ≈  0.2 × fogs        # e.g. 200 req/s @ 1000 fogs
Peak WS conns       ≈  min(usage, controller_instances × 500)
```

| Edge nodes | Steady API req/s | Approx API bandwidth |
|------------|------------------|----------------------|
| 50 | ~10 | < 1 Mbps |
| 200 | ~40 | 1–3 Mbps |
| 1000 | ~200 | 5–15 Mbps |

---

## Service level objectives

| Metric | Target |
|--------|--------|
| Agent poll p99 | **< 200 ms** |
| Operator REST p99 | **< 1 s** |
| WebSocket pairing p99 | **< 5 s** |
| Concurrent WS per replica | **500** (`WS_REPLICA_MAX_CONCURRENT_WS`) |

Re-run load probes at **10 s** poll before production (`--poll-interval-ms=10000`). The repo default gate uses 40 s.

---

## Database and HA policy

| Profile | SQLite | PostgreSQL / MySQL | Controller instances |
|---------|--------|--------------------|----------------------|
| **Test (50 nodes)** | Allowed (1 instance) | **Recommended** | 1 OK; **recommend 2** |
| **Production (all tiers)** | **Not recommended** | **Required** | **≥ 2** |
| **Remote CP (all tiers)** | **Not recommended** | **Required from start** | **≥ 2** on **≥ 2 system fogs** |
| **200+ fogs @ 10 s poll** | No | Required | **≥ 3** |
| **500+ fogs** | No | Dedicated instance | **≥ 4** |
| **1000 fogs** | No | Large dedicated instance | **≥ 6**; **prefer Kubernetes CP** |

**Multi-instance requirements:**

- Shared **PostgreSQL** or **MySQL** (sqlite does not support multi-replica).
- **`NATS_ENABLED=true`** on all Controller instances; platform NATS hub reachable.
- **`AUTH_SESSION_STORE_TYPE=database`** when external OIDC + HA.
- **Load balancer / ingress** in front of all Controller instances (see [Load balancer / ingress](#load-balancer--ingress)).

**Connection pool:** default `database.postgres.pool.max: 10` per instance. At **500+ fogs** with **4+ instances**, raise to **15–20** per instance; size PostgreSQL for **~80–120** connections.

---

## Load balancer / ingress

**Required** whenever **≥ 2 Controller instances** run (Remote CP system fogs or Kubernetes Deployment replicas).

| Listener | Port | Protocol | Backend |
|----------|------|----------|---------|
| **API** | **51121** | HTTPS / **WSS** | All Controller instances |
| **Console** | **80** | HTTPS | All Controller instances |

**Environment:**

```text
CONTROLLER_PUBLIC_URL=https://controller.example.com
CONSOLE_URL=https://console.example.com          # same LB (vhost) or separate
TRUST_PROXY=true                                 # TLS terminates at LB
```

**Operational requirements:**

- Support **WebSocket upgrade** and long-lived connections (exec up to **8 h**, logs **2 h** idle; Controller WS ping every **30 s**).
- Health check backends with **`GET /api/v3/status`** (readiness semantics).
- **Redact `?token=`** from LB access logs ([ws-sessions.md](ws-sessions.md)).
- Sticky sessions **optional** — cross-replica exec/log uses **NATS relay**.
- Align drain with Controller **`WS_DRAIN_TIMEOUT_MS=30000`** and pod **`terminationGracePeriodSeconds: 45`** on Kubernetes.

### LB sizing (Remote CP and Kubernetes CP)

| Edge nodes | Deployment | CPU (total) | RAM (total) | Concurrent conn budget |
|------------|------------|-------------|-------------|-------------------------|
| **Test 50** | 1 LB / ingress replica | 1 vCPU | 512 Mi – 1 Gi | 500+ |
| **50–100 prod** | **2** LB instances (HA) or managed L7 LB | 2 vCPU | 1–2 Gi | 2 000+ |
| **200 prod** | 2 instances / managed LB | 2–4 vCPU | 2 Gi | 5 000+ |
| **500 prod** | 2–3 ingress replicas or scaled managed LB | 4 vCPU | 4 Gi | 10 000+ |
| **1000 prod** | 3 ingress replicas or regional LB | 4–8 vCPU | 4–8 Gi | 20 000+ |

**Remote CP options:** nginx or HAProxy VM pair with keepalived VIP; hardware LB with SSL offload; cloud L7 LB when system fogs are cloud-hosted.

**Kubernetes CP options:** ingress controller (nginx, traefik, …) — **2 replicas** minimum at **500m–1 vCPU / 512 Mi–1 Gi** each for 50–200 fogs; **1–2 vCPU / 1–2 Gi** each at 500–1000 fogs — optionally with cloud LB in front.

---

## Kubernetes Control Plane — production

Controller runs in-cluster (`CONTROL_PLANE=Kubernetes`). Hub Router and NATS deploy **in the cluster**, not on edge fogs. Edge fogs run **edge** router + **leaf** NATS only.

### Full stack summary

| Edge nodes | Controller replicas | Controller (CPU/RAM/replica) | Controller PVC | Hub  Router | Hub NATS  | PostgreSQL | LB / ingress |
|------------|--------------------|---------------------------------|------------------|--------------------|-----------------------|------------|--------------|
| **50** | 2 | 1→2 vCPU / 2→4 Gi | 20 Gi | 2 vCPU / 2 Gi | 2 vCPU / 4 Gi / **20 Gi SSD** | 2 vCPU / 4 Gi / 50 Gi | 2 vCPU / 1–2 Gi |
| **100** | 2 | 2→4 vCPU / 4→6 Gi | 20 Gi | 2 vCPU / 2 Gi | 4 vCPU / 8 Gi / **50 Gi SSD** | 4 vCPU / 8 Gi / 100 Gi | 2 vCPU / 1–2 Gi |
| **200** | 3 | 2→4 vCPU / 4→8 Gi | 30 Gi | 4 vCPU / 4 Gi | 4 vCPU / 8 Gi / **50 Gi SSD** | 4 vCPU / 16 Gi / 150 Gi | 2–4 vCPU / 2 Gi |
| **500** | 4 | 4→8 vCPU / 8→12 Gi | 30 Gi | 4 vCPU / 4 Gi | 8 vCPU / 16 Gi / **100 Gi SSD** | 8 vCPU / 32 Gi / 300 Gi | 4 vCPU / 4 Gi |
| **1000** | 6 | 4→8 vCPU / 8→16 Gi | 50 Gi | 4–8 vCPU / 4–8 Gi | 8–16 vCPU / 16–32 Gi / **200 Gi SSD** | 16 vCPU / 64 Gi / 500 Gi | 4–8 vCPU / 4–8 Gi |

MySQL tiers match PostgreSQL. Hub NATS: set **`GOMEMLIMIT`** to ~80–90% of container memory limit. At **500+ fogs**, evaluate NATS JetStream **3-node** cluster for hub HA.

**Kubernetes operational notes:**

- Probes: liveness `GET /api/v3/live`, readiness `GET /api/v3/status`.
- Hub NATS Service: `nats-server.{namespace}.svc.cluster.local`; hub Router: `router.{namespace}.svc.cluster.local`.
- Graceful WS drain: `terminationGracePeriodSeconds: 45`, `WS_DRAIN_TIMEOUT_MS=30000`.

---

## Remote Control Plane — production

Controller runs as a **system microservice** on **system fogs** (`CONTROL_PLANE=Remote`). Each system fog in an HA pair runs **Edgelet + interior Router + NATS server + Controller MS** by default. Edge fogs connect to hub router/NATS on system fogs via the Skupper mesh.

Place a **load balancer VIP** in front of all Controller instances (`CONTROLLER_PUBLIC_URL`). Edge agents and operators reach Controller through the LB, not individual system fog IPs.

### Controller + database

Use the **Controller replicas** and **PostgreSQL** columns from the [Kubernetes CP table](#full-stack-summary). Deploy **≥ 2 Controller instances** on **≥ 2 system fogs**. External PostgreSQL from day one.

### System fog host — component breakdown

Resources **per system fog** (each HA member runs the full system stack):

| Edge nodes (fleet) | System fogs | Edgelet | Interior Router | NATS server | Controller MS | OS buffer | **Host total** |
|--------------------|-------------|---------|-----------------|-------------|---------------|-----------|----------------|
| **50–100** | 2 | 200 Mi | 2 vCPU / 2 Gi | 2 vCPU / 4 Gi / 20 Gi disk | 1→2 vCPU / 2→4 Gi | 1 Gi | **~6 vCPU / ~9 Gi** + disk |
| **200** | 2–3 | 200 Mi | 4 vCPU / 4 Gi | 4 vCPU / 8 Gi / 50 Gi disk | 2→4 vCPU / 4→8 Gi | 2 Gi | **~12 vCPU / ~18 Gi** + disk |
| **500** | 3–4 | 200 Mi | 4 vCPU / 4 Gi | 8 vCPU / 16 Gi / 100 Gi disk | 4 vCPU / 8 Gi | 2 Gi | **~18 vCPU / ~30 Gi** + disk |
| **1000** | 4–6 | 200 Mi | 4–8 vCPU / 4–8 Gi | 8–16 vCPU / 16–32 Gi / 200 Gi disk | 4–8 vCPU / 8–16 Gi | 2 Gi | **Prefer K8s CP** |

**Notes:**

- One NATS instance is marked **`isHub=true`** in Controller; additional system fogs may run server-mode NATS as cluster peers — size disk on the primary hub fog per table; peers may share or replicate JetStream storage per your NATS topology.
- Skupper interior router: prefer **vertical CPU** scale (2→4 vCPU) over many hub routers; at most **2 interior routers per site** for availability ([Skupper deployment guidance](https://skupper.io/docs/kubernetes/deployment-concerns.html)).
- **Plus cluster-wide:** PostgreSQL (table above) + [LB / ingress](#lb-sizing-remote-cp-and-kubernetes-cp).

**Network:** stable path from all edge nodes to **LB VIP** (API **51121**, Console **8008**) and to system fog hub router/NATS ports. Minimum **100 Mbps** aggregate; **1 Gbps** at **500+** nodes.

---

## Edge fog — per node

Every **edge** (non-system) fog runs:

| Component | Mode | CPU | RAM |
|-----------|------|-----|-----|
| **Edgelet** | — | (included in platform) | **150–200 MiB** |
| **Router MS** | **edge** | 0.5–1 vCPU | 512 Mi – 1 Gi |
| **NATS MS** | **leaf** | 0.25–0.5 vCPU | 256–512 Mi |
| **User microservices** | — | workload-specific | **5–7 MS** — size separately |

Edge router/NATS are lighter than hub components: one Skupper **edge** site and one NATS **leaf** upstream connection per fog. Use the lower end (0.25 vCPU / 256 Mi NATS leaf) only on severely constrained hardware.

---

## Test environment — 50 edge nodes

| Profile | Controller instances | Database | Controller (CPU/RAM) | PostgreSQL | LB |
|---------|---------------------|----------|----------------------|------------|-----|
| **Minimal** | 1 | SQLite (PV) | 1→2 vCPU / 1→2 Gi | — | Optional |
| **Recommended** | 2 | PostgreSQL | 1→2 vCPU / 2→4 Gi | 2 vCPU / 4 Gi / 50 Gi | 1–2 vCPU / 1 Gi |

Recommended profile: **`NATS_ENABLED=true`**, shared PostgreSQL, and LB in front of both Controller instances to match production HA patterns.

Hub networking on test Remote CP: one system fog may suffice for minimal test; recommended HA uses **2 system fogs** with interior router + NATS server on each.

---

## Storage

### Formulas

```
# PostgreSQL data volume
DB_Gi  =  5
       + (fogs × 0.02)
       + (fogs × ms_per_fog × 0.001)      # default ms_per_fog = 6
       + (apps × 0.05)                    # default apps = 12
       + 2

# Controller disk per instance
Controller_disk_Gi  =  10 + ceil(fogs / 100) × 5

# Hub NATS JetStream disk (primary hub)
NATS_hub_disk_Gi  =  max(20, ceil(fogs / 10))     # floor 20 Gi; 100 Gi @ 500 fogs; 200 Gi @ 1000

# Rotating Controller logs per instance
Log_max_Gi  =  1 Gi × 10  =  10 Gi
```

Round **DB_Gi** to table tiers (50 / 100 / 150 / 300 / 500 Gi). Hub NATS requires **fast SSD** (JetStream file store).

**Example — 200 fogs:** DB ≈ **13 Gi** → **150 Gi** tier; Controller PVC ≈ **20 Gi** → **30 Gi**; NATS hub disk ≈ **50 Gi**.

### Backup

- **PostgreSQL:** provider-native backup / PITR.
- **SQLite (test only):** DB + `-wal` / `-shm` together.
- **NATS JetStream:** backup hub volume per NATS ops guidance.

---

## Scaling triggers

| Signal | Action |
|--------|--------|
| Agent poll p99 **> 200 ms** sustained | +Controller instance or +PostgreSQL CPU |
| Operator REST p99 **> 1 s** | +Controller instance; check DB pool / IOPS |
| `db.write_queue.depth` **> 100** (5 min) | Scale PostgreSQL |
| Active WS **> 400 / instance** | +Controller instance |
| Hub NATS CPU saturated or leaf disconnects | Vertical scale hub NATS; check `jsMemoryStoreSize` / disk |
| Skupper hub latency / CPU high | Increase **interior router CPU** (vertical) |
| Fleet crosses **200** or **500** | Next tier (+instances, +hub NATS, +LB) |

Enable **`ENABLE_TELEMETRY=true`** for Controller metrics; monitor NATS and router at the platform layer separately.

---

## Configuration checklist

| Setting | Value | Where |
|---------|-------|-------|
| `statusFrequency` | **10** | Per fog (agent config) |
| `changeFrequency` | **10** | Per fog (agent config) |
| `FOG_STATUS_UPDATE_INTERVAL` | **10** | Controller env |
| `FOG_STATUS_UPDATE_TOLERANCE` | **3** | Controller env |
| `NATS_ENABLED` | **true** | All Controller instances |
| `DB_PROVIDER` | **postgres** (or **mysql**) | Production |
| `AUTH_SESSION_STORE_TYPE` | **database** | External OIDC + HA |
| `CONTROLLER_PUBLIC_URL` | HTTPS → **LB VIP** | Required |
| `CONSOLE_URL` | Console origin | Recommended |
| `TRUST_PROXY` | **true** | When TLS at LB |
| Hub `jsMemoryStoreSize` / `jsStorageSize` | Raise with fleet | NATS hub / fog platform spec |

System fogs: ensure **`routerMode=interior`**, **`natsMode=server`**. Edge fogs: **`edge`** + **`leaf`** (defaults).

---

## Validation

```bash
nvm use 24

node test/load/transaction-safety-load.js \
  --fogs=200 --poll-interval-ms=10000 --operators=10 --soak-minutes=30

node test/load/ws-pairing-load.js --pairs=500

RUN_INTEGRATION=1 npm run test:integration:first-fog   # sqlite single-instance only
```

For **500+ fogs**, run the transaction probe at `--fogs=500` or `--fogs=1000` on staging hardware matching the target tier. Validate hub NATS leaf connection count and Skupper link stability under soak.

---

## Quick reference

| Environment | Edge nodes | Stack |
|-------------|------------|-------|
| **Test (minimal)** | 50 | 1× Controller, SQLite |
| **Test (recommended)** | 50 | 2× Controller, Postgres, LB, NATS relay |
| **Prod K8s CP** | 50–1000 | Controller + Postgres + hub Router/NATS in-cluster + ingress |
| **Prod Remote CP** | 50–200 | 2+ system fogs (interior router + NATS server + Controller each) + Postgres + LB |
| **Prod Remote CP** | 500–1000 | Tier documented; **prefer K8s CP** |

---

## Related docs

| Document | Topic |
|----------|-------|
| [architecture.md](../architecture.md) | System context, SLOs, platform reconcile |
| [database-transactions.md](database-transactions.md) | SQLite queue, OTEL, troubleshooting |
| [ws-sessions.md](ws-sessions.md) | NATS relay, HA, LB log redaction |
| [oidc-configuration.md](../oidc-configuration.md) | Embedded and external auth |
| [pki.md](../pki.md) | Certificate and CA operations |

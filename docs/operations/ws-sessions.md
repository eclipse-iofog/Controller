# WebSocket exec & log sessions — operator guide

**Audience:** Platform operators running Controller in production  

---

## Overview

Controller exposes **interactive exec** and **log streaming** over WebSocket on the API port (default **51121**). Sessions pair an operator browser/CLI client (Bearer JWT) with an Edgelet agent (fog token). In multi-replica deployments, cross-replica relay uses a **relay backend** selected at startup by **`nats.enabled`** (Plan 18, R102): **AMQP** router queues when `false`, **NATS Core** on the platform hub when `true`.

---

## HTTPS and authentication

| Requirement | Detail |
|-------------|--------|
| **HTTPS-only WS** | Set `CONTROLLER_PUBLIC_URL` to `https://…` and terminate TLS at ingress or the Controller listener (`TLS_PATH_*`). WebSocket upgrades must use `wss://`. |
| **User auth** | Bearer JWT via `Authorization` header or `?token=` query param (browser Console). RBAC: `execSessions`, `logs`, `systemExecSessions`, `systemLogs`. |
| **Agent auth** | Fog token on `/api/v3/agent/exec/*` and `/api/v3/agent/logs/*` — OIDC does **not** apply to agent routes. |

> **Plan 17 (MS exec):** Open exec with **direct WebSocket** — `wss://…/api/v3/microservices/exec/:uuid` (app MS) or `…/system/exec/:uuid` (system MS). **No** `POST …/exec` before connect. Up to **5** concurrent exec sessions per microservice. Agent discovers sessions via `GET /api/v3/agent/exec/sessions` and connects `WS /api/v3/agent/exec/microservice/:uuid/:sessionId`. Fog node debug: `POST/DELETE /api/v3/iofog/:uuid/exec` provisions the debug system MS, then **`WS …/microservices/system/exec/:debugMsUuid`** (not the app exec path). Full spec: [17-multi-exec-sessions.md](../.cursor/controllerv3.8/docs/17-multi-exec-sessions.md).

### Ingress log redaction (required)

Browser clients pass JWT in the query string: `wss://controller.example.com/api/v3/microservices/{uuid}/logs?token=…`

**Configure ingress / reverse proxy access logs to redact `token` query parameters.** Example nginx:

```nginx
log_format ws_redacted '$remote_addr - [$time_local] "$request" $status '
                       '"$http_referer" "$http_user_agent"';
# Use map or custom log filter to strip ?token=… before writing logs.
```

Without redaction, long-lived bearer tokens may appear in load balancer logs.

---

## Multi-replica HA

Relay transport is selected **once at startup** from existing platform config — **no separate relay env var** (R102):

| `nats.enabled` | Cross-replica relay backend |
|----------------|----------------------------|
| `false` (default) | **AMQP** — Skupper-style router queues via `WebSocketQueueService` |
| `true` | **NATS Core** — hub pub/sub subjects `controller.relay.v1.*` via `NatsRelayTransport` |

Set `NATS_ENABLED=true` only when the platform NATS hub is deployed and all Controller replicas share the same value.

| Setting | Default | Env |
|---------|---------|-----|
| Cross-replica requires relay backend | `true` | `WS_HA_CROSS_REPLICA_REQUIRES_AMQP` |
| Fail fast when relay backend down | `true` | `WS_HA_FAIL_FAST_ON_ROUTER_UNAVAILABLE |

> Env names retain `AMQP`/`ROUTER` for backward compatibility; semantics apply to the **active relay backend** (AMQP or NATS) per R112.

### AMQP relay (`nats.enabled=false`)

1. Deploy the **router** system microservice and ensure Controller can reach AMQP (`RouterConnectionManager` pool).
2. Run **2+ Controller replicas** behind a load balancer with **sticky sessions optional** — cross-replica exec/log uses AMQP queues (`agent-{sessionId}`, `user-{sessionId}`, `logs-user-{sessionId}`).
3. When the router/AMQP backend is unavailable, new cross-replica sessions close with WebSocket code **1013** (`Router unavailable for cross-replica session`).

Plan 18 adds an **8-connection AMQP pool** per replica with overflow recovery — intense log streams must not poison other sessions (no router restart required). **Remote CP** resolves **`router.default.svc.bridge.local`** then default router `host`; **Kubernetes CP** resolves **`router.{namespace}.svc.cluster.local`** then default router `host`. Port from `Routers.messagingPort` (default **5671**).

### NATS relay (`nats.enabled=true`)

1. Platform NATS hub must be running with `NatsInstances.isHub=true`.
2. Controller provisions dedicated **`controller`** NATS account/user (not SYS / `admin-hub`) via NATS auth reconcile.
3. Cross-replica exec uses subjects `controller.relay.v1.exec.{sessionId}.agent` / `.user`; logs use `controller.relay.v1.log.{sessionId}.user`. Plain TCP to hub — port from `NatsInstances.serverPort` (default **4222**) for every host in the resolver list.
4. **Remote CP:** Controller resolves **`nats.default.svc.bridge.local`** (Edgelet internal DNS) then hub `host`; both use hub `serverPort`.
5. **Kubernetes CP:** Controller resolves **`nats-server.{namespace}.svc.cluster.local`** then hub `host`.
6. Remote ControlPlane replicas connect to the **hub** NATS only — not local fog NATS leaf.
7. When NATS relay is unavailable, fail-fast semantics match AMQP (close **1013** when configured).

Same-replica sessions may relay directly without AMQP or NATS when both user and agent land on the same pod.

---

## Graceful drain (SIGTERM / Kubernetes preStop)

On shutdown, Controller drains WebSocket sessions for up to **`WS_DRAIN_TIMEOUT_MS`** (default **30s**):

1. Reject new upgrades (`verifyClient` → draining).
2. Close pending users with code **1001** (`Server draining`).
3. Send CLOSE frames, clean exec/log session DB rows, tear down relay bridges (AMQP or NATS).

### Kubernetes manifest example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: controller
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45
      containers:
        - name: controller
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - sleep 5
          env:
            - name: WS_DRAIN_TIMEOUT_MS
              value: "30000"
```

**Procedure (manual verification):**

1. Open an exec or log session against a running pod.
2. `kubectl delete pod <controller-pod> --grace-period=45`
3. Confirm the client receives close code **1001** within ~30s and the session row is cleaned up (Plan 17: per-session delete; no global `execEnabled=false` for MS exec).
4. Confirm replacement pod accepts new sessions.

---

## Scale SLO (R88)

| Metric | Target |
|--------|--------|
| Concurrent WS per replica | **500** (`WS_REPLICA_MAX_CONCURRENT_WS`) |
| p99 exec pairing latency | **< 5s** |
| Exec sessions per microservice | **5** concurrent user WS |

Run the load probe locally:

```bash
nvm use 24
node test/load/ws-pairing-load.js --pairs 500
node test/load/ws-pairing-load.js --multi-ms 100
```

The `--multi-ms` mode creates **5 exec sessions per microservice** (100 MS × 5 = 500 pairs) to validate multi-session pairing latency under the same p99 SLO.

**AMQP profile** (`nats.enabled=false`): run the probe above on a dev machine — it exercises in-process `ExecSessionManager` pairing only (no router required). Record p99 from stdout; target **< 5000 ms**.

**NATS profile** (`nats.enabled=true`): the same probe validates session-manager pairing latency (transport-agnostic SLO). For end-to-end NATS relay validation in staging:

1. Deploy Controller with **`NATS_ENABLED=true`** on **2+ replicas** and a platform NATS hub (`NatsInstances.isHub=true`).
2. Confirm **`controller`** NATS account reconcile succeeded (NATS auth logs).
3. Run cross-replica exec/log sessions (user on replica A, agent on replica B) while recording OTEL **`ws_pairing_duration_ms`** p99.
4. Optionally repeat `node test/load/ws-pairing-load.js --pairs 500` against staging API with agent simulators — same **p99 < 5s** SLO applies.

For production validation, repeat against a staging cluster with real agent simulators and record p99 from Controller OTEL histogram `ws_pairing_duration_ms`.

---

## OTEL metrics

Enable `ENABLE_TELEMETRY=true`. Key metrics (`src/websocket/ws-metrics.js`):

| Metric | Type |
|--------|------|
| `ws_exec_sessions_active` | gauge |
| `ws_log_sessions_active` | gauge |
| `ws_pending_pairings` | gauge |
| `ws_pairing_duration_ms` | histogram |
| `ws_amqp_publish_errors` | counter |
| `ws_amqp_session_saturated` | counter (Plan 18 overflow/backpressure) |
| `ws_router_pool_connections` | gauge (Plan 18 AMQP pool health) |
| `ws_router_pool_unsettled` | gauge (Plan 18 AMQP unsettled deliveries) |

---

## Session limits (normative)

| Session | Limit |
|---------|-------|
| Exec user WS per microservice | **5** (direct WS; no POST/DELETE MS exec REST) |
| Exec pending (user waits for agent) | **60s** |
| Exec max duration | **8h** |
| Log user WS per microservice/fog | **5** |
| Log pending (user waits for agent) | **120s** |
| Log idle | **2h** |
| Log tail max lines | **5000** |
| WS upgrades per IP per minute | **50** |
| Active WS per IP | **100** |

See [architecture.md](../architecture.md#websocket-exec--log-sessions) for protocol diagrams.

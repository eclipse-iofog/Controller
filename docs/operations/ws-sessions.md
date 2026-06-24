# WebSocket exec & log sessions — operator guide

**Audience:** Platform operators running Controller in production  

---

## Overview

Controller exposes **interactive exec** and **log streaming** over WebSocket on the API port (default **51121**). Sessions pair an operator browser/CLI client (Bearer JWT) with an Edgelet agent (fog token). In multi-replica deployments, cross-replica relay requires the **Skupper-style AMQP router** microservice.

---

## HTTPS and authentication

| Requirement | Detail |
|-------------|--------|
| **HTTPS-only WS** | Set `CONTROLLER_PUBLIC_URL` to `https://…` and terminate TLS at ingress or the Controller listener (`TLS_PATH_*`). WebSocket upgrades must use `wss://`. |
| **User auth** | Bearer JWT via `Authorization` header or `?token=` query param (browser Console). RBAC: `execSessions`, `logs`, `systemExecSessions`, `systemLogs`. |
| **Agent auth** | Fog token on `/api/v3/agent/exec/*` and `/api/v3/agent/logs/*` — OIDC does **not** apply to agent routes. |

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

| Setting | Default | Env |
|---------|---------|-----|
| Cross-replica requires AMQP | `true` | `WS_HA_CROSS_REPLICA_REQUIRES_AMQP` |
| Fail fast when router down | `true` | `WS_HA_FAIL_FAST_ON_ROUTER_UNAVAILABLE` |

**Requirements:**

1. Deploy the **router** system microservice and ensure Controller can reach AMQP (`RouterConnectionService`).
2. Run **2+ Controller replicas** behind a load balancer with **sticky sessions optional** — cross-replica exec/log uses AMQP queues (`agent-{execId}`, `user-{execId}`, `logs-user-{sessionId}`).
3. When the router is unavailable, new cross-replica sessions close with WebSocket code **1013** (`Router unavailable for cross-replica session`).

Same-replica sessions may relay directly without AMQP when both user and agent land on the same pod.

---

## Graceful drain (SIGTERM / Kubernetes preStop)

On shutdown, Controller drains WebSocket sessions for up to **`WS_DRAIN_TIMEOUT_MS`** (default **30s**):

1. Reject new upgrades (`verifyClient` → draining).
2. Close pending users with code **1001** (`Server draining`).
3. Send CLOSE frames, clean exec/log session DB rows, tear down AMQP bridges.

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
3. Confirm the client receives close code **1001** within ~30s and exec is disabled (`execEnabled=false` for exec sessions).
4. Confirm replacement pod accepts new sessions.

---

## Scale SLO (R88)

| Metric | Target |
|--------|--------|
| Concurrent WS per replica | **500** (`WS_REPLICA_MAX_CONCURRENT_WS`) |
| p99 exec pairing latency | **< 5s** |

Run the load probe locally:

```bash
nvm use 24
node test/load/ws-pairing-load.js --pairs 500
```

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
| `ws_router_connected` | gauge |

---

## Session limits (normative)

| Session | Limit |
|---------|-------|
| Exec user WS per microservice | **1** |
| Exec pending (user waits for agent) | **60s** |
| Exec max duration | **8h** |
| Log user WS per microservice/fog | **3** |
| Log pending (user waits for agent) | **120s** |
| Log idle | **2h** |
| Log tail max lines | **5000** |
| WS upgrades per IP per minute | **50** |
| Active WS per IP | **100** |

See [architecture.md](../architecture.md#websocket-exec--log-sessions) for protocol diagrams.

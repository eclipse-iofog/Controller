# Controller PKI — operator guide

**Audience:** Platform operators  
**Release:** v3.8.0 greenfield

Controller issues and stores TLS material for router messaging, NATS MQTT, and inter-site links. v3.8 uses **central local CAs** shared across the fleet instead of per-agent CA secrets.

---

## Central certificate authorities

On startup, Controller ensures two fleet-wide local CAs (stored as TLS secrets):

| Secret name | Signs |
|-------------|--------|
| `default-router-local-ca` | Router **messaging** certs (`router-local-server-*`, `router-local-agent-*`) |
| `default-nats-local-ca` | NATS **MQTT local** certs (`nats-mqtt-*`) |

Site CAs (unchanged from earlier releases):

| Secret name | Purpose |
|-------------|---------|
| `router-site-ca` | Inter-router (site) TLS |
| `nats-site-ca` | Inter-NATS (site) TLS |

**Greenfield v3.8:** new agent provisions always receive certs signed by the central local CAs. Controller does **not** create `router-local-ca-{agentName}` or `nats-local-ca-{token}` secrets on provision.

Per-agent local CA names may still appear in **delete cleanup** for orphaned legacy artifacts; they are not part of the v3.8 provision path.

---

## Greenfield install (no PKI migration job)

v3.8 is a **new install only** release (no v3.7 → v3.8 database migrator).

Plan 5 originally scoped a **one-time PKI rotation job** to re-sign certs from legacy per-agent CAs under the central CAs. That job was **not implemented** — greenfield policy means labs and production deploy fresh Controller + Edgelet fleets without carrying forward v3.7 secrets.

| Scenario | Operator action |
|----------|-----------------|
| New v3.8 fleet | Install Controller v3.8; central CAs are created at boot; provision Edgelet agents normally |
| Old v3.7 lab with per-agent CAs | **Wipe and reinstall** (new DB + new secrets) per greenfield policy — do not attempt in-place PKI migration |
| Agent host / IP change | Controller recreates affected router/NATS certs and sets the **`volumeMounts`** change flag so Edgelet reloads mounted secrets (automatic) |

---

## Automatic operations

### Boot

After database init, Controller calls `ensureCentralLocalCAs()` — creating `default-router-local-ca` and `default-nats-local-ca` if missing (60-month CA validity for central CAs).

### Agent provision and host changes

When an agent is provisioned or its **host** changes, Controller:

1. Ensures the central local CA exists.
2. Creates or recreates router local-server / local-agent and NATS MQTT certs with current DNS SANs (including bridge SANs such as `router.default.svc.bridge.local`).
3. Sets **`volumeMounts`** (and related) change tracking so Edgelet picks up new secret mounts.

No manual PKI step is required for normal agent lifecycle.

---

## Manual certificate renewal

Operators can renew individual TLS secrets before expiry:

```http
POST /api/v3/certificates/{name}/renew
Authorization: Bearer <admin-token>
```

Renewal generates a new key pair and secret data, preserving the signing CA relationship. If the signing CA is expired, renew the CA first.

List certs nearing expiry (default window 30 days):

```http
GET /api/v3/certificates/expiring?days=30
Authorization: Bearer <admin-token>
```

After renewing certs mounted into running microservices, trigger agent reconciliation (host update or wait for change flags) so Edgelet reloads updated secrets.

See **`docs/swagger.yaml`** for full certificate API (`/api/v3/certificates/*`, `/api/v3/certificates/ca/*`).

---

## NATS operator rotation

NATS account JWTs are signed by a fleet **NATS operator** key. To rotate the operator and re-sign all accounts:

```http
POST /api/v3/nats/operator/rotate
Authorization: Bearer <admin-token>
```

Controller accepts the request, rotates operator material, re-signs accounts, and schedules resolver reconciliation in the background. Plan maintenance when NATS leaf nodes may reload operator trust.

This is **NATS credential rotation**, not the skipped Plan 5 per-agent CA migration.

---

## DNS SANs and TCP bridge

Router and NATS MQTT certs include bridge and cluster SANs required by Edgelet networking:

- `router.default.svc.bridge.local`, `nats.default.svc.bridge.local`
- Default router: `router.{namespace}.svc.cluster.local` when applicable

TCP bridge connector hostnames for services are documented in [architecture.md](architecture.md) (reserved ports **54321**, **54322**, **53**).

---

## Related docs

| Document | Topic |
|----------|-------|
| [architecture.md](architecture.md) | Module layout, agent contract, PKI summary |
| [swagger.yaml](swagger.yaml) | Certificate and NATS operator API reference |
| [CHANGELOG.md](../CHANGELOG.md) | v3.8.0 breaking changes |

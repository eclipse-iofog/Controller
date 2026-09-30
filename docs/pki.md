# Controller PKI — operator guide

**Audience:** Platform operators  
**Release:** v3.8.0 greenfield

Controller issues and stores TLS material for router messaging, NATS MQTT, and inter-site links. v3.8 uses **central local CAs** shared across the fleet instead of per-agent CA secrets.

---

## Central certificate authorities

Fleet-wide local CAs (stored as TLS secrets):

| Secret name | Signs |
|-------------|--------|
| `default-router-local-ca` | Router **messaging** certs (`router-local-server-*`, `router-local-agent-*`) |
| `default-nats-local-ca` | NATS **MQTT local** certs (`nats-mqtt-*`) |

Site CAs:

| Secret name | Purpose |
|-------------|---------|
| `router-site-ca` | Inter-router (site) TLS |
| `nats-site-ca` | Inter-NATS (site) TLS |

**Greenfield v3.8:** new agent provisions always receive certs signed by the central local CAs. Controller does **not** create `router-local-ca-{agentName}` or `nats-local-ca-{token}` secrets on provision.

Per-agent local CA names may still appear in **delete cleanup** for orphaned legacy artifacts; they are not part of the v3.8 provision path.

---

## Greenfield install (no PKI migration job)

v3.8 is a **new install only** release (no v3.7 → v3.8 database migrator).

 A **one-time PKI rotation job** to re-sign certs from legacy per-agent CAs under the central CAs. That job was **not implemented** — greenfield policy means labs and production deploy fresh Controller + Edgelet fleets without carrying forward v3.7 secrets.

| Scenario | Operator action |
|----------|-----------------|
| New v3.8 fleet | Install Controller v3.8; provision Edgelet agents normally (CAs are ensured on first agent, or import custom CAs first — see below) |
| Old v3.7 lab with per-agent CAs | **Wipe and reinstall** (new DB + new secrets) per greenfield policy — do not attempt in-place PKI migration |
| Operator host change | Controller replaces affected router and NATS certificates with the new operator host. Static bridge and local names stay. Agent IP addresses are not copied onto the certificate. The linked volume mount **version** increments, and **`volumeMounts`** is set |
| Router or NATS mode crosses `none` | Controller creates or replaces the certificates that mode requires |
| Agent IP change | Does not reissue certificates |

---

## Automatic operations

### Boot

Controller does **not** create fleet CAs at boot.

### Operator import (optional, before first agent)

Import custom CAs using the canonical secret names:

1. `POST /api/v3/secrets` — `type: "tls"`, data keys **`tls.crt`** and **`tls.key`** (base64-encoded PEM; optional **`ca.crt`** for CA secrets).
2. `POST /api/v3/certificates/ca` — `type: "direct"`, `secretName` matching the secret.

Supported names: `router-site-ca`, `nats-site-ca`, `default-router-local-ca`, `default-nats-local-ca`.

### Agent provision and host changes

When an agent is provisioned, its operator host changes, or router or NATS mode crosses `none`, Controller:

1. Ensures missing fleet CAs (self-signed, 60-month validity) or uses operator-imported CAs when present. Site CAs are not rotated for host or mode changes.
2. Creates or replaces the router and NATS certificates required by the current mode, including bridge SANs such as `router.default.svc.bridge.local`. The operator host is the platform spec host when set, otherwise the fog host. A certificate is replaced when its record is missing, when the stored host list does not include the operator host, or when that service's mode crosses `none`. Switching router `edge` and `interior`, or NATS `leaf` and `server`, does not replace certificates that already list the operator host.
3. Puts the operator host on the new certificate, together with the static local and bridge names. Fog `ipAddress` and `ipAddressExternal` are not added, so a previous host address still stored on the fog row is not kept. An agent IP change alone does not recreate certificates.
4. Updates an existing certificate secret in place. That increments the linked volume mount **version** (the same path as a secret or config map update) and sets **`volumeMounts`** so Edgelet reloads the new secret. A certificate that did not exist yet is created; its mount starts at version 1 when the router or NATS workload links it.

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

This is **NATS credential rotation**, not the skipped per-agent CA migration.

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

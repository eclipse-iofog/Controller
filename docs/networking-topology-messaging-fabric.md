# Networking topology: messaging fabric

Datasance PoT / Eclipse ioFog is secure by default. The messaging fabric is NATS. An Edgelet agent joins it when you declare the node and its NATS role. Controller creates the NATS system microservice, the certificate authorities, the certificates, the server or leaf config, and the upstream links. Operator JWT authentication, TLS on leaf and cluster links, TLS on MQTT, and encrypted JetStream are on by default. You do not run `nsc`, copy a server config, or place credentials on the node by hand.

How application and microservice clients get accounts, user JWTs, and creds is in [nats-access.md](nats-access.md). Rule fields are in [nats-rules.md](nats-rules.md). This document is how the NATS topology itself is built.

---

## What you declare

An agent needs a name, an architecture, and a host. The NATS role defaults to `leaf`. A leaf is a node that runs workloads and connects inward to the NATS servers. That is the usual Edgelet node.

```
name: plant-a
archId: 1
host: 203.0.113.10
natsMode: leaf
```

`natsMode` is one of:

| Role | What it is | What the process listens on |
|---|---|---|
| `leaf` | Local NATS that dials upstream servers over TLS | Client `4222`, MQTT `8883`, monitor `8222` |
| `server` | Full server. Forms the cluster and accepts leaf connections. | Those, plus cluster `6222` and leafnode `7422` |
| `none` | No NATS process on this agent | None |

Both `leaf` and `server` publish the full port set on the microservice (`4222`, `6222`, `7422`, `8883`, `8222`). A leaf does not open the cluster or leafnode listeners. It dials each upstream on `7422`.

`host` is required unless both the router role and the NATS role are `none`.

Omit `upstreamNatsServers` and Controller attaches this node to the hub (`default-nats-hub`) plus every NATS server that runs on a system agent. A leaf cannot be an upstream. Name an upstream by agent uuid, agent name, or `default-nats-hub`.

A system agent must be `natsMode: server`. On a control plane that is not Kubernetes, the first agent in an empty cluster is the system agent. Controller sets `routerMode: interior` and `natsMode: server` on that create, including when the request asked for another role. That node becomes the hub when no hub exists yet.

On Kubernetes the hub is the platform NATS, not an agent. No agent is marked hub. Agents you add are leaves or extra servers. Controller patches those servers into the hub cluster routes and does not replace routes that belong to the `nats-headless` Service. How that hub is installed and how those ConfigMap updates are applied is in [networking-topology-controlplane.md](networking-topology-controlplane.md).

Create stores a platform spec and returns immediately. Provisioning runs in the background and then flags the agent so Edgelet pulls the system microservice.

---

## What Controller builds for `leaf` or `server`

For one agent, reconcile does this without further input:

1. Ensures the certificate authorities and issues this node's server and MQTT certificates.
2. Generates a JetStream encryption key and stores it in a secret.
3. Ensures the NATS operator and the system account. A leaf also gets a leaf system account named `SYS-leaf-{agentName}`.
4. Creates the system application `system-{agentName}` and the `nats` system microservice from the NATS catalog.
5. Renders `server.conf` or `leaf.conf` into ConfigMap `nats-server-conf-{agent}` (key `server.conf`) and mounts it at `/etc/nats/config`.
6. Builds the account-JWT bundle the resolver directory needs, and mounts it.
7. Mounts the TLS secrets and, for a server, the system-user credentials.
8. For a leaf, creates the upstream leaf connections, the per-account leaf users, and a creds ConfigMap.
9. Publishes the NATS ports on the microservice and adds a health check against `http://localhost:8222/healthz`.

The container is not host-networked. Ports are published on the microservice. It receives `NET_RAW` and a service account.

JetStream is on. The file store is the volume `{agentName}-nats-jetstream`, mounted read-write at `/home/runner/data`, and defaults to `10g`. The memory store defaults to `1g` (`jsStorageSize`, `jsMemoryStoreSize`). The store is encrypted with ChaChaPoly. Controller generates 32 random bytes, stores them base64-encoded in secret `nats-jetstream-key-{agent}` field `jsk`, and injects that value as `JETSTREAM_KEY`. The JetStream domain is the Controller namespace on a server, and the agent name on a leaf.

Certificate, ConfigMap, and secret names use the slug of the agent name: lowercase, characters other than letters, digits, and `-` replaced with `-`, at most 48 characters. An agent named `plant-a` stays `plant-a`.

---

## TLS and identity by default

Two certificate authorities are created on first use. Both are self-signed and valid for 60 months.

| CA | Certificate | Hosts | Used for |
|---|---|---|---|
| `nats-site-ca` | `nats-server-{agentName}` | Agent `host`, or `localhost` | Cluster TLS, leafnode TLS, and the certificate a leaf presents upstream |
| `default-nats-local-ca` | `nats-mqtt-server-{agentName}` | Those hosts plus `nats.default.svc.bridge.local` | MQTT |

Secrets are mounted at `/etc/nats/certs/{certificateName}/` with `ca.crt`, `tls.crt`, and `tls.key`.

If the host changes, or the NATS role crosses `none`, Controller reissues the certificate and flags `volumeMounts`.

What is protected:

| Path | Protection |
|---|---|
| Client port `4222` | Operator mode. Clients authenticate with a user JWT. The generated config does not put a TLS stanza on this port. Workload creds are issued automatically. See [nats-access.md](nats-access.md). |
| Cluster (servers) | TLS, `verify: true`, `handshake_first: true` |
| Leafnode listener (servers) | TLS, `verify: true`, `handshake_first: true` |
| Leaf remotes (leaves) | TLS, `verify: true`, `handshake_first: true`. Each URL is `tls://{upstreamHost}:{leafPort}`. |
| MQTT `8883` | TLS, `handshake_first: true` |
| JetStream disk | ChaChaPoly with a per-node key Controller generates |

There is no shared NATS password and no token in the server config. The operator JWT is written into the config. The operator seed stays in the Controller secret `nats-operator-seed`.

---

## Server config

`natsMode: server` renders `server.conf` (or the no-cluster template when this server is the only cluster member). Controller fills the variables. The shape is:

```
operator: <operator JWT>
system_account: <SYS public key>

jetstream: {
  store_dir: /home/runner/data
  domain: "<namespace>"
  cipher: chachapoly
  key: "<generated key>"
}

cluster: {
  port: 6222
  routes: ["nats://<each server host>:6222"]
  tls: { verify: true, handshake_first: true, ca/cert/key from nats-server-<name> }
}

leafnodes: {
  port: 7422
  advertise: <agent host>
  tls: { verify: true, handshake_first: true, same server certificate }
}

mqtt: {
  port: 8883
  tls: { handshake_first: true, certificate nats-mqtt-server-<name> }
}

resolver: {
  type: full
  dir: /home/runner/nats/jwt
  interval: 2m
}
```

The resolver directory is the account-JWT bundle: the system account, every application with `natsAccess`, and the controller relay account when NATS relay is enabled. On a server that bundle is the shared ConfigMap `iofog-nats-jwt-bundle`, mounted at `/tmp/nats/jwt`. User creds are not in this bundle.

A server also gets a system user (`admin-hub` on the hub, `admin-server-{agent}` on other servers) and mounts that creds file at `/etc/nats/creds`.

When another server is added or removed, Controller recomputes cluster routes for every server and reconciles the others. Growing the cluster from one member to many rebuilds the local NATS container so it switches to the clustered config. On Kubernetes, routes that contain `nats-headless` are left in place and the agent servers are appended.

---

## Leaf config and connections

`natsMode: leaf` renders `leaf.conf`. It still runs JetStream, MQTT, the operator, and a resolver. It does not open cluster routes. It dials upstreams:

```json
{
  "urls": ["tls://203.0.113.1:7422"],
  "account": "<application account public key>",
  "credentials": "/etc/nats/creds/orders/leaf-plant-a.creds",
  "tls": {
    "ca_file": "/etc/nats/certs/nats-server-plant-a/ca.crt",
    "cert_file": "/etc/nats/certs/nats-server-plant-a/tls.crt",
    "key_file": "/etc/nats/certs/nats-server-plant-a/tls.key",
    "verify": true,
    "handshake_first": true,
    "timeout": "3s"
  }
}
```

Controller creates that remote for each application that has `natsAccess` and a microservice on this agent, and for each upstream server. The leaf user is `leaf-{agentName}` inside that application account, with the `default-leaf-user` rule (`LEAFNODE` and `WEBSOCKET`). The creds files are collected into ConfigMap `nats-leaf-creds-{agent}` and mounted at `/etc/nats/creds`.

The leaf resolver bundle is smaller than the hub bundle. It holds this fog's leaf system account (`SYS-leaf-{agentName}`) and the application accounts that have workloads here. It is ConfigMap `nats-jwt-bundle-{agent}`.

A leaf also has its own system user `admin-leaf-{agent}` on that leaf system account, used for the leaf's system traffic.

If you leave `upstreamNatsServers` empty, the upstream set is the hub plus each system agent's NATS server. A system agent created before a hub exists starts with no upstreams. Later leaves attach to the hub.

Switching a leaf to a server removes the leaf JWT ConfigMap, the leaf creds ConfigMap, and the leaf system account. Switching a server to a leaf builds those artifacts and stops using cluster routes.

`natsMode: none` deletes the NATS microservice and the leaf system artifacts. The agent no longer runs a broker. Workloads on that agent that still have `natsAccess` are pointed at the hub URL. See [nats-access.md](nats-access.md).

---

## What you do not do by hand

| Manual NATS | Controller, from `natsMode` |
|---|---|
| Install a CA and issue server, MQTT, and leaf certificates | `nats-site-ca` and `default-nats-local-ca`, one server cert and one MQTT cert per agent, remounted when the host changes |
| Write `server.conf` / `leaf.conf`, cluster routes, and leaf remotes | Rendered from the role and the upstream list, updated when servers are added or removed |
| Create an operator, a system account, and a leaf user per site | Operator, `SYS`, per-leaf `SYS-leaf-{agent}`, and `leaf-{agent}` users in each application account |
| Copy account JWTs onto every server | Full resolver bundle, mounted on servers and leaves |
| Choose a JetStream key and turn on encryption | Random key per node, ChaChaPoly, secret-injected |

Declare the agent and the role. `leaf` is already the default. Controller provisions the process, the trust material, and the links.

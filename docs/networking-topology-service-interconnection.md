# Networking topology: service interconnection

Datasance PoT / Eclipse ioFog is secure by default. Service interconnection is the router fabric. An Edgelet agent joins it when you declare the node and its router role. Controller creates the router system microservice, the certificate authorities, the certificates, the listeners, and the upstream connections. Mutual TLS is on for every link that leaves the node. You do not install a certificate authority, write a router config, or open the links by hand.

How a published Service uses this fabric (`tcpConnector` and `tcpListener`) is in [service-interconnection.md](service-interconnection.md). This document is how the fabric itself is built.

---

## What you declare

An agent needs a name, an architecture, and a host. The router role defaults to `edge`. That is enough for a node that runs workloads and connects inward to the interior routers.

```
name: plant-a
archId: 1
host: 203.0.113.10
routerMode: edge
```

`routerMode` is one of:

| Role | What it is | Default ports Controller opens |
|---|---|---|
| `edge` | Workload node. Connects to interior routers. Does not accept other routers. | AMQPS `5671` |
| `interior` | Fabric node. Accepts edge routers and other interior routers. | AMQPS `5671`, edge `45671`, inter-router `55671` |
| `none` | No router process on this agent. Workloads use another router (`networkRouter`). | No router listeners |

`host` is required unless the role is `none`. Setting `routerMode: interior` yourself also requires `interRouterPort` and `edgeRouterPort` on create. The automatic first-node promotion happens after that check, so a first node that omits the role still receives the default ports `45671` and `55671`.

Omit `upstreamRouters` and Controller attaches this router to the default router plus every router that runs on a system agent. An edge router cannot be an upstream. Name an upstream by agent uuid, agent name, or `default-router`.

A system agent must be `interior`. On a control plane that is not Kubernetes, the first agent in an empty cluster is the system agent. Controller sets `routerMode: interior` and `natsMode: server` on that create, including when the request asked for another role. Later agents keep the role you set (`edge` when omitted). On Kubernetes, creating a system agent through this API is rejected. The interior router for the cluster is the platform router, not an agent you mark `isSystem`. How that default router is installed, registered, and later updated is in [networking-topology-controlplane.md](networking-topology-controlplane.md).

Create stores a platform spec and returns the agent uuid. Provisioning runs in the background. The agent change list then carries the system microservice, its config, its ports, and the certificate volume mounts.

---

## What Controller builds for `edge` or `interior`

For one agent, reconcile does this without further input:

1. Creates the certificate authorities if they do not exist, and issues this agent's certificates.
2. Creates the system application `system-{agentName}`.
3. Creates the `router` system microservice from the router catalog, on that agent.
4. Writes the router config (listeners, TLS profiles, and connectors to the chosen upstreams).
5. Publishes the listener ports on the microservice.
6. Mounts each certificate secret into the router container, read-only.
7. Gives the router a service account and the `NET_RAW` capability.

The router process reads `/tmp/skrouterd.json` (`QDROUTERD_CONF`). `SKUPPER_SITE_ID` is the agent uuid. `SSL_PROFILE_PATH` is `/etc/skupper-router-certs`.

An interior router runs with host networking so the edge and inter-router ports bind on the host. An edge router does not.

---

## TLS by default

Two certificate authorities are created on first use. Both are self-signed and valid for 60 months. You do not upload a CA.

| CA | Signs | Used for |
|---|---|---|
| `router-site-ca` | `router-site-server-{agentName}` | Edge and inter-router links between routers |
| `default-router-local-ca` | `router-local-server-{agentName}` and `router-local-agent-{agentName}` | AMQPS on this node, and local clients that present a client certificate |

The site certificate's host list is the agent `host` (or `localhost` when no host is set).

The local certificates include:

- `localhost`, `127.0.0.1`
- `host.docker.internal`, `host.containers.internal`
- `iofog`, `service.local`
- the agent `host`
- `router.default.svc.bridge.local` (workloads on the bridge network)
- on the default router only, `router.{namespace}.svc.cluster.local`

Each certificate is a secret (`ca.crt`, `tls.crt`, `tls.key`). Controller mounts it on the router at `/etc/skupper-router-certs/{profileName}/` and points the matching SSL profile at those files. A `system-default` profile uses the host CA bundle at `/etc/pki/tls/certs/ca-bundle.crt`.

If the agent host changes, or the router role crosses `none`, Controller reissues the certificate so the new host is on the certificate, then flags `volumeMounts` so the agent picks up the new files.

`routerMode: none` still creates `default-router-local-ca` and `router-local-agent-{agentName}`. There is no router process, but local clients can still authenticate to the router named by `networkRouter`.

---

## Listeners

Every edge and interior router gets two local listeners.

| Name | Port | TLS | Who connects |
|---|---|---|---|
| `{uuid}-amqp` | `5672` | No. This port is not published on the host. | Router-local AMQP only |
| `{uuid}-amqps` | `messagingPort`, default `5671` | Mutual TLS. `authenticatePeer: true`, SASL `EXTERNAL`, profile `router-local-server-{agentName}` | Workloads and clients on this node |

An interior router adds two more. Both require a peer certificate (`authenticatePeer: true`, SASL `EXTERNAL`) and use `router-site-server-{agentName}`.

| Name | Port | Role |
|---|---|---|
| `{uuid}-edge` | `edgeRouterPort`, default `45671` | Accepts edge routers |
| `{uuid}-inter-router` | `interRouterPort`, default `55671` | Accepts other interior routers |

Example listener block Controller writes for an interior router:

```json
{
  "plant-a-uuid-amqps": {
    "name": "plant-a-uuid-amqps",
    "host": "0.0.0.0",
    "port": 5671,
    "role": "normal",
    "authenticatePeer": true,
    "saslMechanisms": "EXTERNAL",
    "sslProfile": "router-local-server-plant-a"
  },
  "plant-a-uuid-edge": {
    "name": "plant-a-uuid-edge",
    "host": "0.0.0.0",
    "port": 45671,
    "role": "edge",
    "authenticatePeer": true,
    "saslMechanisms": "EXTERNAL",
    "sslProfile": "router-site-server-plant-a"
  },
  "plant-a-uuid-inter-router": {
    "name": "plant-a-uuid-inter-router",
    "host": "0.0.0.0",
    "port": 55671,
    "role": "inter-router",
    "authenticatePeer": true,
    "saslMechanisms": "EXTERNAL",
    "sslProfile": "router-site-server-plant-a"
  }
}
```

SASL `EXTERNAL` means the certificate is the identity. There is no router password to set.

---

## Connections

A connector is how this router dials an upstream router. Controller creates one connector per upstream and stores the link in the router connection table.

| This router | Connector role | Upstream port | TLS profile |
|---|---|---|---|
| `edge` | `edge` | Upstream `edgeRouterPort` | `router-site-server-{thisAgentName}` |
| `interior` | `inter-router` | Upstream `interRouterPort` | `router-site-server-{thisAgentName}` |

The connector host is the upstream router's `host`. The connector name is the upstream agent uuid, or `default-router` for the default router.

```json
{
  "name": "default-router",
  "role": "edge",
  "host": "203.0.113.1",
  "port": "45671",
  "sslProfile": "router-site-server-plant-a"
}
```

If you leave `upstreamRouters` empty, the set is the default router plus each system agent's router, with duplicates removed. A system agent that is created before any default router exists starts with no upstreams. Later agents attach to it.

Changing `upstreamRouters` adds and removes connectors and rewrites the router config. The agent is flagged for a config update. Changing a listener port also republishes the microservice ports and rebuilds the container.

An interior router that still has downstream routers cannot be switched to `edge`. Remove those links first.

`routerMode: none` does not create a router or connectors. `networkRouter` selects which existing router this agent uses. Omit it to use the default router. The agent record stores that router's id.

---

## Config the router container actually runs

Controller writes one JSON document as the router microservice `config`. Besides listeners, connectors, and SSL profiles it sets:

| Section | Value |
|---|---|
| `metadata.id` | Agent uuid |
| `metadata.mode` | `edge` or `interior` |
| `metadata.helloMaxAgeSeconds` | `3` |
| `siteConfig.platform` | `edgelet`, or `docker` / `podman` when that is the agent engine |
| `siteConfig.namespace` | Controller namespace |
| `addresses.mc` | Multicast prefix `mc` |
| `bridges` | TCP bridges for Services. Rebuilt from the service catalog. See [service-interconnection.md](service-interconnection.md). |

You do not edit this JSON. Change the agent role, ports, host, or upstream list, or publish a Service. Controller regenerates the document and signals the agent.

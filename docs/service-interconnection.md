# Service Interconnection

`kind: Service` publishes a TCP port through the router. It is not a microservice and it is not a Kubernetes Service by itself. Controller turns one Service row into:

1. A `tcpConnector` on the router that can reach the backend.
2. A `tcpListener` on the hub router, and on every Edgelet agent whose tags select this service.
3. When `CONTROL_PLANE=kubernetes` and the type is `microservice`, `agent`, or `external`, a Kubernetes Service in `CONTROLLER_NAMESPACE` that forwards `servicePort` to that listener.

Create returns immediately with `provisioningStatus: pending`. Router and Kubernetes updates run in the background. `ready` means the hub connector, hub listener, and (when required) the Kubernetes Service succeeded. Edge listeners are a separate fog reconcile.

Upload: `POST /api/v3/services/yaml` and `PATCH /api/v3/services/yaml/{name}`, multipart field `service`. On update, `metadata.name` must equal `{name}`. `apiVersion` is not checked. `metadata` and `spec` are required. Tags live under `metadata.tags`, not `spec`.

`type` and `defaultBridge` cannot be changed. Delete and recreate. `bridgePort` is assigned once and kept.

---

## YAML

Remote control plane (`CONTROL_PLANE` is not `kubernetes`). `k8sType` and `servicePort` are not used. Controller sets `servicePort` to the assigned `bridgePort` and `serviceEndpoint` to the hub router host.

```yaml
apiVersion: iofog.org/v3
kind: Service
metadata:
  name: checkout
  tags:
    - checkout          # distribution token; matched against agent tags
spec:
  type: microservice
  resource: orders/checkout    # <application>/<microservice>, or a microservice uuid
  targetPort: 8080
  defaultBridge: default-router
```

Kubernetes control plane. `k8sType` and `servicePort` are required for `microservice`, `agent`, and `external`.

```yaml
apiVersion: iofog.org/v3
kind: Service
metadata:
  name: checkout
  tags:
    - checkout
    # contains ":", so this is a Kubernetes annotation only, not a distribution tag
    - "service.beta.kubernetes.io/aws-load-balancer-type: nlb"
spec:
  type: microservice
  resource: orders/checkout
  targetPort: 8080
  servicePort: 80
  k8sType: LoadBalancer
  defaultBridge: default-router
```

Backend that is already a cluster DNS name (`type: k8s`). Allowed only when the control plane is Kubernetes. Controller does not create a Kubernetes Service for this type. `resource` is the host the connector dials.

```yaml
apiVersion: iofog.org/v3
kind: Service
metadata:
  name: payments
  tags:
    - payments
spec:
  type: k8s
  resource: payments.payments.svc.cluster.local
  targetPort: 8080
  defaultBridge: default-router
```

---

## Fields

| Field | Where | Required | Meaning |
|---|---|---|---|
| `metadata.name` | YAML | yes | DNS label: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`. Also the Kubernetes Service name and the router `address`. Rejected names: `controller`, `router`, `router-internal`, `docker`, `podman`, `kubernetes`, `nats`, `nats-headless`, `nats-server`. |
| `metadata.tags` | YAML | no | String list. Two uses, described below: Edgelet distribution, and Kubernetes annotations. |
| `spec.type` | YAML | yes | `microservice`, `agent`, `k8s`, or `external`. Immutable. |
| `spec.resource` | YAML | yes | Who or what the connector dials. Meaning depends on `type`. |
| `spec.targetPort` | YAML | yes | TCP port on that backend. Becomes `tcpConnector.port`. |
| `spec.defaultBridge` | YAML | no | Which hub router owns the listener. Default `default-router`. Immutable. |
| `spec.servicePort` | YAML | on Kubernetes, for non-`k8s` types | Port clients use on the Kubernetes Service. On a remote control plane Controller overwrites this with `bridgePort`. |
| `spec.k8sType` | YAML | on Kubernetes, for non-`k8s` types | `LoadBalancer`, `ClusterIP`, or `NodePort`. |
| `bridgePort` | assigned | — | Port the router listener binds. Taken from `BRIDGE_PORTS_RANGE` (default `10024-65535`), first free port. Not accepted from YAML. |
| `serviceEndpoint` | assigned | — | Where clients reach the hub. Remote: hub router host. Kubernetes `LoadBalancer`: ingress IP, or hostname if the cloud provider returns one. |
| `provisioningStatus` | assigned | — | `pending`, `ready`, or `failed`. |
| `provisioningError` | assigned | — | Last hub reconcile error when status is `failed`. Retry with `POST /api/v3/services/{name}/reconcile`. |

### `spec.resource` by type

| `type` | `resource` you write | Stored as | Connector dials |
|---|---|---|---|
| `microservice` | `appName/microserviceName` or a microservice uuid | microservice uuid | See connector host table |
| `agent` | agent name or agent uuid | agent uuid | See connector host table |
| `k8s` | DNS name or IP of an existing Service | that string | `resource:targetPort` |
| `external` | DNS name or IP outside the cluster | that string | `resource:targetPort` |

`microservice` and `agent` require a router on that agent. Router mode `none` is rejected: a TCP bridge service requires a router on the agent.

`k8s` and `external` require `defaultBridge: default-router`. For `microservice` and `agent`, `defaultBridge` may instead be the uuid of an upstream router that this agent's router is already connected to.

### Connector host

`tcpConnector.host` is chosen from the backend, not from `resource` alone.

| Backend | Router on that agent | Host the connector dials |
|---|---|---|
| Microservice, edge router, not host network | edge | `{applicationName}.{microserviceName}` |
| Microservice, edge router, host network | edge | `edgelet.default.svc.bridge.local` |
| Microservice, interior router | interior | `127.0.0.1` |
| Agent, edge router | edge | `edgelet.default.svc.bridge.local` |
| Agent, interior router | interior | `127.0.0.1` |
| `k8s` or `external` | connector is placed on the default router | the `resource` string |

`tcpConnector.processId`:

| Type | `processId` |
|---|---|
| `microservice` | microservice uuid |
| `agent` | `{agentUuid}-local-{targetPort}` |
| `k8s` | `{resource}-k8s-{targetPort}` |
| `external` | `{resource}-external-{targetPort}` |

The connector is written onto the router that can open that host:

| Type | Router that receives `tcpConnector` |
|---|---|
| `microservice` | the agent that runs the microservice |
| `agent` | that agent |
| `k8s`, `external` | the default router |

---

## Kubernetes control plane

`CONTROL_PLANE=kubernetes` (or `app.ControlPlane: kubernetes`).

| `spec.type` | `k8sType` and `servicePort` | Controller creates a Kubernetes Service |
|---|---|---|
| `microservice`, `agent`, `external` | required | yes |
| `k8s` | not required | no. `type: k8s` is itself rejected unless the control plane is Kubernetes |

The Service is created in `CONTROLLER_NAMESPACE` (`app.namespace`). Name is `metadata.name`.

Selector is the router pods. The label key follows the Controller distribution unless `COMPONENT_LABEL_DOMAIN` is set:

| Distribution | Selector |
|---|---|
| `datasance` (default) | `datasance.com/component: router` |
| `iofog` | `iofog.org/component: router` |

Labels written on the Service:

```yaml
app.kubernetes.io/name: iofog          # APP_LABEL, default iofog
app.kubernetes.io/component: controller
app.kubernetes.io/managed-by: controller
app.kubernetes.io/instance: <CONTROLLER_NAME>
datasance.com/component: router        # same key as the selector
```

Ports. Clients use `servicePort`. kube-proxy sends that to `bridgePort` on the router pod, which is the `tcpListener` port.

```yaml
ports:
  - name: iofog-service
    port: 80                  # spec.servicePort
    targetPort: 10024         # assigned bridgePort
    protocol: TCP
```

`LoadBalancer` only: after create or update, Controller polls `status.loadBalancer.ingress` (10 tries, 2 seconds apart) and stores `ingress.ip`, or `ingress.hostname` when there is no IP, in `serviceEndpoint`. ClusterIP and NodePort do not set `serviceEndpoint` from Kubernetes. If a LoadBalancer still has no ingress, reconcile fails and `provisioningStatus` becomes `failed`.

Create is `createNamespacedService`. Update is a JSON patch of `/spec/type`, `/spec/selector`, `/spec/ports`, and `/metadata/annotations`. A missing Service during update is created again. Delete removes the Kubernetes Service for every type except `k8s`.

Worked object for the checkout example, after `bridgePort` is assigned `10024`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: <CONTROLLER_NAMESPACE>
  labels:
    app.kubernetes.io/name: iofog
    app.kubernetes.io/component: controller
    app.kubernetes.io/managed-by: controller
    app.kubernetes.io/instance: pot
    datasance.com/component: router
  annotations:
    checkout: ""
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    datasance.com/component: router
  ports:
    - name: iofog-service
      port: 80
      targetPort: 10024
      protocol: TCP
```

---

## Tags become Kubernetes annotations

The same `metadata.tags` list is copied onto the Kubernetes Service. Each tag is split on the first `:`.

| Tag in YAML | Annotation |
|---|---|
| `checkout` | `checkout: ""` (a tag with no colon is treated as `checkout:`) |
| `service.beta.kubernetes.io/aws-load-balancer-type: nlb` | `service.beta.kubernetes.io/aws-load-balancer-type: nlb` |
| `a:b:c` | `a: b` (only the first colon is a separator; the rest is dropped) |

An update replaces the whole annotation map. Annotations Controller did not generate are removed.

These annotation tags are not the Edgelet distribution tags. A tag that contains `:` or `=` is skipped when Controller looks for agents.

---

## Distribution: service tag against the agent tag

The prefix is `SERVICE_ANNOTATION_TAG`, default `service.iofog.org/tag` (`flavor.serviceAnnotationTag`).

The prefix is stored on the **agent**. The service stores the bare token.

| Agent tag | Matches |
|---|---|
| `service.iofog.org/tag: checkout` | Services whose `metadata.tags` include `checkout` |
| `service.iofog.org/tag: all` | Every service |
| `checkout` | Nothing. The prefix is required |
| `service.iofog.org/tag:checkout` | Nothing. The space after the colon is part of the stored value (`prefix + ": " + token`) |

Two lookups use that rule.

**Service create or update** walks from the service out to agents (`handleServiceDistribution`):

1. Always include agents tagged `service.iofog.org/tag: all`.
2. For each service tag that does not contain `:` or `=`, include agents tagged `service.iofog.org/tag: {tag}`.
3. Enqueue a fog-platform reconcile for each agent uuid.

`checkout` matches. `service.beta.kubernetes.io/aws-load-balancer-type: nlb` does not, because it contains `:`.

**Fog reconcile** walks from the agent back to services:

1. Keep agent tags that start with `service.iofog.org/tag`.
2. Take the text after the first colon and trim it.
3. If one of those values is `all`, select every service.
4. Otherwise select services whose tag equals that token.

Fog reconcile then rebuilds that agent's router `tcpListeners`. Listeners whose name ends with `-listener` are removed and replaced by the current match. `tcpConnectors` on that agent are left in place. Each match becomes:

```json
{
  "name": "checkout-listener",
  "port": "10024",
  "address": "checkout"
}
```

`port` and `address` are strings. `address` is the service name. The router joins a listener and a connector that share `address`.

An agent with router mode `none` does not get these listeners. It has no local router config to update.

Example:

| Agent | Tags | Listeners after reconcile |
|---|---|---|
| plant-a | `service.iofog.org/tag: checkout` | `checkout-listener` only |
| plant-b | `service.iofog.org/tag: all` | a listener for every service |
| plant-c | `checkout` | none |

### Edgelet node agent tags

You can assign tags to your edgelet node while initial installation via potctl/iofogctl or update via potctl/iofogctl and EdgeOps Console UI. 

```yaml
apiVersion: datasance.com/v3  # or iofog.org/v3 according to the flavor
kind: Agent
metadata:
    name: test-1
    tags:
        - "service.iofog.org/tag: checkout" # service distribution tag
        - genertic-agent-tag
spec:
    ...

```

```yaml
apiVersion: datasance.com/v3  # or iofog.org/v3 according to the flavor
kind: AgentConfig
metadata:
    name: test-1
    tags:
        - "service.iofog.org/tag: checkout" # service distribution tag
        - genertic-agent-tag
spec:
    ...
```

---

## What create writes on the routers

Create stores the row and enqueues service reconcile. The worker then writes the connector and the hub listener, then fans out to tagged agents.

The connector and the listener share `address`, which is the service name. The listener binds `bridgePort`. The connector dials `host:targetPort`.

```json
{
  "name": "checkout-connector",
  "host": "orders.checkout",
  "port": "8080",
  "address": "checkout",
  "processId": "11111111-1111-1111-1111-111111111111"
}

{
  "name": "checkout-listener",
  "port": "10024",
  "address": "checkout"
}
```

### Where each object is stored

| Control plane | Hub listener and hub connector | Agent router |
|---|---|---|
| Kubernetes | ConfigMap `iofog-router`, key `skrouterd.json`, in `CONTROLLER_NAMESPACE`. The file is a JSON array of pairs. A hub lock serializes writers. | The agent that owns the backend gets the connector in its router microservice `config`. Tagged agents get listeners in that same `config`. |
| Remote | The default router's microservice `config`, or the router for `defaultBridge` when that is an agent uuid. Object form, under `bridges`. | Same as Kubernetes for the backend connector and for tagged listeners. |

Kubernetes hub file (`skrouterd.json`):

```json
[
  ["tcpListener", {
    "name": "checkout-listener",
    "port": "10024",
    "address": "checkout"
  }],
  ["tcpConnector", {
    "name": "checkout-connector",
    "host": "payments.payments.svc.cluster.local",
    "port": "8080",
    "address": "checkout",
    "processId": "payments.payments.svc.cluster.local-k8s-8080"
  }]
]
```

On Kubernetes the **listener is always** written to that ConfigMap. The **connector** is written there only for `k8s` and `external` (their site is the default router). A `microservice` or `agent` connector is written to that agent's router config instead, including on Kubernetes.

Remote hub router microservice `config`:

```json
{
  "bridges": {
    "tcpListeners": {
      "checkout-listener": {
        "name": "checkout-listener",
        "port": "10024",
        "address": "checkout"
      }
    },
    "tcpConnectors": {}
  }
}
```

The connector is not in this object when the backend is a microservice on another agent. It is on that agent's router:

```json
{
  "bridges": {
    "tcpConnectors": {
      "checkout-connector": {
        "name": "checkout-connector",
        "host": "orders.checkout",
        "port": "8080",
        "address": "checkout",
        "processId": "11111111-1111-1111-1111-111111111111"
      }
    },
    "tcpListeners": {
      "checkout-listener": {
        "name": "checkout-listener",
        "port": "10024",
        "address": "checkout"
      }
    }
  }
}
```

That listener on the backend agent appears only when the agent's tags select the service. The connector is written because this agent owns the backend, whether or not the tags match.

A second agent tagged `service.iofog.org/tag: checkout` gets the listener only:

```json
{
  "bridges": {
    "tcpListeners": {
      "checkout-listener": {
        "name": "checkout-listener",
        "port": "10024",
        "address": "checkout"
      }
    }
  }
}
```

Local clients on that agent connect to `bridgePort`. The router bridges `address: checkout` to the connector on the backend agent.

### One example of each type

Microservice `orders/checkout` on edge agent `fog-a`, not host network, `targetPort` 8080, `bridgePort` 10024. Connector on `fog-a`:

```json
{
  "name": "checkout-connector",
  "host": "orders.checkout",
  "port": "8080",
  "address": "checkout",
  "processId": "11111111-1111-1111-1111-111111111111"
}
```

Same microservice with host network on an edge router uses host `edgelet.default.svc.bridge.local`. The same microservice on an interior router uses host `127.0.0.1`.

Agent service, resource `fog-a`, `targetPort` 22, edge router. Connector on `fog-a`:

```json
{
  "name": "ssh-connector",
  "host": "edgelet.default.svc.bridge.local",
  "port": "22",
  "address": "ssh",
  "processId": "fog-a-local-22"
}
```

Interior agent uses host `127.0.0.1`.

`type: k8s`, resource `payments.payments.svc.cluster.local`, `targetPort` 8080. Connector on the default router (ConfigMap when the control plane is Kubernetes):

```json
{
  "name": "payments-connector",
  "host": "payments.payments.svc.cluster.local",
  "port": "8080",
  "address": "payments",
  "processId": "payments.payments.svc.cluster.local-k8s-8080"
}
```

`type: external`, resource `203.0.113.10`, `targetPort` 443. Same placement as `k8s`:

```json
{
  "name": "vendor-connector",
  "host": "203.0.113.10",
  "port": "443",
  "address": "vendor",
  "processId": "203.0.113.10-external-443"
}
```

Hub listener for any of these, on the default router:

```json
{
  "name": "checkout-listener",
  "port": "10024",
  "address": "checkout"
}
```

### Update and delete

Update writes the connector and listener again. If `resource` changed, the connector is removed from the previous site first. Tag changes union the old and new tags, so agents that lost the tag are reconciled and their `-listener` entries are dropped.

Delete removes `{name}-connector` and `{name}-listener` from the hub, deletes the Kubernetes Service when one was created, and reconciles every agent that the old tags selected so those listeners disappear.

After each router `config` write, Controller sets the agent change flag `microserviceConfig`. The agent pulls the router microservice config and applies it.
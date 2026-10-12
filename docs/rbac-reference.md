# Controller RBAC — operator reference

**Audience:** Platform operators, SREs, and integrators configuring access to Controller v3.8  
**Applies to:** User and admin HTTP APIs under `/api/v3/*` (not Edgelet agent wire protocol). Includes fleet models, fleet Knowledge, RuntimeClass, microservice templates, and network topology.

## Overview

Controller uses Kubernetes-style **Role** and **RoleBinding** objects. Each HTTP route is mapped in `src/config/rbac-resources.yaml` to a **resource** and **verb**. At request time the RBAC middleware:

1. Validates the OIDC bearer JWT (or allows unauthenticated routes — see below).
2. Resolves **subjects** from token claims (User + Group).
3. Looks up RoleBindings for those subjects.
4. Evaluates Role rules against the route’s required resource and verb.

Built-in **system roles** are defined in `src/config/rbac-system-roles.js`. Custom roles are stored in the database and managed via `/api/v3/roles` and `/api/v3/rolebindings`.

## Authorization flow

```text
Client request
  → OIDC middleware (Bearer JWT, except agent routes and public endpoints)
  → RBAC protect() middleware
  → findRouteDefinition(method, path) in rbac-resources.yaml
  → authorizer.authorize(subjects, apiGroup, resource, verb, resourceName)
  → 200 / 403
```

**Subjects** are derived from the access token (`src/lib/rbac/middleware.js`):

| Subject kind | Source claim(s) |
|--------------|-----------------|
| **User** | `preferred_username`, `username`, `email`, or `sub` |
| **Group** | `resource_access[<OIDC_CLIENT_ID>].roles`, `roles[]`, `groups[]` (lowercased) |

Group names should match RoleBinding subjects and IdP role names (for example `admin`, `developer`, `viewer`). Direct mapping of those names (no RoleBinding) and per-provider recipes: [external-oidc-providers.md](external-oidc-providers.md). Client registration: [external-oidc-client-setup.md](external-oidc-client-setup.md).

### Password-change gate

`protect()` enforces the `password_change_required` claim. While the claim is set, `protect()` allows only:

- `GET /api/v3/user/profile`
- `POST /api/v3/user/change-password`

Every other route that calls `protect()` returns **403**.

Handlers in `src/routes/user.js` do not call `protect()`. `/api/v3/user/*` stays reachable with a bearer token. Catalog verbs on the `users` resource apply when a handler calls `protect()`.

## Route classes

| Class | Auth | RBAC check | Examples |
|-------|------|------------|----------|
| **Public** | None | None | `GET /api/v3/live`, `GET /api/v3/status`, `GET /api/v3/architectures/` |
| **Auth-only** | Bearer JWT | Skipped (`verbs: []` in catalog) | `POST /api/v3/user/login`, OAuth BFF routes |
| **User RBAC** | Bearer JWT | Resource + verb from catalog | Most `/api/v3/*` admin APIs |
| **Agent wire** | Fog JWT | Separate from user RBAC | `/api/v3/agent/*` |

Routes with an **empty verb list** (`[]`) are catalogued for inventory but do not trigger an RBAC rule lookup; they still require authentication when the route handler is behind OIDC middleware.

**Agent routes** (`/api/v3/agent/*`) use fog provisioning tokens, not user OIDC RBAC. They are listed under the `agent` resource in `rbac-resources.yaml` for drift auditing only. `agent-admin` and `microservice` are Edgelet local API roles carried in service account tokens. See [Edgelet service account roles](#edgelet-service-account-roles).

## System roles

| Role | Scope | Typical use |
|------|-------|-------------|
| **admin** | `resources: ['*'], verbs: ['*']` | Full cluster administration; cannot be modified or deleted |
| **sre** | Full access to operational resources; read-only on `roles`, `roleBindings`, `natsOperator`, `natsBootstrap`, `natsHub` | Day-2 operations, NATS, cluster, network topology, exec/logs |
| **developer** | CRUD on workloads (microservices, applications, catalog, secrets, …); read-only on infra (fogs, router, network topology, cluster, NATS operator, system logs, …) | Application developers |
| **viewer** | `get`, `list` on read-only resource set | Read-only dashboards |
| **agent-admin** | `edgelet.iofog.org/v1` `*` | Unrestricted Edgelet local API. See [Edgelet service account roles](#edgelet-service-account-roles) |
| **microservice** | `get` on four self-service resources | Default workload token for the Edgelet local API. See [Edgelet service account roles](#edgelet-service-account-roles) |

### User API roles

These roles authorize users and groups on `/api/v3/*`. **admin** is `*` on every resource and is omitted below. Each cell is the verb list from `rbac-system-roles.js`. `—` means the role does not include that resource. `*` is the wildcard, which covers `get`, `list`, `create`, `update`, `patch`, and `delete`.

| Resource | SRE | Developer | Viewer | Notes |
|----------|-----|-----------|--------|-------|
| microservices | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | |
| systemMicroservices | `*` | `get`, `list` | `get`, `list` | |
| fogs | `*` | `get`, `list` | `get`, `list` | `POST …/reconcile` is `patch` |
| applications | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | Replaces legacy `flows` |
| systemApplications | `*` | `get`, `list` | `get`, `list` | |
| applicationTemplates | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | |
| microserviceTemplates | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | |
| services | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | `POST …/reconcile` is `patch` |
| router | `*` | `get`, `list` | `get`, `list` | |
| networkTopology | `*` | `get`, `list` | `get`, `list` | Catalog is GET-only under `/api/v3/network-topology/` |
| cluster | `*` | `get`, `list` | `get`, `list` | v3.8 HA controllers |
| natsOperator, natsBootstrap, natsHub | `get`, `list` | `get`, `list` | `get`, `list` | |
| natsAccounts, natsUsers, natsAccountRules, natsUserRules | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | MQTT bearer create/delete is on `natsUsers` |
| catalog, registries | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | |
| secrets, configMaps, volumeMounts, models, knowledge, runtimeClasses | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | Link on volumeMounts, models, knowledge, and runtimeClasses is `patch` |
| tunnels | `*` | `get`, `list` | — | |
| certificates, capabilities | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | |
| execSessions, logs | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | — | |
| systemExecSessions, systemLogs | `*` | `get`, `list` | — | |
| events | `*` | — | — | |
| users | `*` | `get`, `list` | `get`, `list` | Profile is `get`. Password change and MFA are `patch` / `delete`. Login, refresh, logout, OAuth BFF, and interaction routes use `verbs: []`. `src/routes/user.js` does not call `protect()` |
| authUsers, authGroups | `*` | `get`, `list` | `get`, `list` | Embedded identity admin |
| config | `*` | `get`, `list` | `get`, `list` | |
| controller | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | Routes are public (`verbs: []`): `/live`, `/status`, `/architectures/`. `protect()` skips the role check |
| roles, roleBindings | `get`, `list` | `get`, `list` | `get`, `list` | Mutations require **admin** or a custom role |
| serviceAccounts | `*` | `get`, `list`, `create`, `update`, `patch`, `delete` | `get`, `list` | Controller API for ServiceAccount objects. Workload tokens use the Edgelet roles below |
| authAdmin | — | — | — | **admin** only. JWKS rotate, auth migration |
| agent | — | — | — | Fog token on `/api/v3/agent/*`. Listed for drift auditing. not user RBAC |

### Edgelet service account roles

`agent-admin` and `microservice` authorize calls from a running microservice to the Edgelet local API on its node. They do not authorize `/api/v3/*`.

A microservice sets `serviceAccount.roleRef` to a Role in API group `edgelet.iofog.org/v1`. On `GET /api/v3/agent/microservices`, Controller resolves that role and returns `serviceAccount.rules` (`src/services/agent-service.js`). Edgelet uses those rules to mint the service account token it mounts into the container. The workload presents that token to the Edgelet local API.

| Role | API group | Resource | Verbs | What the workload can call |
|------|-----------|----------|-------|----------------------------|
| **agent-admin** | `edgelet.iofog.org/v1` | `*` | `*` | Every local API |
| **microservice** | `edgelet.iofog.org/v1` | `microservices/config/self` | `get` | This workload's own config |
| **microservice** | `edgelet.iofog.org/v1` | `auth/whoami` | `get` | Identity of the calling workload |
| **microservice** | `edgelet.iofog.org/v1` | `system/gps` | `get` | Node GPS |
| **microservice** | `edgelet.iofog.org/v1` | `microservices/control/self` | `get` | This workload's own control endpoint |

`microservice` is the default self-service role. `agent-admin` is the unrestricted local API role. A custom Role in `edgelet.iofog.org/v1` is delivered the same way when `serviceAccount.roleRef` names it.

Bind system roles to users or groups with RoleBindings, for example:

```yaml
apiVersion: datasance.com/v3
kind: RoleBinding
metadata:
  name: alice-developer
subjects:
  - kind: User
    name: alice@example.com
roleRef:
  kind: Role
  name: developer
```

## Verbs

Standard verbs match Kubernetes conventions:

| Verb | Typical HTTP methods |
|------|---------------------|
| `get` | GET single resource, HEAD |
| `list` | GET collection |
| `create` | POST |
| `update` | PUT |
| `patch` | PATCH, some POST sub-actions |
| `delete` | DELETE |

Some sub-resource actions map to `patch` (for example microservice start/stop). WebSocket routes use verb `get` with method `WS`.

## v3.8 RBAC changes

| v3.7 / legacy | v3.8 |
|---------------|------|
| RBAC resource `flows` | **`applications`** / `systemApplications` |
| `GET /api/v3/fog-types` | **`GET /api/v3/architectures/`** (public) |
| EdgeResource, diagnostics, strace | **Removed** — no yaml entries |
| `POST /api/v3/agent/controller/register` | Added under **`agent`** resource (fog token) |
| OIDC auth routes (OAuth BFF, interactions) | Catalogued under **`users`** with auth-only verbs (`[]`). Profile, change-password, and MFA on the same resource use `get`, `patch`, and `delete` |

Fleet models, fleet Knowledge, RuntimeClass, and microservice templates are user RBAC resources (`models`, `knowledge`, `runtimeClasses`, `microserviceTemplates`). Viewer gets `get`/`list`. SRE, developer, and admin get full CRUD including link (`patch` on `…/:name/link`). Agent `GET /api/v3/agent/models`, `GET /api/v3/agent/knowledge`, and `GET /api/v3/agent/runtimeClasses` are fog-token routes catalogued under **`agent`** for drift auditing only. Catalog `PATCH /api/v3/microservices/:uuid/models` and `PATCH /api/v3/microservices/:uuid/knowledge` stay on the **`microservices`** resource.

Network topology is the `networkTopology` resource. The catalog is GET-only under `/api/v3/network-topology/` (summary, router and NATS overview, nodes, connections, subgraph). Collection and subgraph routes use `list`. A single node and its connections use `get`. SRE has `*`. Developer and viewer have `get` and `list`. Custom roles use the resource name `networkTopology`.

Fog platform retry (`POST /api/v3/iofog/:uuid/reconcile`) is `patch` on `fogs`. Service retry (`POST /api/v3/services/:name/reconcile`) is `patch` on `services`. MQTT bearer create and delete stay on `natsUsers` (`create` / `delete`).

Removed user HAL/USB inventory routes (`GET /api/v3/iofog/:uuid/hal/hw`, `GET /api/v3/iofog/:uuid/hal/usb`) and agent HAL PUT routes have no yaml entries.

Orphan RBAC entries for removed APIs must not reappear. CI and local checks enforce this (see Maintenance).

## Custom roles

Operators can define additional Roles via API or YAML:

- `GET/POST /api/v3/roles`, `GET/PATCH/DELETE /api/v3/roles/:name`
- `GET/POST /api/v3/rolebindings`, `GET/PATCH/DELETE /api/v3/rolebindings/:name`

Custom roles use `apiVersion: datasance.com/v3` and the same resource names as the route catalog. The **admin** system role always wins via `*` rules.

## Maintenance and drift checks

Keep `rbac-resources.yaml`, live routes, and system roles aligned when adding or removing APIs.

```bash
nvm use 24

# Compare Express routes to rbac-resources.yaml
npm run rbac-audit

# grep gates — banned legacy terms must be absent;
# v3.8 terms must be present
rg 'edgeResources|diagnostics' src/config/rbac-resources.yaml && exit 1 || true
rg 'fog-types' src/config/rbac-resources.yaml && exit 1 || true
rg 'architectures|controller/register' src/config/rbac-resources.yaml
```

`npm run rbac-audit` exits non-zero on:

- Live routes missing from the yaml catalog (gaps)
- Yaml entries with no matching route (orphans)
- Banned legacy terms (`edgeResources`, `diagnostics`, `fog-types`)
- Missing required v3.8 terms (`architectures`, `controller/register`)

Optional CI wiring is planned.

## Reference files

| Topic | Path |
|-------|------|
| Route → resource catalog | `src/config/rbac-resources.yaml` |
| System roles | `src/config/rbac-system-roles.js` |
| RBAC middleware | `src/lib/rbac/middleware.js` |
| Authorizer | `src/lib/rbac/authorizer.js` |
| Route inventory (generated) | `node scripts/route-inventory.js` |
| Drift script | `scripts/rbac-audit.js`, `npm run rbac-audit` |
| External IdP client | [external-oidc-client-setup.md](external-oidc-client-setup.md) |
| External IdP groups and providers | [external-oidc-providers.md](external-oidc-providers.md) |
| HTTP API spec | `docs/swagger.yaml` |

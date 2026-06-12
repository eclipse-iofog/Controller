# Controller RBAC — operator reference

**Audience:** Platform operators, SREs, and integrators configuring access to Controller v3.8  
**Applies to:** User and admin HTTP APIs under `/api/v3/*` (not Edgelet agent wire protocol)

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

Group names should match RoleBinding subjects and IdP role names (for example `admin`, `developer`, `viewer`). See [external-oidc-client-setup.md](external-oidc-client-setup.md) for external IdP claim mapping.

### Password-change gate

When the JWT carries `password_change_required`, only these routes are allowed until the user changes their password:

- `GET /api/v3/user/profile`
- `POST /api/v3/user/change-password`

All other RBAC-protected routes return **403**.

## Route classes

| Class | Auth | RBAC check | Examples |
|-------|------|------------|----------|
| **Public** | None | None | `GET /api/v3/status`, `GET /api/v3/architectures/` |
| **Auth-only** | Bearer JWT | Skipped (`verbs: []` in catalog) | `POST /api/v3/user/login`, OAuth BFF routes |
| **User RBAC** | Bearer JWT | Resource + verb from catalog | Most `/api/v3/*` admin APIs |
| **Agent wire** | Fog JWT | Separate from user RBAC | `/api/v3/agent/*` |

Routes with an **empty verb list** (`[]`) are catalogued for inventory but do not trigger an RBAC rule lookup; they still require authentication when the route handler is behind OIDC middleware.

**Agent routes** (`/api/v3/agent/*`) use fog provisioning tokens, not user OIDC RBAC. They are listed under the `agent` resource in `rbac-resources.yaml` for drift auditing only. The `agent-admin` system role applies to Edgelet service-account APIs (`edgelet.iofog.org/v1`), not to human users calling the Controller API.

## System roles

| Role | Scope | Typical use |
|------|-------|-------------|
| **admin** | `resources: ['*'], verbs: ['*']` | Full cluster administration; cannot be modified or deleted |
| **sre** | Full access to operational resources; read-only on `roles`, `roleBindings`, `natsOperator`, `natsBootstrap`, `natsHub` | Day-2 operations, NATS, cluster, exec/logs |
| **developer** | CRUD on workloads (microservices, applications, catalog, secrets, …); read-only on infra (fogs, router, cluster, NATS operator, system logs, …) | Application developers |
| **viewer** | `get`, `list` on read-only resource set | Read-only dashboards |
| **agent-admin** | `edgelet.iofog.org/v1` `*` | Edgelet service accounts (not human API users) |
| **microservice** | Limited self-service endpoints on Edgelet API group | Running microservice workloads |

### Resource coverage by system role

The table below lists **user API** resources in `rbac-resources.yaml` and which system roles include them. Resources marked *admin only* or *agent wire* are not granted to SRE/developer/viewer by default.

| Resource | SRE | Developer | Viewer | Notes |
|----------|-----|-----------|--------|-------|
| microservices | ✓ | ✓ | ✓ | |
| systemMicroservices | ✓ | read | ✓ | |
| fogs | ✓ | read | ✓ | |
| applications | ✓ | ✓ | ✓ | Replaces legacy `flows` |
| systemApplications | ✓ | read | ✓ | |
| applicationTemplates | ✓ | ✓ | ✓ | |
| services | ✓ | ✓ | ✓ | |
| router | ✓ | read | ✓ | |
| cluster | ✓ | read | ✓ | v3.8 HA controllers |
| natsOperator, natsBootstrap, natsHub | read / ✓ | read | read | SRE has full NATS CRUD except operator objects (read) |
| natsAccounts, natsUsers, natsAccountRules, natsUserRules | ✓ | ✓ | ✓ | |
| catalog, registries | ✓ | ✓ | ✓ | |
| secrets, configMaps, volumeMounts | ✓ | ✓ | ✓ | |
| tunnels | ✓ | read | — | Viewer intentionally omits exec/tunnel paths |
| certificates, capabilities | ✓ | ✓ | ✓ | |
| execSessions, logs | ✓ | ✓ | — | |
| systemExecSessions, systemLogs | ✓ | read | — | |
| events | ✓ | — | — | SRE-only operational events |
| users (profile/MFA) | ✓ | — | — | User self-service routes use auth-only verbs |
| authUsers, authGroups | ✓ | read | read | Embedded identity admin |
| config, controller | ✓ | read | read | `controller` = status/architectures public routes |
| roles, roleBindings | read | read | read | Mutations require admin or custom roles |
| serviceAccounts | ✓ | ✓ | ✓ | |
| authAdmin | — | — | — | *Admin only* — JWKS rotate, auth migration |
| agent | — | — | — | *Agent wire* — fog token, not user RBAC |

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
| OIDC auth routes (OAuth BFF, interactions) | Catalogued under **`users`** with auth-only verbs |

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

# Compare Express routes to rbac-resources.yaml (243 routes as of Plan 9)
npm run rbac-audit

# Plan 9 grep gates — banned legacy terms must be absent;
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

Optional CI wiring is planned for Plan 11.

## Reference files

| Topic | Path |
|-------|------|
| Route → resource catalog | `src/config/rbac-resources.yaml` |
| System roles | `src/config/rbac-system-roles.js` |
| RBAC middleware | `src/lib/rbac/middleware.js` |
| Authorizer | `src/lib/rbac/authorizer.js` |
| Route inventory (generated) | `node scripts/route-inventory.js` |
| Drift script | `scripts/rbac-audit.js`, `npm run rbac-audit` |
| External IdP groups | `docs/external-oidc-client-setup.md` |
| HTTP API spec | `docs/swagger.yaml` |

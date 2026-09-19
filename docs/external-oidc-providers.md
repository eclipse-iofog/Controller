# External OIDC providers — groups, roles, and IdP recipes

**Audience:** IdP and platform administrators  
**Controller mode:** `AUTH_MODE=external`

This page maps IdP groups and roles onto Controller RBAC and gives setup recipes for common OpenID Connect providers. Register the OIDC **client** first using [external-oidc-client-setup.md](external-oidc-client-setup.md) (confidential client, PKCE S256, redirect URI, scopes, access-token `aud`).

System role permissions: [rbac-reference.md](rbac-reference.md).

## Default groups and roles

Controller ships four **human** system roles. Names are matched **case-insensitively** and compared in **lowercase**.

| IdP group or role name | Controller system role | Typical use |
|------------------------|------------------------|-------------|
| `admin` | **admin** | Full cluster administration (`resources: ['*']`, `verbs: ['*']`) |
| `sre` | **sre** | Day-2 operations; read-only on `roles`, `roleBindings`, and some NATS operator objects |
| `developer` | **developer** | CRUD on workloads; read-only on infra |
| `viewer` | **viewer** | `get` / `list` only; no exec, tunnels, or events |

Create these four names as **groups**, **client roles**, or **application roles** on the IdP, then assign users there. That is the intended drop-in setup.

Two more system roles exist but must **not** be assigned to human IdP users:

| Name | Purpose |
|------|---------|
| `agent-admin` | Edgelet service accounts (`edgelet.iofog.org/v1`) |
| `microservice` | Limited self-service for running workloads |

Embedded mode also seeds `AuthGroups` rows named `admin`, `sre`, `developer`, and `viewer`. Those table rows are for **embedded** user membership. In **external** mode they are not consulted for login; JWT claims are the source of Group subjects.

### Direct mapping (no RoleBinding)

If the **access** token contains a group or role whose name is exactly `admin`, `sre`, `developer`, or `viewer`, Controller grants that system role immediately. You do not need a RoleBinding.

Custom IdP names (`Platform Admins`, Entra group object IDs, Keycloak paths like `/admin`) do **not** match. Either:

- Change the IdP mapper so the claim value is `admin` / `sre` / `developer` / `viewer`, or
- Create a Controller RoleBinding whose Group subject is the **exact lowercase claim value**.

### How Controller reads the access token

Group subjects (`src/lib/rbac/middleware.js`), all lowercased:

1. `resource_access[{OIDC_CLIENT_ID}].roles` — Keycloak-style **client roles** (recommended on Keycloak)
2. Top-level `roles` array — Entra app roles; many Okta/Auth0 mappings
3. Top-level `groups` array — `groups` scope / group mapper

Namespaced claims such as `https://controller.example.com/groups` are **not** read. Map them to `groups` or `roles`.

ID-token-only claims are ignored for API authorization. The same claims must appear on the **access** token.

User subject (first match): `preferred_username` → `username` → `email` → `sub`.

If you bind a **User** (not Group) RoleBinding, the `name` must match that first non-empty claim. Entra `preferred_username` is usually the UPN. Keycloak’s is often a short username, not email.

### Optional RoleBindings for custom names

When the token cannot emit the four system names:

```yaml
apiVersion: datasance.com/v3
kind: RoleBinding
metadata:
  name: platform-admins-admin
subjects:
  - kind: Group
    name: platform-admins
roleRef:
  kind: Role
  name: admin
```

User binding (when groups cannot be put in the token):

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

The User `name` must match the JWT user claim described above.

## Switching from embedded to external

1. Export users/groups: `POST /api/v3/auth/migration/export` (no password hashes).
2. Create matching users and groups (`admin` / `sre` / `developer` / `viewer`) on the IdP.
3. Switch env to `AUTH_MODE=external` plus issuer and client credentials ([client setup](external-oidc-client-setup.md)).
4. **External → embedded is not supported.**

Assign at least one operator to `admin` before cutting over.

---

## Provider recipes

Every recipe assumes the confidential client, redirect URI, and hardcoded scopes from [external-oidc-client-setup.md](external-oidc-client-setup.md):

```text
openid profile email groups offline_access
```

Access token `aud` must equal `OIDC_CLIENT_ID`.

### Keycloak

**Issuer**

```text
https://auth.example.com/realms/{realm}
```

**Client** (`pot-controller` or your `OIDC_CLIENT_ID`)

| Setting | Value |
|---------|-------|
| Client authentication | On (confidential) |
| Standard flow | On |
| Direct access grants | On (if CLI login is required) |
| Implicit | Off |
| PKCE Method | S256 |
| Valid redirect URIs | `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback` |
| Web origins | `{CONSOLE_URL}` |
| Default scopes | `openid`, `profile`, `email`, `roles` |
| Optional scopes | `groups`, `offline_access` |

**RBAC (pick one)**

- **Option A (simplest):** Client roles on this client named `admin`, `sre`, `developer`, `viewer`. The default `roles` scope puts them in `resource_access[{clientId}].roles`.
- **Option B:** Realm client scope named exactly `groups`. Group Membership mapper: claim name `groups`, **full group path = OFF** so the claim is `admin`, not `/admin`.

Realm roles in a top-level `roles` array also work if you add that mapper to the access token.

### Microsoft Entra ID (Azure AD)

**Issuer** (v2)

```text
https://login.microsoftonline.com/{tenant-id}/v2.0
```

**App registration**

| Setting | Value |
|---------|-------|
| Application type | **Web** (confidential), not SPA |
| Redirect URI | `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback` (platform **Web**) |
| Certificates & secrets | Client secret → `OIDC_CLIENT_SECRET` |
| `OIDC_CLIENT_ID` | Application (client) ID |
| Allow public client flows | On **only** if you need ROPC for potctl |
| Implicit | Off |

**Audience.** Entra issues a Microsoft Graph access token if the client only requests OIDC scopes. Controller then rejects `aud`. To make `aud` the application ID:

1. **Expose an API** on the same app.
2. Prefer an Application ID URI that yields access tokens whose `aud` is the **application (client) ID**.
3. Add a scope whose **short name is `groups`** so the authorize request is accepted.
4. Authorize this same app to that scope.
5. Confirm a decoded access token has `"aud": "<application-id>"` and is a JWT.

If Entra will only accept full-URI scopes (`api://<id>/groups`), authorize returns `invalid_scope` because Controller always requests the short name `groups`.

**RBAC (recommended: App roles, not directory groups).** Directory `groups` claims are often **object GUIDs**, and large tenants hit the groups overage claim (no array). Controller only reads a `groups` **array** of names.

Define **App roles** (allowed member type: Users/Groups) with **values**:

```text
admin
sre
developer
viewer
```

Assign users or security groups to those app roles. Entra puts them on the access token as:

```json
"roles": ["admin"]
```

Controller maps `roles[]` to Group subjects. No RoleBinding needed.

**ROPC:** Microsoft is deprecating this grant. Treat CLI password login as optional; prefer Console OAuth.

### Okta

**Issuer** (custom authorization server recommended)

```text
https://{okta-domain}/oauth2/{authorizationServerId}
```

**Application**

| Setting | Value |
|---------|-------|
| Sign-in method | OIDC |
| Application type | **Web** |
| Grant types | Authorization Code, Refresh Token, and Resource Owner Password if CLI is required |
| Client authentication | Client secret |
| Sign-in redirect | `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback` |
| Trusted origins | `{CONSOLE_URL}` as needed |

**Audience:** the authorization server **Audience** must be the **client ID**. The Okta default `api://default` fails JWT `aud` checks.

**Scopes:** add a custom scope named `groups` on that authorization server, plus `offline_access`.

**Claims:** on the **access token**, add claim `groups` (or `roles`) whose value is group names, filtered to `admin`, `sre`, `developer`, `viewer`. ID-token-only claims are not enough.

Create Okta groups with those same names and assign users.

### Auth0 (and similar “API + application” IdPs)

1. Create a **Regular Web Application** (confidential).
2. Create an **API** whose **identifier is exactly `OIDC_CLIENT_ID`** so `aud` matches.
3. On that API, add a permission/scope named `groups`.
4. Enable Authorization Code, Refresh Token, and Password (if CLI).
5. Enable RBAC on the API; add roles named `admin`, `sre`, `developer`, `viewer`.
6. Add a Login / post-login Action that copies roles onto the **access token** as `roles` or `groups` (not a namespaced claim).
7. Without an API audience, Auth0 often returns an **opaque** access token — Controller cannot validate that.

### Generic OpenID Connect

Any provider works if it satisfies this contract:

| Requirement | Value |
|-------------|--------|
| Discovery | `{issuer}/.well-known/openid-configuration` |
| Client | Confidential + secret |
| Code flow | Authorization code + PKCE S256 |
| Refresh | `offline_access` |
| Password grant | Only if CLI login is required |
| Redirect | `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback` |
| Access token | JWT, `aud` = client ID |
| Groups | `resource_access[clientId].roles` **or** `roles[]` **or** `groups[]` with names `admin` / `sre` / `developer` / `viewer` |

---

## Verification (RBAC)

After [client-setup verification](external-oidc-client-setup.md#verification):

1. Decode the access token and confirm one of `resource_access`, `roles`, or `groups` contains `admin`, `sre`, `developer`, or `viewer`.
2. Sign in as `viewer`: list applications succeeds; mutating routes return 403.
3. Sign in as `admin`: admin-only routes (for example JWKS rotate is embedded-only; role mutations) succeed per [rbac-reference.md](rbac-reference.md).

## Troubleshooting (groups and roles)

| Symptom | Likely cause |
|---------|----------------|
| 403 after a successful login | Claims on the ID token only; Keycloak **full group path** left on (`/admin` ≠ `admin`); Entra group **GUIDs**; Auth0 namespaced claims |
| Login works, no groups in token | `groups` / `roles` mapper not added to the **access** token; client roles not assigned to the user |
| `aud` is Graph or `api://default` | See Entra and Okta audience notes above |
| User RoleBinding never matches | Binding uses email but JWT User subject is `preferred_username` |

## Related documentation

| Document | Topic |
|----------|-------|
| [external-oidc-client-setup.md](external-oidc-client-setup.md) | Confidential client, grants, scopes, redirect URI, access-token `aud` |
| [oidc-configuration.md](oidc-configuration.md) | Auth modes and environment variables |
| [rbac-reference.md](rbac-reference.md) | System roles, verbs, custom RoleBindings |
| [swagger.yaml](swagger.yaml) | User and RBAC HTTP APIs |

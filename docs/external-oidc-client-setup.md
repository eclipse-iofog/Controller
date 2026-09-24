# External OIDC provider — client setup for Controller

**Audience:** Platform and IdP administrators  
**Controller mode:** `AUTH_MODE=external`  
**Applies to:** Any OIDC-compliant provider (Keycloak, Microsoft Entra ID, Okta, Auth0, and similar)

This page is the **OIDC client contract**: client type, grants, redirect URIs, scopes, and access-token rules. For default groups/roles and per-provider recipes, see [external-oidc-providers.md](external-oidc-providers.md). Operator env and login flows: [oidc-configuration.md](oidc-configuration.md).

## Overview

Controller uses **one confidential** OIDC client for browser and CLI authentication when `AUTH_MODE=external`. The EdgeOps Console does not talk to the IdP as a public SPA. Controller is an OAuth BFF for the browser and a password-grant front door for the CLI.

| Use case | Grant / flow | Controller endpoint |
|----------|--------------|---------------------|
| Browser (EdgeOps Console) | Authorization code + PKCE S256 | `GET /api/v3/user/oauth/authorize` → IdP → `GET /api/v3/user/oauth/callback` |
| CLI (potctl) | Resource owner password (direct access) | `POST /api/v3/user/login` |
| Session refresh | Refresh token | `POST /api/v3/user/refresh` |
| Profile | Bearer access token (+ UserInfo) | `GET /api/v3/user/profile` |
| User APIs and operator WebSockets | Bearer access JWT | `/api/v3/*` except agent routes |
| Agent routes | Fog token | `/api/v3/agent/*` — OIDC does **not** apply |

In external mode:

- Access and refresh tokens are **issued by the IdP**. Controller does not mint them.
- Controller validates **access** JWTs via the issuer JWKS (`aud` must be `OIDC_CLIENT_ID`).
- There is **no local `AuthUsers` row** for IdP users. RBAC comes from JWT claims (and optional RoleBindings).
- MFA, password policy, and forced password change are **owned by the IdP**. Controller does not run embedded interaction UI in this mode.

## Controller environment (minimum)

| Variable | Required | Example |
|----------|----------|---------|
| `AUTH_MODE` | Yes | `external` |
| `OIDC_ISSUER_URL` | Yes | Full issuer URL (see [providers](external-oidc-providers.md)) |
| `OIDC_CLIENT_ID` | Yes | `pot-controller` |
| `OIDC_CLIENT_SECRET` | Yes | Confidential client secret |
| `CONTROLLER_PUBLIC_URL` | Yes | `https://controller.example.com` |
| `CONSOLE_URL` | Yes (browser login) | `https://console.example.com` |
| `TRUST_PROXY` | When TLS terminates at ingress | `true` |
| `AUTH_SESSION_STORE_TYPE` | HA + browser login | `database` (mysql/postgres) |
| `AUTH_INSECURE_ALLOW_HTTP` | Development only | `true` when using `http://localhost:*` |

`OIDC_ISSUER_URL` must be the **issuer string**, not a generic IdP homepage. Discovery is:

```text
GET {OIDC_ISSUER_URL}/.well-known/openid-configuration
```

Do **not** set legacy `KC_*`, `auth.realm`, or `auth.realmKey`.

Optional `OIDC_CONSOLE_CLIENT_ID` / `AUTH_CONSOLE_CLIENT_ENABLED` registers a **future SPA-direct** public client. Default is **off**. Primary Console login uses this confidential Controller client via the BFF. Do not point Console at a second public client unless you intend to enable that path.

## IdP client — required settings

### Client type

Create **one** client for Controller. Do not use a public SPA, native, or device client as this client.

| Setting | Required value | Why |
|---------|----------------|-----|
| Protocol | OpenID Connect | Controller is OIDC-only |
| Client type | **Confidential** (web application) | BFF uses `OIDC_CLIENT_SECRET` at the token endpoint |
| Client authentication | `client_secret_basic` or `client_secret_post` | Public (`none`) is not supported |
| PKCE | **S256 required or allowed** | Browser authorize always sends `code_challenge_method=S256` |
| Implicit / hybrid | **Off** | Not used |
| Device code | Off | Not used |
| Client credentials grant | Unused | Not used for operator login |

### Enabled grant types / flows

| Flow | Required for | Notes |
|------|--------------|-------|
| Standard flow (authorization code) | Browser Sign in | Required |
| Refresh token (`offline_access`) | Console/CLI session refresh | Required for `POST /api/v3/user/refresh` |
| Direct access grants (ROPC) | CLI `POST /user/login` | Required if potctl uses password login against the IdP |
| Implicit flow | — | Off (not used) |

If your organization has disabled ROPC (common on Entra ID), browser login still works; CLI password login will not.

### PKCE

Controller always sends PKCE S256 on browser authorize (`code_challenge`, `code_challenge_method=S256`).

| Provider | Setting |
|----------|---------|
| Keycloak | PKCE Method = **S256** (Capability config) |
| Others | Allow or require PKCE S256 on the authorization code flow |

Disabling PKCE on the IdP is a development workaround only, not recommended for production.

### Redirect URIs

Register exactly as a **Web** redirect URI (not SPA):

```text
{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback
```

Examples:

- Production: `https://controller.example.com/api/v3/user/oauth/callback`
- Local: `http://localhost:51121/api/v3/user/oauth/callback`

Avoid overly broad wildcards in production.

### Web origins (CORS)

If the Console calls the Controller API from a different origin, allow:

```text
{CONSOLE_URL}
```

Example: `http://localhost:3000` or `https://console.example.com`

## Scopes

### Requested by Controller (browser OAuth BFF)

Controller sends this scope string on authorize (not configurable):

```text
openid profile email groups offline_access
```

| Scope | Purpose |
|-------|---------|
| `openid` | OIDC baseline; `sub`, `id_token` |
| `profile` | `preferred_username`, display name |
| `email` | Email claim; identity linking |
| `groups` | RBAC group membership — name must be **`groups`**, not `group` |
| `offline_access` | Refresh token on authorization code flow |

### IdP client scope assignment

Every requested scope must be assigned to the client as a **default** and/or **optional** client scope.

| Scope | Typical assignment |
|-------|-------------------|
| `openid`, `profile`, `email`, `roles` | Default |
| `groups` | Optional (scope name must be **`groups`**) |
| `offline_access` | Optional |

**Common error:** `invalid_scope` when a scope is requested but not assigned to the client, when the scope name is wrong (`group` vs `groups`), or when the provider only accepts a full URI scope (`api://…/groups`) instead of the short name `groups`.

## Access token requirements

Controller validates the **access token**, not the ID token, on API calls. Groups and roles on the ID token alone are ignored for authorization.

The access token **must**:

1. Be a **JWT** (opaque tokens fail).
2. Have `iss` equal to the discovered issuer.
3. Have `aud` equal to **`OIDC_CLIENT_ID`** (string or array containing it).
4. Carry RBAC claims on the **access** token (see [external-oidc-providers.md](external-oidc-providers.md)).
5. Not be a refresh token (`token_use` must not be `refresh`).

If `aud` is Microsoft Graph, Okta `api://default`, or any API identifier that is **not** the client ID, Bearer validation fails and APIs return 401.

## Issuer discovery (minimum metadata)

The issuer at `OIDC_ISSUER_URL` must expose:

| Endpoint | Used for |
|----------|----------|
| `authorization_endpoint` | Browser OAuth BFF |
| `token_endpoint` | Code exchange, ROPC, refresh |
| `jwks_uri` | Bearer JWT validation |
| `userinfo_endpoint` | `GET /user/profile` in external mode |
| `revocation_endpoint` | Optional; best-effort logout |

## Groups, roles, and user identity

Create IdP groups or application roles named `admin`, `sre`, `developer`, and `viewer`. Those names map **directly** to Controller system roles (no RoleBinding required). Full mapping, claim order, and Keycloak / Entra ID / Okta / Auth0 recipes: [external-oidc-providers.md](external-oidc-providers.md).

**User** subject (first match): `preferred_username` → `username` → `email` → `sub`.

**Group** subjects from the access token (all lowercased):

1. `resource_access[{OIDC_CLIENT_ID}].roles`
2. Top-level `roles` array
3. Top-level `groups` array

## MFA and forced password change

- **Browser:** enforced by the IdP during authorize (for example Keycloak required action `UPDATE_PASSWORD`)
- **CLI:** IdP password-grant policy applies
- Controller does not run embedded interaction UI in external mode

## High availability

For multiple Controller replicas with browser login, set `AUTH_SESSION_STORE_TYPE=database` (mysql/postgres) so OAuth `state` and the PKCE verifier survive any replica. `memory` is only safe for a single replica.

## Verification

### Browser

1. Console Sign in → IdP login page (no `invalid_scope` or PKCE errors)
2. Callback → `{CONSOLE_URL}/login#accessToken=...&refreshToken=...`
3. Decode the **access** token: `aud` is `OIDC_CLIENT_ID`; `iss` matches the issuer; `roles` / `groups` / `resource_access` contains a system role name
4. `GET /api/v3/user/profile` with `Authorization: Bearer <accessToken>` → 200

### CLI

```bash
curl -sS -X POST '{CONTROLLER_PUBLIC_URL}/api/v3/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"<login-id>","password":"<pass>","totp":""}'
```

`email` is the IdP **login identifier** (username or UPN). Expect `{ "accessToken", "refreshToken" }` (IdP tokens).

### Refresh

```bash
curl -sS -X POST '{CONTROLLER_PUBLIC_URL}/api/v3/user/refresh' \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh>"}'
```

## Troubleshooting

| Error | Likely cause |
|-------|----------------|
| `invalid_scope` | Missing `groups` or `offline_access` on the client; wrong scope name (`group` vs `groups`); provider requires a full URI scope |
| `Missing parameter: code_challenge_method` | PKCE required on IdP but not sent by Controller (upgrade Controller) |
| `redirect_uri` mismatch | Callback URL not registered exactly; URI registered as SPA instead of Web |
| Login works, no `refreshToken` in browser hash | `offline_access` not requested or not assigned on the IdP client |
| 401 on API routes after login | Opaque access token; `aud` is not `OIDC_CLIENT_ID`; wrong `iss` |
| 403 on API routes | Token valid but RBAC groups/roles not on the **access** token; see [external-oidc-providers.md](external-oidc-providers.md) |
| CLI login fails, browser works | ROPC / direct access grants disabled |
| OAuth `state` errors on HA | `AUTH_SESSION_STORE_TYPE` still `memory` |

## Related documentation

| Document | Topic |
|----------|-------|
| [external-oidc-providers.md](external-oidc-providers.md) | Default groups/roles; Keycloak, Entra ID, Okta, Auth0 recipes |
| [oidc-configuration.md](oidc-configuration.md) | Auth modes and environment variables |
| [rbac-reference.md](rbac-reference.md) | System roles, verbs, RoleBindings |
| [swagger.yaml](swagger.yaml) | `/user/oauth/authorize`, `/user/oauth/callback`, `/user/login`, `/user/refresh`, `/user/profile` |

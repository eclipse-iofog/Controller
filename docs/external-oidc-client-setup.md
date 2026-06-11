# External OIDC provider — minimum client setup for Controller

**Audience:** Platform and IdP administrators  
**Controller mode:** `AUTH_MODE=external`  
**Applies to:** Any OIDC-compliant provider (Keycloak, Auth0, Okta, Azure AD, etc.)

## Overview

Controller uses one **confidential** OIDC client for browser and CLI authentication when `AUTH_MODE=external`.

| Use case | Grant / flow | Controller endpoint |
|----------|--------------|---------------------|
| Browser (ECN Viewer) | Authorization code + PKCE S256 | `GET /api/v3/user/oauth/authorize` → IdP → `GET /api/v3/user/oauth/callback` |
| CLI (potctl) | Resource owner password (direct access) | `POST /api/v3/user/login` |
| Session refresh | Refresh token | `POST /api/v3/user/refresh` |
| Profile | Bearer access token (+ UserInfo) | `GET /api/v3/user/profile` |

In external mode, access and refresh tokens are **issued by the IdP**. Controller validates access JWTs via the issuer JWKS and maps claims to RBAC.

## Controller environment (minimum)

| Variable | Required | Example |
|----------|----------|---------|
| `AUTH_MODE` | Yes | `external` |
| `OIDC_ISSUER_URL` | Yes | `https://auth.example.com/realms/myrealm` |
| `OIDC_CLIENT_ID` | Yes | `pot-controller` |
| `OIDC_CLIENT_SECRET` | Yes | Confidential client secret |
| `CONTROLLER_PUBLIC_URL` | Yes | `https://controller.example.com` |
| `VIEWER_URL` | Yes (browser login) | `https://viewer.example.com` |
| `AUTH_INSECURE_ALLOW_HTTP` | Development only | `true` when using `http://localhost:*` |

## IdP client — required settings

### Client type

- OpenID Connect
- **Confidential client** (client authentication enabled; uses `OIDC_CLIENT_SECRET`)
- Public clients are not supported for the Controller OAuth BFF

### Enabled grant types / flows

| Flow | Required for | Notes |
|------|--------------|-------|
| Standard flow (authorization code) | Browser Sign in | Required |
| Direct access grants (ROPC) | CLI `POST /user/login` | Required if potctl uses password login against the IdP |
| Implicit flow | — | Off (not used) |

### PKCE

Controller always sends PKCE S256 on browser authorize (`code_challenge`, `code_challenge_method=S256`).

| Provider | Setting |
|----------|---------|
| Keycloak | PKCE Method = **S256** (Capability config) |
| Others | Allow or require PKCE S256 on the authorization code flow |

Disabling PKCE on the IdP is a development workaround only, not recommended for production.

### Redirect URIs

Register exactly:

```text
{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback
```

Examples:

- Production: `https://controller.example.com/api/v3/user/oauth/callback`
- Local: `http://localhost:51121/api/v3/user/oauth/callback`

Avoid overly broad wildcards in production.

### Web origins (CORS)

If the Viewer calls the Controller API from the browser, allow:

```text
{VIEWER_URL}
```

Example: `http://localhost:3000`

## Scopes

### Requested by Controller (browser OAuth BFF)

Controller sends this scope string on authorize:

```text
openid profile email groups offline_access
```

| Scope | Purpose |
|-------|---------|
| `openid` | OIDC baseline; `sub`, `id_token` |
| `profile` | `preferred_username`, display name |
| `email` | Email claim; identity linking |
| `groups` | RBAC group membership (see below) |
| `offline_access` | Refresh token on authorization code flow |

### IdP client scope assignment

Every requested scope must be assigned to the client as a **default** and/or **optional** client scope.

| Scope | Typical assignment |
|-------|-------------------|
| `openid`, `profile`, `email`, `roles` | Default |
| `groups` | Optional (scope name must be **`groups`**, not `group`) |
| `offline_access` | Optional |

**Common error:** `invalid_scope` when a scope is requested but not assigned to the client, or when the scope name is wrong (`group` vs `groups`).

## RBAC / groups mapping

Controller resolves RBAC **Group** subjects from the access token (in order):

1. `resource_access[{OIDC_CLIENT_ID}].roles` — Keycloak client roles (recommended)
2. Top-level `roles` array (if present)
3. `groups` array — from the `groups` scope and a group mapper

Group names are lowercased before RBAC lookup. IdP role and group names should align with Controller RBAC groups (for example `admin`, `viewer`).

### Keycloak options

**Option A — Client roles (simplest)**  
Assign roles on the client matching `OIDC_CLIENT_ID`. The default `roles` scope adds `resource_access` to the token.

**Option B — `groups` scope**  
Create a realm client scope named exactly `groups`. Add a Group Membership or Realm Role mapper that emits a `groups` claim.

### User identity (User subject)

Controller reads the User subject from JWT claims (first match):

`preferred_username` → `username` → `email` → `sub`

Ensure at least one stable identifier is present for RBAC User bindings.

## Issuer discovery (minimum metadata)

The issuer at `OIDC_ISSUER_URL` must expose:

| Endpoint | Used for |
|----------|----------|
| `authorization_endpoint` | Browser OAuth BFF |
| `token_endpoint` | Code exchange, ROPC, refresh |
| `jwks_uri` | Bearer JWT validation |
| `userinfo_endpoint` | `GET /user/profile` in external mode |
| `revocation_endpoint` | Optional; best-effort logout |

## Keycloak checklist

Example client: `pot-controller`

| Setting | Value |
|---------|-------|
| Client authentication | On |
| Standard flow | On |
| Direct access grants | On (if CLI login is required) |
| PKCE Method | S256 |
| Valid redirect URIs | `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback` |
| Web origins | `{VIEWER_URL}` |
| Client scopes | `openid`, `profile`, `email`, `roles` (default); `groups`, `offline_access` (optional) |

### MFA and forced password change

- **Browser:** enforced by the IdP during authorize (for example Keycloak required action `UPDATE_PASSWORD`)
- **CLI:** IdP password-grant policy applies
- Controller does not run embedded interaction UI in external mode

## Verification

### Browser

1. Viewer Sign in → IdP login page (no `invalid_scope` or PKCE errors)
2. Callback → `{VIEWER_URL}/login#accessToken=...&refreshToken=...`
3. `GET /api/v3/user/profile` with `Authorization: Bearer <accessToken>` → 200

### CLI

```bash
curl -sS -X POST '{CONTROLLER_PUBLIC_URL}/api/v3/user/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"<user>","password":"<pass>","totp":""}'
```

Expect `{ "accessToken", "refreshToken" }` (IdP tokens).

### Refresh

```bash
curl -sS -X POST '{CONTROLLER_PUBLIC_URL}/api/v3/user/refresh' \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh>"}'
```

## Troubleshooting

| Error | Likely cause |
|-------|----------------|
| `invalid_scope` | Missing `groups` or `offline_access` on the client; wrong scope name (`group` vs `groups`) |
| `Missing parameter: code_challenge_method` | PKCE required on IdP but not sent by Controller (upgrade Controller) |
| `redirect_uri` mismatch | Callback URL not registered exactly |
| Login works, no `refreshToken` in browser hash | `offline_access` not requested or not assigned on the IdP client |
| 403 on API routes | Token valid but RBAC groups/roles not mapped; check client roles or `groups` claim |

## Related API documentation

See `docs/swagger.yaml` for `/user/oauth/authorize`, `/user/oauth/callback`, `/user/login`, `/user/refresh`, and `/user/profile`.

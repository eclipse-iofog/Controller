# Controller OIDC — operator configuration

**Audience:** Platform operators and IdP administrators  
**Release:** v3.8.0

Controller v3.8 replaces Keycloak-specific integration with **generic OIDC**. User routes and operator WebSockets require Bearer JWTs validated via JWKS discovery. **Agent routes** (`/api/v3/agent/*`) keep fog-token auth — OIDC does not apply to field agents.

---

## Auth modes

| Mode | Env | Issuer | Typical use |
|------|-----|--------|-------------|
| **Embedded** | `AUTH_MODE=embedded` | `{CONTROLLER_PUBLIC_URL}/oidc` (in-process) | Single-node or HA with mysql/postgres; built-in users and MFA |
| **External** | `AUTH_MODE=external` | `OIDC_ISSUER_URL` (third-party IdP) | Enterprise IdP (Keycloak, Auth0, Okta, Azure AD, …) |

Set **`CONTROLLER_PUBLIC_URL`** to the URL clients use to reach Controller (HTTPS in production). Behind a reverse proxy, also set **`TRUST_PROXY=true`** so redirects and issuer URLs honor `X-Forwarded-*` headers.

Development with `http://localhost:*` requires **`AUTH_INSECURE_ALLOW_HTTP=true`**.

---

## Environment variables

Canonical names map to `config.yaml` under `auth.*` (see `src/config/env-mapping.js`).

### Core

| Variable | Mode | Required | Purpose |
|----------|------|----------|---------|
| `AUTH_MODE` | both | Yes | `embedded` or `external` |
| `CONTROLLER_PUBLIC_URL` | both | Yes | External URL; embedded issuer base |
| `TRUST_PROXY` | both | When proxied | Honor forwarded headers |
| `OIDC_ISSUER_URL` | external | Yes | Full issuer URL (e.g. `https://auth.example.com/realms/myrealm`) |
| `OIDC_CLIENT_ID` | both | Yes | Confidential API client (default embedded: `controller`) |
| `OIDC_CLIENT_SECRET` | both | external required; embedded optional | Client secret for token exchange |
| `CONSOLE_URL` | both | Recommended | EdgeOps Console browser origin (defaults to public URL) |
| `CONSOLE_PORT` | both | Optional | Console listener (default **8008**) |

### Embedded bootstrap (first install)

| Variable | Purpose |
|----------|---------|
| `OIDC_BOOTSTRAP_ADMIN_USERNAME` | Initial admin login name |
| `OIDC_BOOTSTRAP_ADMIN_PASSWORD` | Initial admin password |
| `AUTH_INSECURE_ALLOW_BOOTSTRAP_LOG` | Log bootstrap creds once (dev only; default off) |

Bootstrap runs on startup when no admin exists, or **reconciles** when env credentials change (greenfield — old bootstrap user is replaced).

### Optional Console public client

| Variable | Purpose |
|----------|---------|
| `OIDC_CONSOLE_CLIENT_ID` | Separate public OIDC client for future SPA-direct flows |
| `AUTH_CONSOLE_CLIENT_ENABLED` | Enable Console client registration (default off) |

Primary browser login uses the Controller OAuth BFF, not a separate Console OIDC client.

### Rate limiting and sessions (OAuth BFF)

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTH_RATE_LIMIT_ENABLED` | `true` | Rate limit auth endpoints |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `60` | Requests per window per IP |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window (ms) |
| `AUTH_SESSION_STORE_TYPE` | `memory` | `memory` or `database` (auto database for mysql/postgres) |
| `AUTH_SESSION_STORE_TTL_MS` | `600000` | BFF OAuth session TTL |
| `AUTH_SESSION_SECRET` | auto | Session cookie signing secret |

For HA Controller replicas with external IdP browser login, use **`AUTH_SESSION_STORE_TYPE=database`** (mysql/postgres) so OAuth `state` survives any replica.

### Token TTL overrides (embedded)

| Variable | Maps to |
|----------|---------|
| `AUTH_ACCESS_TOKEN_TTL_SECONDS` | Access token lifetime |
| `AUTH_REFRESH_TOKEN_TTL_SECONDS` | Refresh token lifetime |
| `AUTH_OIDC_INTERACTION_TTL_SECONDS` | Embedded interaction UI TTL |
| `AUTH_OIDC_GRANT_TTL_SECONDS` | Grant record TTL |
| `AUTH_OIDC_SESSION_TTL_SECONDS` | OIDC provider session TTL |
| `AUTH_OIDC_ID_TOKEN_TTL_SECONDS` | ID token TTL |

### Removed (do not set)

| Legacy | Replacement |
|--------|-------------|
| `KC_URL`, `KC_REALM`, `KC_CLIENT_ID`, `KC_CLIENT_SECRET` | `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` |
| `auth.realm`, `auth.realmKey` | JWKS via issuer discovery |
| `OIDC_VIEWER_CLIENT_ID` | `OIDC_CONSOLE_CLIENT_ID` |
| `SSL_*` | `TLS_*` |

---

## Login flows

### Browser (EdgeOps Console)

Both modes use the **OAuth BFF** — the Console must not POST passwords from the browser.

1. User clicks Sign in → `GET /api/v3/user/oauth/authorize`
2. **External:** redirect to IdP (authorization code + PKCE S256)
3. **Embedded:** redirect to embedded interaction UI at `{CONSOLE_URL}/login/oauth?interaction=<uid>`
4. Callback: `GET /api/v3/user/oauth/callback`
5. Tokens delivered to `{CONSOLE_URL}/login#accessToken=...&refreshToken=...`

Register this redirect URI at the external IdP:

```text
{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback
```

At startup Controller writes `EDGEOPS_CONSOLE_PATH/controller-config.js` with `consoleUrl` and relative auth endpoint paths (no `keycloak*` keys).

### CLI (potctl / automation)

```http
POST /api/v3/user/login
Content-Type: application/json

{ "email": "<login-id>", "password": "<pass>", "totp": "<code-or-empty>" }
```

- **Embedded:** Controller validates against local users; MFA required for `admin` group.
- **External:** password grant against the IdP (IdP must allow direct access grants if CLI login is used).

Refresh: `POST /api/v3/user/refresh` with `{ "refreshToken": "..." }`.

---

## RBAC and JWT claims

After login, API calls use `Authorization: Bearer <access_token>`. Controller resolves RBAC **Group** subjects from the token (in order):

1. `resource_access[{OIDC_CLIENT_ID}].roles`
2. Top-level `roles` array
3. `groups` array (requires `groups` scope on external IdP)

**User** subject: `preferred_username` → `username` → `email` → `sub`.

External IdP setup (scopes, PKCE, redirect URIs, Keycloak checklist): [external-oidc-client-setup.md](external-oidc-client-setup.md).

---

## Embedded-only admin APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v3/auth/jwks/rotate` | Rotate embedded OIDC signing keys (manual) |
| `POST /api/v3/auth/migration/export` | Export users/groups for one-way embedded → external migration |
| `GET/POST /api/v3/users` | Embedded user administration |

### JWKS rotation (embedded)

1. Admin Bearer → `POST /api/v3/auth/jwks/rotate`
2. Response includes `{ kid, rotatedAt, restartRequired: true }`
3. **Restart Controller** so the embedded issuer reloads signing material
4. Existing access tokens remain valid until expiry — plan during a maintenance window

### Migrate embedded → external

1. Export: `POST /api/v3/auth/migration/export` (no password hashes)
2. Provision users and groups in the external IdP using exported emails and group names
3. Switch env to `AUTH_MODE=external` with `OIDC_ISSUER_URL` and client credentials
4. **External → embedded is not supported**

---

## HA notes

| Concern | Guidance |
|---------|----------|
| Embedded issuer + sqlite | Single replica only |
| Embedded issuer + mysql/postgres | Multiple replicas; shared DB |
| OAuth BFF sessions | Use `AUTH_SESSION_STORE_TYPE=database` for multi-replica external browser login |
| JWKS cache | Restart all replicas after embedded JWKS rotation |

---

## Verification

### Embedded quick check

```bash
curl -sS -X POST "http://localhost:51121/api/v3/user/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"<bootstrap-user>","password":"<bootstrap-pass>","totp":"<totp-if-enrolled>"}'
```

Open Console at `http://localhost:8008` → Sign in → complete MFA if prompted.

### External quick check

See [external-oidc-client-setup.md](external-oidc-client-setup.md) § Verification.

---

## Related docs

| Document | Topic |
|----------|-------|
| [external-oidc-client-setup.md](external-oidc-client-setup.md) | External IdP client, scopes, Keycloak checklist |
| [rbac-reference.md](rbac-reference.md) | Roles, bindings, public routes |
| [architecture.md](architecture.md) | Auth modes summary, API surfaces |
| [swagger.yaml](swagger.yaml) | User and auth admin endpoints |

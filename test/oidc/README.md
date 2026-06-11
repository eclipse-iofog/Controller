# Embedded auth dev smoke (Plan 8.1)

Local smoke path for embedded identity: Controller issues tokens from the in-process `/oidc`
issuer and validates Bearer JWTs via local JWKS. No mock OIDC provider.

## Unit / integration tests

Auth tests live under:

- `test/src/config/oidc.test.js`
- `test/src/config/embedded-oidc.test.js`
- `test/src/services/auth-login.test.js`
- `test/src/services/auth-integration.test.js`
- `test/src/services/user-service-oidc.test.js`
- `test/src/lib/rbac/middleware-oidc.test.js`
- `test/src/support/embedded-auth-smoke.test.js`

Run OIDC-related tests:

```bash
nvm use 24
node ./node_modules/mocha/bin/mocha.js \
  test/src/config/oidc.test.js \
  test/src/config/embedded-oidc.test.js \
  test/src/services/auth-login.test.js \
  test/src/services/auth-integration.test.js \
  test/src/services/user-service-oidc.test.js \
  test/src/lib/rbac/middleware-oidc.test.js \
  test/src/support/embedded-auth-smoke.test.js \
  --require test/support/setup.js \
  --ui bdd-lazy-var/global \
  --grep 'OIDC|Embedded auth|RBAC middleware OIDC' \
  --exit
```

Test harness: `test/support/embedded-auth-harness.js` (in-memory auth store + embedded JWKS).

## Local dev smoke (embedded mode)

1. Print recommended env:

   ```bash
   node test/oidc/run-embedded-smoke.js
   ```

2. Export the printed variables in the shell where you run Controller.

3. For HTTP-only local runs, also set:

   ```bash
   export AUTH_INSECURE_ALLOW_HTTP=true
   ```

4. Start Controller:

   ```bash
   npm run start-dev
   ```

5. Login (bootstrap admin on first boot; `email` field is the login identifier):

   ```bash
   curl -s -X POST http://localhost:51121/api/v3/user/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin","password":"ChangeMeSecure123!"}'
   ```

   Bootstrap env (non-email username supported):

   ```bash
   export OIDC_BOOTSTRAP_ADMIN_USERNAME='admin'
   export OIDC_BOOTSTRAP_ADMIN_PASSWORD='ChangeMeSecure123!'
   ```

6. Call a protected route with the returned `accessToken`:

   ```bash
   curl -H "Authorization: Bearer <accessToken>" http://localhost:51121/api/v3/user/profile
   ```

7. Admin accounts require MFA to be enrolled before login succeeds (except **bootstrap admin** with `isBootstrap: true`). Login accepts optional `totp` on the same request; missing or invalid MFA returns **401**. Enroll/confirm via Bearer on `/user/mfa/enroll` and `/user/mfa/confirm`.

## External IdP smoke

Point env at any OIDC issuer:

- `AUTH_MODE=external`
- `OIDC_ISSUER_URL` — full issuer URL
- `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` — confidential client
- `CONTROLLER_PUBLIC_URL` — canonical external URL (issuer host + OAuth callback base)
- `VIEWER_URL` — SPA base; BFF redirects tokens to `{viewerUrl}/login#accessToken=...`

Optional auth rate limits (Plan 8.2-4): `AUTH_RATE_LIMIT_ENABLED` (default `true`),
`AUTH_RATE_LIMIT_MAX_REQUESTS` (default `60`), `AUTH_RATE_LIMIT_WINDOW_MS` (default `60000`).

Register at the IdP: redirect URI `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback`.

Embedded-only routes (`/api/v3/users`, migration export, JWKS rotate) return **501** in
external mode.

### External BFF manual checklist (Viewer or curl)

Prerequisites: external IdP reachable; redirect URI registered; Controller running with session
middleware (default).

1. **Authorize redirect** — browser or curl with cookies:

   ```bash
   curl -sI -c /tmp/oauth-cookies.txt \
     "http://localhost:51121/api/v3/user/oauth/authorize"
   ```

   Expect **302** `Location` pointing at the IdP authorize URL. Embedded mode returns **501**.

2. **Complete IdP login** in a browser (MFA / forced password handled by IdP, not Controller).

3. **Callback + Viewer handoff** — after IdP redirects to
   `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback?code=...&state=...`, expect **302** to
   `{VIEWER_URL}/login#accessToken=...&refreshToken=...` when `VIEWER_URL` is set.

4. **Protected API** — copy `accessToken` from the fragment (or JSON **200** when `VIEWER_URL`
   is unset) and call:

   ```bash
   curl -H "Authorization: Bearer <accessToken>" http://localhost:51121/api/v3/user/profile
   ```

5. **Negative** — `GET /user/oauth/callback` without a prior authorize session → **401**.

**Viewer integration:** Sign in button → full-page `GET {apiBase}/user/oauth/authorize`; `/login`
parses hash tokens. See `.cursor/controllerv3.8/docs/08-2-viewer-handoff.md` § External mode.

## HA BFF sessions (Plan 8.2-5)

Multi-replica Controller requires a **shared** OAuth BFF session store. Set:

```bash
export DB_PROVIDER=postgres   # or mysql — not sqlite
export AUTH_SESSION_STORE_TYPE=database
export AUTH_SESSION_SECRET='replace-with-shared-secret'
```

Embedded interaction step state (`AuthInteractionStates`) uses the same store mode automatically when `AUTH_SESSION_STORE_TYPE=database`.

### Two-instance manual procedure

Prerequisites: shared mysql/postgres DB; both instances use identical auth env (`AUTH_MODE`, `CONTROLLER_PUBLIC_URL`, `VIEWER_URL`, `AUTH_SESSION_*`).

1. Start instance A on port `51121` and instance B on port `51122` (different `SERVER_PORT`).

2. Begin OAuth on instance A and capture the session cookie:

   ```bash
   curl -sI -c /tmp/oauth-ha-cookies.txt \
     "http://localhost:51121/api/v3/user/oauth/authorize"
   ```

   Expect **302** to IdP (external) or embedded `/oidc` (embedded).

3. Complete login in a browser (or embedded interaction APIs on either instance — interaction state is DB-backed).

4. When the IdP redirects to `{CONTROLLER_PUBLIC_URL}/api/v3/user/oauth/callback?...`, replay the callback against **instance B** using the cookie from step 2:

   ```bash
   curl -sI -b /tmp/oauth-ha-cookies.txt \
     "http://localhost:51122/api/v3/user/oauth/callback?code=<code>&state=<state>"
   ```

   Expect **302** to `{VIEWER_URL}/login#accessToken=...` (or JSON **200** when `VIEWER_URL` is unset).

5. **Negative control** — with `AUTH_SESSION_STORE_TYPE=memory`, step 4 on a different instance returns **401** (session not found).

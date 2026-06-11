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

5. Login (bootstrap admin on first boot):

   ```bash
   curl -s -X POST http://localhost:51121/api/v3/user/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"ChangeMeSecure123!"}'
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
- `CONTROLLER_PUBLIC_URL` — canonical external URL

Embedded-only routes (`/api/v3/users`, migration export, JWKS rotate) return **501** in
external mode.

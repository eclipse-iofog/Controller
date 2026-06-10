# OIDC mock provider (Plan 8)

Generic OIDC smoke path for dev and CI. Replaces the legacy `MockKeycloak` dev shim with a
provider-agnostic mock that exercises the same discovery + JWKS + bearer validation flow as
production.

## Unit tests

OIDC and RBAC middleware tests live under:

- `test/src/config/oidc.test.js`
- `test/src/lib/rbac/middleware-oidc.test.js`
- `test/src/support/mock-oidc-smoke.test.js`

Run only OIDC-related tests:

```bash
nvm use 24
node ./node_modules/mocha/bin/mocha.js test/src/config/oidc.test.js test/src/lib/rbac/middleware-oidc.test.js test/src/support/mock-oidc-smoke.test.js --require test/support/setup.js --ui bdd-lazy-var/global --grep 'OIDC|Mock OIDC' --exit
```

## Local dev smoke

1. Start the mock issuer:

   ```bash
   node test/oidc/run-mock-provider.js
   ```

2. Export the printed `OIDC_*` variables in the shell where you run Controller.

3. Ensure `server.devMode` is true (default in `config.yaml`) or set auth in yaml — the mock
   env vars take precedence over an empty auth block.

4. For the self-signed mock cert, also run:

   ```bash
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```

5. Start Controller (`npm run start-dev`) and call a RBAC-protected route with:

   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:51121/api/v3/...
   ```

   Issue a token from Node (example):

   ```javascript
   const { MockOidcProvider } = require('./test/support/mock-oidc-provider')
   const p = new MockOidcProvider({ clientId: '...', clientSecret: '...' })
   await p.start()
   const token = await p.issueAccessToken({ preferred_username: 'smoke-user', roles: ['sre'] })
   ```

6. Without a bearer token, protected routes should return `401`. With a valid token, RBAC
   applies from `rbac-resources.yaml` and RoleBindings as before.

## Real provider smoke

Point the same env vars at any OIDC issuer (Keycloak, Auth0, etc.):

- `OIDC_ISSUER_URL` — issuer URL (discovery document at `/.well-known/openid-configuration`)
- `OIDC_CLIENT_ID` — confidential client for Controller API
- `OIDC_CLIENT_SECRET` — client secret

No Keycloak-specific env vars are required.

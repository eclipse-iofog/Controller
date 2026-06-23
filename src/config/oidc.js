/**
 * v3.9+ mTLS user-auth extension points (not implemented in v3.8 — comments only)
 *
 * Cluster manager API (`/api/v3/*` user routes, operator WebSockets, ECN Viewer login)
 * may accept mutual TLS client certificates as an alternative to Bearer JWTs.
 * Agent routes (`/api/v3/agent/*`) keep fog-token auth; no OIDC/mTLS on agent wire.
 *
 * Planned insertion points in this module:
 * 1. initOidc() — when HTTPS listener uses requestCert, stash TLS policy flags
 *    (e.g. require client cert vs optional) for middleware to read via req.socket.
 * 2. getOidcMiddleware() — before Bearer branch: if no Authorization header and
 *    req.socket.authorized, extract identity from getPeerCertificate() (or forwarded
 *    cert from ingress) and populate req.kauth via buildKauthGrant() for RBAC parity.
 * 3. buildKauthGrant() — add cert-derived claims mapper (SAN/CN → preferred_username).
 * 4. New export getMtlsMiddleware() (v3.9) — composable with getOidcMiddleware() in
 *    server.js; Bearer takes precedence when both are present.
 * 5. ensureDiscovery() — optional cert-bound token exchange at issuer (RFC 8705) if
 *    provider requires OIDC token alongside mTLS termination.
 *
 */
const oidcClient = require('openid-client')
const { createRemoteJWKSet, createLocalJWKSet, jwtVerify } = require('jose')
const config = require('./index')
const logger = require('../logger')
const { getPublicUrl: resolvePublicUrl } = require('./auth-urls')
const { getActiveSigningMaterial, getPublicJwk } = require('./auth-jwks')
const { isPublicCatalogRoute } = require('../lib/rbac/route-catalog-utils')

let oidcInstance = null
let discoveryPromise = null
let embeddedOauthClientPromise = null
let jwks = null
let issuerString = null
let configuredClientId = null

const AUTH_MODES = ['embedded', 'external']

function isNonEmptyString (value) {
  return value !== undefined && value !== null && value !== ''
}

function getAuthMode () {
  const mode = process.env.AUTH_MODE || config.get('auth.mode') || 'embedded'
  if (!AUTH_MODES.includes(mode)) {
    throw new Error(`Invalid auth.mode "${mode}". Must be embedded or external`)
  }
  return mode
}

function getPublicUrl () {
  return resolvePublicUrl()
}

function getExternalOidcSettings () {
  return {
    issuerUrl: process.env.OIDC_ISSUER_URL || config.get('auth.issuerUrl') || config.get('auth.url'),
    clientId: process.env.OIDC_CLIENT_ID || config.get('auth.client.id'),
    clientSecret: process.env.OIDC_CLIENT_SECRET || config.get('auth.client.secret')
  }
}

function getEmbeddedIssuerUrl () {
  const publicUrl = getPublicUrl().replace(/\/$/, '')
  return `${publicUrl}/oidc`
}

function getOidcSettings () {
  const mode = getAuthMode()
  if (mode === 'embedded') {
    return {
      issuerUrl: getEmbeddedIssuerUrl(),
      clientId: process.env.OIDC_CLIENT_ID || config.get('auth.client.id') || 'controller',
      clientSecret: process.env.OIDC_CLIENT_SECRET || config.get('auth.client.secret') || ''
    }
  }
  return getExternalOidcSettings()
}

function isEmbeddedAuthConfigured () {
  return isNonEmptyString(getPublicUrl())
}

function isExternalAuthConfigured () {
  const { issuerUrl, clientId, clientSecret } = getExternalOidcSettings()
  return [issuerUrl, clientId, clientSecret].every(isNonEmptyString)
}

function isAuthConfigured () {
  const mode = getAuthMode()
  return mode === 'embedded' ? isEmbeddedAuthConfigured() : isExternalAuthConfigured()
}

function validateAuthConfig () {
  const mode = getAuthMode()
  if (mode === 'embedded') {
    if (!isEmbeddedAuthConfigured()) {
      throw new Error('Embedded auth requires CONTROLLER_PUBLIC_URL (server.publicUrl)')
    }
    const externalIssuer = process.env.OIDC_ISSUER_URL || config.get('auth.issuerUrl')
    if (isNonEmptyString(externalIssuer)) {
      logger.warn('auth.issuerUrl is set but auth.mode is embedded; embedded issuer will be used')
    }
    return
  }

  if (!isExternalAuthConfigured()) {
    throw new Error('External auth requires OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET')
  }
}

/**
 * req.kauth compatibility shape for route handlers; populated by config/oidc.js bearer middleware.
 */
function buildKauthGrant (claims, rawToken) {
  return {
    grant: {
      access_token: {
        token: rawToken,
        content: claims
      }
    }
  }
}

function getDiscoveryOptions () {
  const allowHttp = config.getBoolean('auth.insecureAllowHttp', false)
  if (!allowHttp) {
    return undefined
  }
  // openid-client marks allowInsecureRequests @deprecated to discourage prod use;
  // required for local http:// when AUTH_INSECURE_ALLOW_HTTP=true.
  return { execute: [oidcClient.allowInsecureRequests] }
}

async function ensureEmbeddedJwks () {
  const { privateJwk } = await getActiveSigningMaterial()
  jwks = createLocalJWKSet({ keys: [getPublicJwk(privateJwk)] })
  issuerString = getEmbeddedIssuerUrl()
  configuredClientId = getOidcSettings().clientId
  return null
}

async function ensureDiscovery () {
  if (discoveryPromise) {
    return discoveryPromise
  }

  if (getAuthMode() === 'embedded') {
    discoveryPromise = ensureEmbeddedJwks().catch((error) => {
      discoveryPromise = null
      throw error
    })
    return discoveryPromise
  }

  const { issuerUrl, clientId, clientSecret } = getOidcSettings()
  configuredClientId = clientId

  discoveryPromise = (async () => {
    const issuer = new URL(issuerUrl)
    const configuration = await oidcClient.discovery(
      issuer,
      clientId,
      clientSecret,
      undefined,
      getDiscoveryOptions()
    )
    const metadata = configuration.serverMetadata()

    if (!metadata.jwks_uri) {
      throw new Error('OIDC issuer discovery did not return jwks_uri')
    }

    jwks = createRemoteJWKSet(new URL(metadata.jwks_uri))
    issuerString = metadata.issuer
    return configuration
  })().catch((error) => {
    discoveryPromise = null
    throw error
  })

  return discoveryPromise
}

function createOidcFacade () {
  return {
    middleware () {
      return getOidcMiddleware()
    }
  }
}

function initOidc () {
  if (oidcInstance) {
    return oidcInstance
  }

  // v3.9: read TLS client-auth policy when HTTPS + requestCert enabled (server.js listener)
  if (!isAuthConfigured()) {
    const isProduction = !config.getBoolean('server.devMode', true)
    if (isProduction) {
      const error = new Error('Auth configuration required in production mode')
      logger.error('Failed to initialize OIDC:', error)
      throw error
    }
    logger.warn('OIDC not configured; bearer validation unavailable until auth is configured')
    oidcInstance = createOidcFacade()
    return oidcInstance
  }

  validateAuthConfig()
  oidcInstance = createOidcFacade()
  logger.info(`OIDC initialized successfully (${getAuthMode()} mode)`)
  return oidcInstance
}

function getOidc () {
  return oidcInstance || initOidc()
}

function getOidcMiddleware () {
  return async (req, res, next) => {
    if (!isAuthConfigured()) {
      return next()
    }

    // Agent routes use fog JWTs (checkFogToken), not OIDC bearer tokens
    const requestPath = req.path || (req.url && req.url.split('?')[0]) || ''
    if (requestPath.startsWith('/api/v3/agent') || requestPath.startsWith('/oidc')) {
      return next()
    }

    // Public catalog routes (e.g. GET /api/v3/status) do not require OIDC bearer validation
    if (isPublicCatalogRoute(req.method, requestPath)) {
      return next()
    }

    // v3.9: if no Bearer token and req.socket.authorized, map client cert → req.kauth here
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) {
      return next()
    }

    try {
      await ensureDiscovery()
      const verifyOptions = { issuer: issuerString }
      if (configuredClientId) {
        verifyOptions.audience = configuredClientId
      }

      const { payload } = await jwtVerify(token, jwks, verifyOptions)
      if (payload.token_use === 'refresh') {
        throw new Error('Refresh token cannot be used as access token')
      }
      req.kauth = buildKauthGrant(payload, token)
      return next()
    } catch (error) {
      logger.warn({
        msg: 'OIDC bearer token validation failed',
        err: error.message || String(error)
      })
      return next()
    }
  }
}

function getMemoryStore () {
  const { getAuthSessionStore } = require('./auth-session-store')
  return getAuthSessionStore()
}

async function ensureEmbeddedOauthClient () {
  if (embeddedOauthClientPromise) {
    return embeddedOauthClientPromise
  }

  const { issuerUrl } = getOidcSettings()
  const db = require('../data/models')
  const { resolveConfidentialClientSecret } = require('./embedded-oidc-client-secret')
  const { getEmbeddedIssuerMetadata } = require('./embedded-oidc')
  const { createEmbeddedOidcFetch } = require('./oidc-fetch')
  const { clientId, clientSecret } = await resolveConfidentialClientSecret(db)

  embeddedOauthClientPromise = (async () => {
    const serverMetadata = getEmbeddedIssuerMetadata(issuerUrl)
    const configuration = new oidcClient.Configuration(
      serverMetadata,
      clientId,
      clientSecret,
      undefined
    )

    const discoveryOptions = getDiscoveryOptions()
    if (discoveryOptions?.execute) {
      for (const extension of discoveryOptions.execute) {
        extension(configuration)
      }
    }

    const customFetch = createEmbeddedOidcFetch()
    if (customFetch) {
      configuration[oidcClient.customFetch] = customFetch
    }

    return configuration
  })().catch((error) => {
    embeddedOauthClientPromise = null
    throw error
  })

  return embeddedOauthClientPromise
}

async function getOauthClientConfiguration () {
  if (getAuthMode() === 'embedded') {
    await ensureEmbeddedJwks()
    return ensureEmbeddedOauthClient()
  }
  return ensureDiscovery()
}

function resetDiscoveryForTests () {
  discoveryPromise = null
  embeddedOauthClientPromise = null
  jwks = null
  issuerString = null
  configuredClientId = null
  oidcInstance = null
  const { resetEmbeddedOidcFetchForTests } = require('./oidc-fetch')
  resetEmbeddedOidcFetchForTests()
  const { resetAuthSessionStoreForTests } = require('./auth-session-store')
  resetAuthSessionStoreForTests()
}

module.exports = {
  initOidc,
  getOidc,
  getOidcMiddleware,
  getMemoryStore,
  getAuthMode,
  isAuthConfigured,
  validateAuthConfig,
  getOidcSettings,
  getOidcConfiguration: ensureDiscovery,
  getOauthClientConfiguration,
  resetDiscoveryForTests,
  buildKauthGrant
}

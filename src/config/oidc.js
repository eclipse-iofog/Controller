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
 * Edgelet CP: no v3.8 env changes for mTLS; Plan 8.1 embedded issuer is separate.
 * See .cursor/rules/controller-oidc-handoff.mdc for v3.8 OIDC env contract.
 */
const session = require('express-session')
const oidcClient = require('openid-client')
const { createRemoteJWKSet, jwtVerify } = require('jose')
const config = require('./index')
const logger = require('../logger')

let oidcInstance = null
let memoryStore = null
let discoveryPromise = null
let jwks = null
let issuerString = null
let configuredClientId = null
let devMode = false

function getOidcSettings () {
  return {
    issuerUrl: process.env.OIDC_ISSUER_URL || config.get('auth.issuerUrl') || config.get('auth.url'),
    clientId: process.env.OIDC_CLIENT_ID || config.get('auth.client.id'),
    clientSecret: process.env.OIDC_CLIENT_SECRET || config.get('auth.client.secret')
  }
}

function isAuthConfigured () {
  const { issuerUrl, clientId, clientSecret } = getOidcSettings()
  return [issuerUrl, clientId, clientSecret].every(
    value => value !== undefined && value !== null && value !== ''
  )
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

async function ensureDiscovery () {
  if (discoveryPromise) {
    return discoveryPromise
  }

  const { issuerUrl, clientId, clientSecret } = getOidcSettings()
  configuredClientId = clientId

  discoveryPromise = (async () => {
    const issuer = new URL(issuerUrl)
    const configuration = await oidcClient.discovery(
      issuer,
      clientId,
      clientSecret
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
  const isDevMode = config.get('server.devMode', true)
  const hasAuthConfig = isAuthConfigured()
  devMode = isDevMode && !hasAuthConfig

  if (devMode) {
    oidcInstance = createOidcFacade()
    logger.warn('OIDC initialized in development mode (no auth configuration)')
    logger.warn('WARNING: All routes are unprotected in this mode')
    return oidcInstance
  }

  if (!hasAuthConfig) {
    const error = new Error('Auth configuration required in production mode')
    logger.error('Failed to initialize OIDC:', error)
    throw error
  }

  memoryStore = new session.MemoryStore()
  oidcInstance = createOidcFacade()
  logger.info('OIDC initialized successfully with auth configuration')
  return oidcInstance
}

function getOidc () {
  return oidcInstance || initOidc()
}

function getOidcMiddleware () {
  return async (req, res, next) => {
    if (devMode) {
      return next()
    }

    // Agent routes use fog JWTs (checkFogToken), not OIDC bearer tokens
    const requestPath = req.path || (req.url && req.url.split('?')[0]) || ''
    if (requestPath.startsWith('/api/v3/agent')) {
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
  return memoryStore
}

async function getOidcConfiguration () {
  return ensureDiscovery()
}

module.exports = {
  initOidc,
  getOidc,
  getOidcMiddleware,
  getMemoryStore,
  isAuthConfigured,
  getOidcSettings,
  getOidcConfiguration
}

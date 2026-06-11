'use strict'

const { decodeJwt } = require('jose')
const {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomState,
  randomNonce
} = require('openid-client')
const config = require('../config')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const {
  getOidcConfiguration,
  getAuthMode,
  isAuthConfigured
} = require('../config/oidc')

const OAUTH_SESSION_KEY = 'controllerOauth'
const OAUTH_SESSION_TTL_MS = 10 * 60 * 1000

function ensureAuthConfigured () {
  if (!isAuthConfigured()) {
    throw new Error('Auth is not configured for this cluster. Please contact your administrator.')
  }
}

function ensureExternalMode () {
  if (getAuthMode() !== 'external') {
    throw new Errors.NotImplementedError('OAuth BFF is only available in external auth mode')
  }
}

function getPublicUrl () {
  return (process.env.CONTROLLER_PUBLIC_URL || config.get('server.publicUrl') || '').replace(/\/$/, '')
}

function getRedirectUri () {
  return `${getPublicUrl()}/api/v3/user/oauth/callback`
}

function getViewerUrl () {
  const viewerUrl = process.env.VIEWER_URL || config.get('viewer.url')
  if (!viewerUrl) {
    return null
  }
  return String(viewerUrl).replace(/\/$/, '')
}

function ensureOauthSession (sessionData) {
  if (!sessionData || !sessionData.state || !sessionData.nonce) {
    throw new Errors.AuthenticationError('OAuth session expired or missing')
  }

  if (Date.now() - sessionData.createdAt > OAUTH_SESSION_TTL_MS) {
    throw new Errors.AuthenticationError('OAuth session expired')
  }
}

function extractEmailFromTokenResponse (tokenResponse) {
  if (tokenResponse.id_token) {
    try {
      const claims = decodeJwt(tokenResponse.id_token)
      if (claims.email) {
        return String(claims.email).trim().toLowerCase()
      }
      if (claims.preferred_username && claims.preferred_username.includes('@')) {
        return String(claims.preferred_username).trim().toLowerCase()
      }
    } catch (error) {
      logger.warn({ msg: 'Failed to decode OAuth ID token for email linking', err: error.message })
    }
  }

  if (tokenResponse.access_token) {
    try {
      const claims = decodeJwt(tokenResponse.access_token)
      if (claims.email) {
        return String(claims.email).trim().toLowerCase()
      }
      if (claims.preferred_username && claims.preferred_username.includes('@')) {
        return String(claims.preferred_username).trim().toLowerCase()
      }
    } catch (error) {
      logger.warn({ msg: 'Failed to decode OAuth access token for email linking', err: error.message })
    }
  }

  return null
}

/**
 * External mode links identities by email claim only — RBAC User subjects use
 * preferred_username/email from JWT. No AuthUsers row is created in external mode.
 */
function linkExternalUserByEmail (tokenResponse) {
  const email = extractEmailFromTokenResponse(tokenResponse)
  if (email) {
    logger.info(`External OAuth login linked by email: ${email}`)
  }
  return email
}

async function authorize (req) {
  ensureAuthConfigured()
  ensureExternalMode()

  const oidcConfig = await getOidcConfiguration()
  const state = randomState()
  const nonce = randomNonce()

  req.session[OAUTH_SESSION_KEY] = {
    state,
    nonce,
    createdAt: Date.now()
  }

  const authorizationUrl = buildAuthorizationUrl(oidcConfig, {
    redirect_uri: getRedirectUri(),
    scope: 'openid profile email',
    state,
    nonce
  })

  return { redirectUrl: authorizationUrl.toString() }
}

async function callback (req) {
  ensureAuthConfigured()
  ensureExternalMode()

  const sessionData = req.session[OAUTH_SESSION_KEY]
  ensureOauthSession(sessionData)
  delete req.session[OAUTH_SESSION_KEY]

  const oidcConfig = await getOidcConfiguration()
  const currentUrl = new URL(`${getPublicUrl()}${req.originalUrl}`)

  let tokenResponse
  try {
    tokenResponse = await authorizationCodeGrant(oidcConfig, currentUrl, {
      expectedState: sessionData.state,
      expectedNonce: sessionData.nonce
    })
  } catch (error) {
    throw new Errors.AuthenticationError(error.message || 'OAuth authorization failed')
  }

  linkExternalUserByEmail(tokenResponse)

  const tokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || null
  }

  return {
    tokens,
    viewerUrl: getViewerUrl()
  }
}

module.exports = {
  authorize,
  callback,
  getRedirectUri,
  getViewerUrl
}

'use strict'

const { decodeJwt } = require('jose')
const {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomState,
  randomNonce,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge
} = require('openid-client')
const db = require('../data/models')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const {
  getOauthClientConfiguration,
  getAuthMode
} = require('../config/oidc')
const { getPublicUrl, getConsoleUrl } = require('../config/auth-urls')
const { getSessionStoreTtlMs } = require('../config/auth-session-store')
const { withTransaction } = require('../helpers/app-helper')
const { runInTransaction, PRIORITY_INTERACTIVE } = require('../helpers/transaction-runner')
const AuthTokenService = require('./auth-token-service')

const OAUTH_SESSION_KEY = 'controllerOauth'

function ensureAuthConfigured () {
  const { isAuthConfigured } = require('../config/oidc')
  if (!isAuthConfigured()) {
    throw new Error('Auth is not configured for this cluster. Please contact your administrator.')
  }
}

function ensureOauthBffReady () {
  if (!getConsoleUrl()) {
    throw new Errors.NotImplementedError('OAuth BFF requires CONTROLLER_PUBLIC_URL or CONSOLE_URL to be configured')
  }
}

function getRedirectUri () {
  return `${getPublicUrl()}/api/v3/user/oauth/callback`
}

function ensureOauthSession (sessionData) {
  if (!sessionData || !sessionData.state || !sessionData.nonce || !sessionData.codeVerifier) {
    throw new Errors.AuthenticationError('OAuth session expired or missing')
  }

  if (Date.now() - sessionData.createdAt > getSessionStoreTtlMs()) {
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

async function resolveEmbeddedUserFromTokenResponse (tokenResponse, transaction) {
  if (!tokenResponse.id_token) {
    throw new Errors.AuthenticationError('OAuth response missing id_token')
  }

  const claims = decodeJwt(tokenResponse.id_token)
  const userId = claims.sub
  if (!userId) {
    throw new Errors.AuthenticationError('OAuth response missing subject')
  }

  const user = await db.AuthUser.findByPk(userId, withTransaction(transaction, {
    include: [{
      model: db.AuthGroup,
      as: 'groups',
      through: { attributes: [] }
    }]
  }))

  if (!user || user.deletedAt) {
    throw new Errors.AuthenticationError('OAuth user not found')
  }

  return user
}

async function authorize (req) {
  ensureAuthConfigured()
  ensureOauthBffReady()

  const oidcConfig = await getOauthClientConfiguration()
  const state = randomState()
  const nonce = randomNonce()
  const codeVerifier = randomPKCECodeVerifier()
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier)

  req.session[OAUTH_SESSION_KEY] = {
    state,
    nonce,
    codeVerifier,
    createdAt: Date.now()
  }

  const authorizationParams = {
    redirect_uri: getRedirectUri(),
    scope: 'openid profile email groups offline_access',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  }

  if (getAuthMode() === 'embedded') {
    authorizationParams.prompt = 'login'
  }

  const authorizationUrl = buildAuthorizationUrl(oidcConfig, authorizationParams)

  return { redirectUrl: authorizationUrl.toString() }
}

async function callback (req) {
  ensureAuthConfigured()
  ensureOauthBffReady()

  const consoleUrl = getConsoleUrl()
  const currentUrl = new URL(`${getPublicUrl()}${req.originalUrl}`)
  const oauthError = currentUrl.searchParams.get('error')

  if (oauthError) {
    if (req.session) {
      delete req.session[OAUTH_SESSION_KEY]
    }

    logger.warn({
      msg: 'OAuth callback returned error from issuer',
      error: oauthError,
      errorDescription: currentUrl.searchParams.get('error_description') || undefined,
      state: currentUrl.searchParams.get('state') || undefined
    })

    return {
      oauthError,
      oauthErrorDescription: currentUrl.searchParams.get('error_description') || undefined,
      consoleUrl
    }
  }

  const sessionData = req.session[OAUTH_SESSION_KEY]
  ensureOauthSession(sessionData)
  delete req.session[OAUTH_SESSION_KEY]

  const oidcConfig = await getOauthClientConfiguration()

  let tokenResponse
  try {
    tokenResponse = await authorizationCodeGrant(oidcConfig, currentUrl, {
      expectedState: sessionData.state,
      expectedNonce: sessionData.nonce,
      pkceCodeVerifier: sessionData.codeVerifier
    })
  } catch (error) {
    throw new Errors.AuthenticationError(error.message || 'OAuth authorization failed')
  }

  if (getAuthMode() === 'embedded') {
    return runInTransaction(async (transaction) => {
      const user = await resolveEmbeddedUserFromTokenResponse(tokenResponse, transaction)
      const groupNames = (user.groups || []).map((group) => group.name)
      const tokens = await AuthTokenService.issueTokenPair(user, groupNames, transaction)
      return {
        tokens,
        consoleUrl
      }
    }, { priority: PRIORITY_INTERACTIVE, label: 'auth.oauth.callback.embedded' })
  }

  linkExternalUserByEmail(tokenResponse)

  return {
    tokens: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null
    },
    consoleUrl
  }
}

module.exports = {
  OAUTH_SESSION_KEY,
  authorize,
  callback,
  getRedirectUri,
  getConsoleUrl,
  resolveEmbeddedUserFromTokenResponse
}

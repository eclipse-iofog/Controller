const Errors = require('../helpers/errors')
const TransactionDecorator = require('../decorators/transaction-decorator')
const {
  genericGrantRequest,
  refreshTokenGrant,
  fetchUserInfo,
  tokenRevocation
} = require('openid-client')
const { decodeJwt } = require('jose')
const { getOidcConfiguration, isAuthConfigured, getAuthMode } = require('../config/oidc')
const AuthLoginService = require('./auth-login-service')
const AuthMfaService = require('./auth-mfa-service')
const AuthUserService = require('./auth-user-service')
const AuthOauthService = require('./auth-oauth-service')
const AuthInteractionService = require('./auth-interaction-service')

function mapOidcError (error) {
  const description = error.error_description || error.message || 'Invalid credentials'
  throw new Errors.InvalidCredentialsError(description)
}

function tokensFromResponse (tokenResponse) {
  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token
  }
}

function ensureAuthConfigured () {
  if (!isAuthConfigured()) {
    throw new Error('Auth is not configured for this cluster. Please contact your administrator.')
  }
}

function ensureEmbeddedMode () {
  if (getAuthMode() !== 'embedded') {
    throw new Errors.InvalidArgumentError('This endpoint is only available in embedded auth mode')
  }
}

const loginEmbedded = TransactionDecorator.generateTransaction(async function (credentials, isCLI, transaction) {
  return AuthLoginService.login(credentials, transaction)
})

async function loginExternal (credentials) {
  const oidcConfig = await getOidcConfiguration()
  const parameters = {
    username: credentials.email,
    password: credentials.password
  }
  if (credentials.totp) {
    parameters.totp = credentials.totp
  }

  const tokenResponse = await genericGrantRequest(oidcConfig, 'password', parameters)
  return tokensFromResponse(tokenResponse)
}

const login = async function (credentials, isCLI) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return loginEmbedded(credentials, isCLI)
  }

  try {
    return await loginExternal(credentials)
  } catch (error) {
    mapOidcError(error)
  }
}

const refreshEmbedded = TransactionDecorator.generateTransaction(async function (credentials, isCLI, transaction) {
  return AuthLoginService.refresh(credentials, transaction)
})

async function refreshExternal (credentials) {
  const oidcConfig = await getOidcConfiguration()
  const tokenResponse = await refreshTokenGrant(oidcConfig, credentials.refreshToken)
  return tokensFromResponse(tokenResponse)
}

const refresh = async function (credentials, isCLI) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return refreshEmbedded(credentials, isCLI)
  }

  try {
    return await refreshExternal(credentials)
  } catch (error) {
    mapOidcError(error)
  }
}

const profileEmbedded = TransactionDecorator.generateTransaction(async function (req, isCLI, transaction) {
  return AuthLoginService.profile(req, transaction)
})

async function profileExternal (req) {
  const accessToken = req.headers.authorization.replace('Bearer ', '')
  const oidcConfig = await getOidcConfiguration()
  const claims = decodeJwt(accessToken)
  const subject = claims.sub
  if (!subject) {
    throw new Errors.InvalidCredentialsError('Invalid credentials')
  }

  return fetchUserInfo(oidcConfig, accessToken, subject)
}

const profile = async function (req, isCLI) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return profileEmbedded(req, isCLI)
  }

  try {
    return await profileExternal(req)
  } catch (error) {
    if (error instanceof Errors.InvalidCredentialsError) {
      throw error
    }
    mapOidcError(error)
  }
}

const logoutEmbedded = TransactionDecorator.generateTransaction(async function (req, isCLI, transaction) {
  return AuthLoginService.logout(req, transaction)
})

async function logoutExternal (req) {
  const accessToken = req.headers.authorization.replace('Bearer ', '')

  try {
    const oidcConfig = await getOidcConfiguration()
    const metadata = oidcConfig.serverMetadata()
    if (metadata.revocation_endpoint) {
      await tokenRevocation(oidcConfig, accessToken, { token_type_hint: 'access_token' })
    }
  } catch (error) {
    // Best-effort logout when issuer has no revocation endpoint or revocation fails
  }

  return { status: 'success' }
}

const logout = async function (req, isCLI) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return logoutEmbedded(req, isCLI)
  }

  return logoutExternal(req)
}

const enrollMfa = TransactionDecorator.generateTransaction(async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
    throw new Errors.AuthenticationError('Authentication required')
  }

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.enrollMfa(userId, transaction)
})

const confirmMfa = TransactionDecorator.generateTransaction(async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
    throw new Errors.AuthenticationError('Authentication required')
  }

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.confirmMfa(userId, req.body.code, transaction)
})

const disableMfa = TransactionDecorator.generateTransaction(async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.disableMfa(userId, req.body.password, req.body.code, transaction)
})

const changePassword = TransactionDecorator.generateTransaction(async function (req, payload, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    if (payload.resetToken) {
      return AuthUserService.changePassword(req, payload, transaction)
    }
    ensureEmbeddedMode()
    return AuthUserService.changePassword(req, payload, transaction)
  }

  throw new Errors.NotImplementedError('Password change is only supported in embedded auth mode')
})

const oauthAuthorize = async function (req, isCLI) {
  ensureAuthConfigured()
  return AuthOauthService.authorize(req)
}

const oauthCallback = async function (req, isCLI) {
  ensureAuthConfigured()
  return AuthOauthService.callback(req)
}

const interactionStatus = async function (uid, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.getStatus(uid)
}

const interactionLogin = async function (uid, credentials, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitLogin(uid, credentials)
}

const interactionMfa = async function (uid, code, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitMfa(uid, code)
}

const interactionEnroll = async function (uid, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitEnroll(uid)
}

const interactionConfirmEnroll = async function (uid, code, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitConfirmEnroll(uid, code)
}

const interactionChangePassword = async function (uid, payload, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitChangePassword(uid, payload)
}

const interactionComplete = async function (uid, req, res, isCLI) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.complete(uid, req, res)
}

module.exports = {
  login,
  refresh,
  profile,
  logout,
  enrollMfa,
  confirmMfa,
  disableMfa,
  changePassword,
  oauthAuthorize,
  oauthCallback,
  interactionStatus,
  interactionLogin,
  interactionMfa,
  interactionEnroll,
  interactionConfirmEnroll,
  interactionChangePassword,
  interactionComplete
}

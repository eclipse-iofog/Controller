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

const login = async function (credentials, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return AuthLoginService.login(credentials, transaction)
  }

  try {
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
  } catch (error) {
    mapOidcError(error)
  }
}

const refresh = async function (credentials, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return AuthLoginService.refresh(credentials, transaction)
  }

  try {
    const oidcConfig = await getOidcConfiguration()
    const tokenResponse = await refreshTokenGrant(oidcConfig, credentials.refreshToken)
    return tokensFromResponse(tokenResponse)
  } catch (error) {
    mapOidcError(error)
  }
}

const profile = async function (req, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return AuthLoginService.profile(req, transaction)
  }

  const accessToken = req.headers.authorization.replace('Bearer ', '')

  try {
    const oidcConfig = await getOidcConfiguration()
    const claims = decodeJwt(accessToken)
    const subject = claims.sub
    if (!subject) {
      throw new Errors.InvalidCredentialsError('Invalid credentials')
    }

    return await fetchUserInfo(oidcConfig, accessToken, subject)
  } catch (error) {
    if (error instanceof Errors.InvalidCredentialsError) {
      throw error
    }
    mapOidcError(error)
  }
}

const logout = async function (req, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    return AuthLoginService.logout(req, transaction)
  }

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

const enrollMfa = async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
    throw new Errors.AuthenticationError('Authentication required')
  }

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.enrollMfa(userId, transaction)
}

const confirmMfa = async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
    throw new Errors.AuthenticationError('Authentication required')
  }

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.confirmMfa(userId, req.body.code, transaction)
}

const disableMfa = async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()

  const userId = req.kauth.grant.access_token.content.sub
  return AuthMfaService.disableMfa(userId, req.body.password, req.body.code, transaction)
}

const changePassword = async function (req, payload, isCLI, transaction) {
  ensureAuthConfigured()

  if (getAuthMode() === 'embedded') {
    if (payload.resetToken) {
      return AuthUserService.changePassword(req, payload, transaction)
    }
    ensureEmbeddedMode()
    return AuthUserService.changePassword(req, payload, transaction)
  }

  throw new Errors.NotImplementedError('Password change is only supported in embedded auth mode')
}

const oauthAuthorize = async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  return AuthOauthService.authorize(req)
}

const oauthCallback = async function (req, isCLI, transaction) {
  ensureAuthConfigured()
  return AuthOauthService.callback(req)
}

const interactionStatus = async function (uid, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.getStatus(uid, transaction)
}

const interactionLogin = async function (uid, credentials, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitLogin(uid, credentials, transaction)
}

const interactionMfa = async function (uid, code, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitMfa(uid, code, transaction)
}

const interactionEnroll = async function (uid, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitEnroll(uid, transaction)
}

const interactionConfirmEnroll = async function (uid, code, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitConfirmEnroll(uid, code, transaction)
}

const interactionChangePassword = async function (uid, payload, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.submitChangePassword(uid, payload, transaction)
}

const interactionComplete = async function (uid, req, res, isCLI, transaction) {
  ensureAuthConfigured()
  ensureEmbeddedMode()
  return AuthInteractionService.complete(uid, req, res, transaction)
}

module.exports = {
  login: TransactionDecorator.generateTransaction(login),
  refresh: TransactionDecorator.generateTransaction(refresh),
  profile: TransactionDecorator.generateTransaction(profile),
  logout: TransactionDecorator.generateTransaction(logout),
  enrollMfa: TransactionDecorator.generateTransaction(enrollMfa),
  confirmMfa: TransactionDecorator.generateTransaction(confirmMfa),
  disableMfa: TransactionDecorator.generateTransaction(disableMfa),
  changePassword: TransactionDecorator.generateTransaction(changePassword),
  oauthAuthorize: TransactionDecorator.generateTransaction(oauthAuthorize),
  oauthCallback: TransactionDecorator.generateTransaction(oauthCallback),
  interactionStatus: TransactionDecorator.generateTransaction(interactionStatus),
  interactionLogin: TransactionDecorator.generateTransaction(interactionLogin),
  interactionMfa: TransactionDecorator.generateTransaction(interactionMfa),
  interactionEnroll: TransactionDecorator.generateTransaction(interactionEnroll),
  interactionConfirmEnroll: TransactionDecorator.generateTransaction(interactionConfirmEnroll),
  interactionChangePassword: TransactionDecorator.generateTransaction(interactionChangePassword),
  interactionComplete: TransactionDecorator.generateTransaction(interactionComplete)
}

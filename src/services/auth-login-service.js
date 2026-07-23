'use strict'

const { decodeJwt } = require('jose')
const db = require('../data/models')
const Errors = require('../helpers/errors')
const { withTransaction } = require('../helpers/app-helper')
const AuthPolicyService = require('./auth-policy-service')
const AuthPasswordService = require('./auth-password-service')
const AuthTokenService = require('./auth-token-service')
const AuthMfaService = require('./auth-mfa-service')
const { destroyEmbeddedOidcStateForUser } = require('./auth-embedded-logout-service')
const { OAUTH_SESSION_KEY } = require('./auth-oauth-service')

async function completeLogin (authContext, transaction) {
  const { user, groupNames } = authContext
  await AuthPolicyService.resetFailedLogin(user, transaction)
  return AuthTokenService.issueTokenPair(user, groupNames, transaction)
}

async function login (credentials, transaction) {
  const authContext = await AuthMfaService.loadUserAuthContext(credentials.email, transaction)
  if (!authContext) {
    throw new Errors.InvalidCredentialsError()
  }

  const { user, groups, mfa } = authContext
  const policy = await AuthPolicyService.getPolicy(transaction)

  if (AuthPolicyService.isAccountLocked(user, policy)) {
    throw new Errors.InvalidCredentialsError()
  }

  if (!await AuthPasswordService.verifyPassword(credentials.password, user.passwordHash)) {
    await AuthPolicyService.recordFailedLogin(user, policy, transaction)
    throw new Errors.InvalidCredentialsError()
  }

  if (AuthMfaService.userMustEnrollMfa(user, groups, mfa)) {
    throw new Errors.InvalidCredentialsError()
  }

  if (AuthMfaService.userRequiresMfaChallenge(user, groups, mfa)) {
    const totp = credentials.totp != null ? String(credentials.totp).trim() : ''
    if (!totp) {
      throw new Errors.InvalidCredentialsError()
    }
    await AuthMfaService.verifyMfaCode(user.id, totp, transaction)
  }

  return completeLogin(authContext, transaction)
}

async function refresh ({ refreshToken }, transaction) {
  return AuthTokenService.rotateRefreshToken(refreshToken, transaction)
}

async function profile (req, transaction) {
  const accessToken = req.headers.authorization.replace('Bearer ', '')
  const claims = decodeJwt(accessToken)

  const mfaRecord = claims.sub
    ? await db.AuthMfa.findOne(withTransaction(transaction, { where: { userId: claims.sub } }))
    : null

  return {
    sub: claims.sub,
    email: claims.email,
    preferred_username: claims.preferred_username,
    groups: claims.groups || [],
    password_change_required: claims.password_change_required === true,
    mfaEnabled: Boolean(mfaRecord && mfaRecord.enabled)
  }
}

async function logout (req, transaction) {
  const accessToken = req.headers.authorization.replace('Bearer ', '')

  try {
    const claims = decodeJwt(accessToken)
    if (claims.sub) {
      await AuthTokenService.revokeAllUserRefreshTokens(claims.sub, transaction)
      await destroyEmbeddedOidcStateForUser(claims.sub, transaction)
    }
  } catch (error) {
    // Best-effort logout
  }

  if (req.session) {
    delete req.session[OAUTH_SESSION_KEY]
  }

  return { status: 'success' }
}

module.exports = {
  login,
  refresh,
  profile,
  logout
}

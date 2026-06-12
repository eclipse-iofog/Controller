'use strict'

const crypto = require('crypto')
const { SignJWT, jwtVerify } = require('jose')
const db = require('../data/models')
const { getOidcSettings } = require('../config/oidc')
const AuthJwks = require('../config/auth-jwks')
const { getPolicy } = require('./auth-policy-service')
const { withTransaction } = require('../helpers/app-helper')
const Errors = require('../helpers/errors')

const PASSWORD_CHANGE_REQUIRED_CLAIM = 'password_change_required'
const ACCESS_TOKEN_USE = 'access'
const REFRESH_TOKEN_USE = 'refresh'

function buildUserAccessClaims (user, groupNames) {
  const identifier = user.email
  const claims = {
    preferred_username: identifier,
    groups: groupNames,
    token_use: ACCESS_TOKEN_USE
  }
  if (String(identifier).includes('@')) {
    claims.email = identifier
  }
  if (user.mustChangePassword) {
    claims[PASSWORD_CHANGE_REQUIRED_CLAIM] = true
  }
  return claims
}

function hashTokenJti (jti) {
  return crypto.createHash('sha256').update(jti).digest('hex')
}

function hashRefreshToken (value) {
  return hashTokenJti(value)
}

async function issueAccessToken (user, groupNames, policy, transaction) {
  const { issuerUrl, clientId } = getOidcSettings()
  const { kid, signingKey } = await AuthJwks.getActiveSigningMaterial(transaction)
  const ttlSeconds = policy.accessTokenTtlSeconds || 900

  const claims = buildUserAccessClaims(user, groupNames)

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(user.id)
    .setIssuer(issuerUrl)
    .setAudience(clientId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(signingKey)
}

async function persistRefreshToken (userId, jti, familyId, policy, transaction) {
  const ttlSeconds = policy.refreshTokenTtlSeconds || 3600
  await db.AuthRefreshToken.create({
    tokenHash: hashTokenJti(jti),
    userId,
    familyId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    revoked: false
  }, withTransaction(transaction))
}

async function issueRefreshToken (user, familyId, policy, transaction) {
  const { issuerUrl, clientId } = getOidcSettings()
  const { kid, signingKey } = await AuthJwks.getActiveSigningMaterial(transaction)
  const jti = crypto.randomUUID()
  const ttlSeconds = policy.refreshTokenTtlSeconds || 3600

  const refreshToken = await new SignJWT({
    token_use: REFRESH_TOKEN_USE,
    family_id: familyId
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(user.id)
    .setIssuer(issuerUrl)
    .setAudience(clientId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(signingKey)

  await persistRefreshToken(user.id, jti, familyId, policy, transaction)
  return refreshToken
}

async function issueTokenPair (user, groupNames, transaction) {
  const policy = await getPolicy(transaction)
  const familyId = crypto.randomUUID()
  const accessToken = await issueAccessToken(user, groupNames, policy, transaction)
  const refreshToken = await issueRefreshToken(user, familyId, policy, transaction)

  return { accessToken, refreshToken }
}

async function verifyRefreshJwt (refreshToken, transaction) {
  const { issuerUrl, clientId } = getOidcSettings()
  const { signingKey } = await AuthJwks.getActiveSigningMaterial(transaction)
  const verifyOptions = { issuer: issuerUrl }
  if (clientId) {
    verifyOptions.audience = clientId
  }

  let payload
  try {
    const result = await jwtVerify(refreshToken, signingKey, verifyOptions)
    payload = result.payload
  } catch (error) {
    throw new Errors.InvalidCredentialsError()
  }

  if (payload.token_use !== REFRESH_TOKEN_USE || !payload.jti) {
    throw new Errors.InvalidCredentialsError()
  }

  return payload
}

async function findValidRefreshTokenByJti (jti, transaction) {
  const tokenHash = hashTokenJti(jti)
  const row = await db.AuthRefreshToken.findOne(withTransaction(transaction, {
    where: {
      tokenHash,
      revoked: false
    }
  }))

  if (!row || row.expiresAt <= new Date()) {
    return null
  }

  return row
}

async function revokeRefreshTokenFamily (familyId, transaction) {
  await db.AuthRefreshToken.update({ revoked: true }, withTransaction(transaction, {
    where: { familyId }
  }))
}

async function rotateRefreshToken (refreshToken, transaction) {
  const claims = await verifyRefreshJwt(refreshToken, transaction)
  const row = await findValidRefreshTokenByJti(claims.jti, transaction)
  if (!row) {
    throw new Errors.InvalidCredentialsError()
  }

  if (row.userId !== claims.sub) {
    throw new Errors.InvalidCredentialsError()
  }

  if (claims.family_id && row.familyId !== claims.family_id) {
    throw new Errors.InvalidCredentialsError()
  }

  const policy = await getPolicy(transaction)
  const user = await db.AuthUser.findByPk(row.userId, withTransaction(transaction, {
    include: [{
      model: db.AuthGroup,
      as: 'groups',
      through: { attributes: [] }
    }]
  }))

  if (!user || user.deletedAt) {
    throw new Errors.InvalidCredentialsError()
  }

  if (policy.refreshRotation) {
    await row.update({ revoked: true }, withTransaction(transaction))
  }

  const groupNames = (user.groups || []).map((group) => group.name)
  const accessToken = await issueAccessToken(user, groupNames, policy, transaction)
  let nextRefreshToken = refreshToken

  if (policy.refreshRotation) {
    nextRefreshToken = await issueRefreshToken(user, row.familyId, policy, transaction)
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken
  }
}

async function revokeRefreshToken (refreshToken, transaction) {
  let claims
  try {
    claims = await verifyRefreshJwt(refreshToken, transaction)
  } catch (error) {
    return
  }

  const row = await findValidRefreshTokenByJti(claims.jti, transaction)
  if (!row) {
    return
  }
  await row.update({ revoked: true }, withTransaction(transaction))
}

async function revokeAllUserRefreshTokens (userId, transaction) {
  await db.AuthRefreshToken.update({ revoked: true }, withTransaction(transaction, {
    where: { userId, revoked: false }
  }))
}

module.exports = {
  PASSWORD_CHANGE_REQUIRED_CLAIM,
  ACCESS_TOKEN_USE,
  REFRESH_TOKEN_USE,
  buildUserAccessClaims,
  issueAccessToken,
  issueTokenPair,
  verifyRefreshJwt,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshTokenFamily,
  hashRefreshToken
}

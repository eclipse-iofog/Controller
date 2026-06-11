'use strict'

const crypto = require('crypto')
const { SignJWT } = require('jose')
const db = require('../data/models')
const { getOidcSettings } = require('../config/oidc')
const AuthJwks = require('../config/auth-jwks')
const { getPolicy } = require('./auth-policy-service')
const { withTransaction } = require('../helpers/app-helper')
const Errors = require('../helpers/errors')

function hashRefreshToken (token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createOpaqueRefreshToken () {
  return crypto.randomBytes(32).toString('base64url')
}

async function issueAccessToken (user, groupNames, policy, transaction) {
  const { issuerUrl, clientId } = getOidcSettings()
  const { kid, signingKey } = await AuthJwks.getActiveSigningMaterial(transaction)
  const ttlSeconds = policy.accessTokenTtlSeconds || 900

  return new SignJWT({
    preferred_username: user.email,
    email: user.email,
    groups: groupNames
  })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setSubject(user.id)
    .setIssuer(issuerUrl)
    .setAudience(clientId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(signingKey)
}

async function persistRefreshToken (userId, refreshToken, familyId, policy, transaction) {
  const ttlSeconds = policy.refreshTokenTtlSeconds || 604800
  await db.AuthRefreshToken.create({
    tokenHash: hashRefreshToken(refreshToken),
    userId,
    familyId,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    revoked: false
  }, withTransaction(transaction))
}

async function issueTokenPair (user, groupNames, transaction) {
  const policy = await getPolicy(transaction)
  const accessToken = await issueAccessToken(user, groupNames, policy, transaction)
  const refreshToken = createOpaqueRefreshToken()
  const familyId = crypto.randomUUID()

  await persistRefreshToken(user.id, refreshToken, familyId, policy, transaction)

  return { accessToken, refreshToken }
}

async function findValidRefreshToken (refreshToken, transaction) {
  const tokenHash = hashRefreshToken(refreshToken)
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
  const row = await findValidRefreshToken(refreshToken, transaction)
  if (!row) {
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
    nextRefreshToken = createOpaqueRefreshToken()
    await persistRefreshToken(user.id, nextRefreshToken, row.familyId, policy, transaction)
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken
  }
}

async function revokeRefreshToken (refreshToken, transaction) {
  const row = await findValidRefreshToken(refreshToken, transaction)
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
  issueAccessToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshTokenFamily,
  hashRefreshToken
}

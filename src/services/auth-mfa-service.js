'use strict'

const { generateSecret, verify, generateURI } = require('otplib')
const db = require('../data/models')
const Errors = require('../helpers/errors')
const { withTransaction } = require('../helpers/app-helper')
const secretHelper = require('../helpers/secret-helper')
const {
  verifyPassword,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyRecoveryCode,
  consumeRecoveryCode
} = require('./auth-password-service')

const ADMIN_GROUP = 'admin'

function normalizeGroupNames (groups) {
  return (groups || []).map((group) => String(group.name || group).toLowerCase())
}

function isMfaExempt (user) {
  return Boolean(user && user.isBootstrap)
}

function userRequiresMfa (groups) {
  return (groups || []).some((group) => group.mfaRequired === true)
}

function userMustEnrollMfa (user, groups, mfaRecord) {
  if (isMfaExempt(user)) {
    return false
  }
  return userRequiresMfa(groups) && (!mfaRecord || !mfaRecord.enabled)
}

function userRequiresMfaChallenge (user, groups, mfaRecord) {
  if (isMfaExempt(user)) {
    return false
  }
  return Boolean(mfaRecord && mfaRecord.enabled)
}

async function loadUserAuthContext (email, transaction) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await db.AuthUser.findOne(withTransaction(transaction, {
    where: {
      email: normalizedEmail,
      deletedAt: null
    },
    include: [
      {
        model: db.AuthGroup,
        as: 'groups',
        through: { attributes: [] }
      },
      {
        model: db.AuthMfa,
        as: 'mfa'
      }
    ]
  }))

  if (!user) {
    return null
  }

  return {
    user,
    groups: user.groups || [],
    mfa: user.mfa || null,
    groupNames: normalizeGroupNames(user.groups)
  }
}

async function decryptTotpSecret (mfaRecord) {
  if (!mfaRecord || !mfaRecord.totpSecretEncrypted) {
    return null
  }

  const data = await secretHelper.decryptSecret(
    mfaRecord.totpSecretEncrypted,
    `auth-mfa-${mfaRecord.userId}`,
    'auth-mfa'
  )
  return data.secret || data.totpSecret || null
}

async function verifyTotpCode (mfaRecord, code) {
  const secret = await decryptTotpSecret(mfaRecord)
  if (!secret) {
    return false
  }
  const result = await verify({ token: code, secret })
  return result.valid === true
}

async function verifyMfaCode (userId, code, transaction) {
  const mfaRecord = await db.AuthMfa.findOne(withTransaction(transaction, {
    where: { userId }
  }))

  if (!mfaRecord || !mfaRecord.enabled) {
    throw new Errors.InvalidCredentialsError()
  }

  if (await verifyTotpCode(mfaRecord, code)) {
    return true
  }

  const updatedRecoveryHashes = await consumeRecoveryCode(code, mfaRecord.recoveryCodesHash)
  if (updatedRecoveryHashes) {
    await mfaRecord.update({ recoveryCodesHash: updatedRecoveryHashes }, withTransaction(transaction))
    return true
  }

  throw new Errors.InvalidCredentialsError()
}

async function enrollMfa (userId, transaction) {
  const existing = await db.AuthMfa.findOne(withTransaction(transaction, { where: { userId } }))
  if (existing && existing.enabled) {
    throw new Errors.ValidationError('MFA is already enabled')
  }

  const user = await db.AuthUser.findByPk(userId, withTransaction(transaction))
  if (!user || user.deletedAt) {
    throw new Errors.NotFoundError('User not found')
  }

  const secret = generateSecret()
  const totpSecretEncrypted = await secretHelper.encryptSecret(
    { secret },
    `auth-mfa-${userId}`,
    'auth-mfa'
  )

  if (existing) {
    await existing.update({
      totpSecretEncrypted,
      enabled: false,
      recoveryCodesHash: null
    }, withTransaction(transaction))
  } else {
    await db.AuthMfa.create({
      userId,
      totpSecretEncrypted,
      enabled: false
    }, withTransaction(transaction))
  }

  const otpauthUrl = generateURI({
    issuer: 'Controller',
    label: user.email,
    secret
  })
  return {
    secret,
    otpauthUrl
  }
}

async function confirmMfa (userId, code, transaction) {
  const mfaRecord = await db.AuthMfa.findOne(withTransaction(transaction, { where: { userId } }))
  if (!mfaRecord || !mfaRecord.totpSecretEncrypted) {
    throw new Errors.ValidationError('MFA enrollment has not been started')
  }
  if (mfaRecord.enabled) {
    throw new Errors.ValidationError('MFA is already enabled')
  }

  if (!await verifyTotpCode(mfaRecord, code)) {
    throw new Errors.InvalidCredentialsError()
  }

  const recoveryCodes = generateRecoveryCodes()
  const recoveryCodesHash = await hashRecoveryCodes(recoveryCodes)
  await mfaRecord.update({
    enabled: true,
    recoveryCodesHash
  }, withTransaction(transaction))

  return { recoveryCodes }
}

async function disableMfa (userId, password, code, transaction) {
  const user = await db.AuthUser.findByPk(userId, withTransaction(transaction, {
    include: [{ model: db.AuthMfa, as: 'mfa' }]
  }))

  if (!user || user.deletedAt) {
    throw new Errors.NotFoundError('User not found')
  }
  if (!user.mfa || !user.mfa.enabled) {
    throw new Errors.ValidationError('MFA is not enabled')
  }
  if (!await verifyPassword(password, user.passwordHash)) {
    throw new Errors.InvalidCredentialsError()
  }
  if (!await verifyTotpCode(user.mfa, code) && !await verifyRecoveryCode(code, user.mfa.recoveryCodesHash)) {
    throw new Errors.InvalidCredentialsError()
  }

  await user.mfa.update({
    enabled: false,
    totpSecretEncrypted: null,
    recoveryCodesHash: null
  }, withTransaction(transaction))

  return { status: 'success' }
}

module.exports = {
  ADMIN_GROUP,
  isMfaExempt,
  userRequiresMfa,
  userMustEnrollMfa,
  userRequiresMfaChallenge,
  loadUserAuthContext,
  verifyMfaCode,
  enrollMfa,
  confirmMfa,
  disableMfa
}

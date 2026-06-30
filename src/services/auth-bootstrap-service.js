'use strict'

const crypto = require('crypto')
const config = require('../config')
const logger = require('../logger')
const db = require('../data/models')
const secretHelper = require('../helpers/secret-helper')
const AuthPasswordService = require('./auth-password-service')
const AuthPolicyService = require('./auth-policy-service')
const AuthTokenService = require('./auth-token-service')
const { runInTransaction } = require('../helpers/transaction-runner')
const { ADMIN_GROUP } = require('./auth-mfa-service')

const SYSTEM_GROUPS = ['admin', 'sre', 'developer', 'viewer']

function normalizeBootstrapUsername (username) {
  return String(username || '').trim().toLowerCase()
}

async function resolveBootstrapPassword (passwordRef) {
  if (!passwordRef) {
    return null
  }

  if (secretHelper.isVaultReference(passwordRef)) {
    const data = await secretHelper.decryptSecret(passwordRef, 'bootstrap-admin-password', 'auth-bootstrap')
    return data.password || data.secret || data.value || null
  }

  try {
    const data = await secretHelper.decryptSecret(passwordRef, 'bootstrap-admin-password', 'auth-bootstrap')
    return data.password || data.secret || data.value || passwordRef
  } catch (error) {
    return passwordRef
  }
}

function getBootstrapConfig () {
  return {
    username: (process.env.OIDC_BOOTSTRAP_ADMIN_USERNAME || config.get('auth.bootstrap.username') || '').trim(),
    passwordRef: process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD || config.get('auth.bootstrap.password') || '',
    allowBootstrapLog: config.getBoolean('auth.insecureAllowBootstrapLog', false)
  }
}

async function ensureSystemGroups (transaction) {
  for (const name of SYSTEM_GROUPS) {
    await db.AuthGroup.findOrCreate({
      where: { name },
      defaults: {
        name,
        isSystem: true,
        mfaRequired: false
      },
      transaction
    })
  }
}

async function findBootstrapUser (transaction) {
  return db.AuthUser.findOne({
    where: { isBootstrap: true },
    transaction
  })
}

async function hardDeleteBootstrapUser (user, transaction) {
  await AuthTokenService.revokeAllUserRefreshTokens(user.id, transaction)
  await db.AuthUserGroup.destroy({ where: { userId: user.id }, transaction })
  await db.AuthMfa.destroy({ where: { userId: user.id }, transaction })
  await db.AuthPasswordResetSession.destroy({ where: { userId: user.id }, transaction })
  await db.AuthRefreshToken.destroy({ where: { userId: user.id }, transaction })
  await user.destroy({ transaction })
}

async function bootstrapMatchesEnv (bootstrapUser, normalizedUsername, plainPassword) {
  if (bootstrapUser.email !== normalizedUsername) {
    return false
  }
  return AuthPasswordService.verifyPassword(plainPassword, bootstrapUser.passwordHash)
}

async function createBootstrapUser (normalizedUsername, plainPassword, transaction, allowBootstrapLog) {
  const adminGroup = await db.AuthGroup.findOne({
    where: { name: ADMIN_GROUP },
    transaction
  })
  if (!adminGroup) {
    throw new Error('System admin group is missing from AuthGroups')
  }

  const userId = crypto.randomUUID()
  const passwordHash = await AuthPasswordService.hashPassword(plainPassword)
  const user = await db.AuthUser.create({
    id: userId,
    email: normalizedUsername,
    passwordHash,
    isBootstrap: true,
    mustChangePassword: false
  }, { transaction })

  await db.AuthUserGroup.create({
    userId: user.id,
    groupId: adminGroup.id
  }, { transaction })

  logger.info(`Embedded auth bootstrap admin created for ${normalizedUsername}`)
  if (allowBootstrapLog) {
    logger.warn(`Bootstrap admin temporary password for ${normalizedUsername}: ${plainPassword}`)
  }

  return user
}

async function runBootstrapInternal (transaction) {
  await ensureSystemGroups(transaction)

  let meta = await db.AuthBootstrapMeta.findByPk(1, {
    transaction,
    lock: transaction.LOCK.UPDATE
  })
  if (!meta) {
    meta = await db.AuthBootstrapMeta.create({ id: 1 }, { transaction })
  }

  const existingBootstrap = await findBootstrapUser(transaction)
  const { username, passwordRef, allowBootstrapLog } = getBootstrapConfig()

  if (!username || !passwordRef) {
    if (existingBootstrap) {
      logger.warn('Embedded auth bootstrap env missing; keeping existing bootstrap admin')
    } else {
      logger.warn('Embedded auth bootstrap skipped: OIDC_BOOTSTRAP_ADMIN_USERNAME and OIDC_BOOTSTRAP_ADMIN_PASSWORD are required for first boot')
    }
    return { skipped: true, reason: existingBootstrap ? 'env_missing_keep_existing' : 'missing_credentials' }
  }

  const plainPassword = await resolveBootstrapPassword(passwordRef)
  if (!plainPassword) {
    if (existingBootstrap) {
      logger.warn('Embedded auth bootstrap password could not be resolved; keeping existing bootstrap admin')
    } else {
      logger.warn('Embedded auth bootstrap skipped: bootstrap admin password could not be resolved')
    }
    return { skipped: true, reason: existingBootstrap ? 'env_missing_keep_existing' : 'missing_credentials' }
  }

  const policy = await AuthPolicyService.getPolicy(transaction)
  AuthPasswordService.validatePasswordComplexity(plainPassword, policy)
  const normalizedUsername = normalizeBootstrapUsername(username)

  if (existingBootstrap) {
    if (await bootstrapMatchesEnv(existingBootstrap, normalizedUsername, plainPassword)) {
      await meta.update({
        completedAt: new Date(),
        bootstrapAdminUserId: existingBootstrap.id
      }, { transaction })
      return { skipped: true, reason: 'unchanged', userId: existingBootstrap.id, username: normalizedUsername }
    }

    logger.info(`Embedded auth bootstrap admin rotation: replacing ${existingBootstrap.email}`)
    await hardDeleteBootstrapUser(existingBootstrap, transaction)
  } else {
    const conflictingUser = await db.AuthUser.findOne({
      where: { email: normalizedUsername, deletedAt: null },
      transaction
    })
    if (conflictingUser) {
      logger.warn(`Embedded auth bootstrap skipped: user ${normalizedUsername} already exists and is not bootstrap`)
      await meta.update({
        completedAt: new Date(),
        bootstrapAdminUserId: conflictingUser.id
      }, { transaction })
      return { skipped: true, reason: 'user_exists', userId: conflictingUser.id }
    }
  }

  const user = await createBootstrapUser(normalizedUsername, plainPassword, transaction, allowBootstrapLog)

  await meta.update({
    completedAt: new Date(),
    bootstrapAdminUserId: user.id
  }, { transaction })

  return { skipped: false, userId: user.id, username: normalizedUsername }
}

async function runBootstrap (outerTransaction) {
  if (outerTransaction) {
    return runBootstrapInternal(outerTransaction)
  }

  return runInTransaction(
    (transaction) => runBootstrapInternal(transaction),
    { label: 'auth.bootstrap' }
  )
}

module.exports = {
  SYSTEM_GROUPS,
  ensureSystemGroups,
  getBootstrapConfig,
  normalizeBootstrapUsername,
  runBootstrap
}

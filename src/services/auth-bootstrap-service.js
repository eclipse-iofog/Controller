'use strict'

const crypto = require('crypto')
const config = require('../config')
const logger = require('../logger')
const db = require('../data/models')
const secretHelper = require('../helpers/secret-helper')
const AuthPasswordService = require('./auth-password-service')
const AuthPolicyService = require('./auth-policy-service')
const { ADMIN_GROUP } = require('./auth-mfa-service')

const SYSTEM_GROUPS = ['admin', 'sre', 'developer', 'viewer']

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
    email: (process.env.OIDC_BOOTSTRAP_ADMIN_EMAIL || config.get('auth.bootstrap.adminEmail') || '').trim().toLowerCase(),
    passwordRef: process.env.OIDC_BOOTSTRAP_ADMIN_PASSWORD || config.get('auth.bootstrap.adminPassword') || '',
    allowBootstrapLog: config.get('auth.insecureAllowBootstrapLog', false) === true
  }
}

async function ensureSystemGroups (transaction) {
  for (const name of SYSTEM_GROUPS) {
    await db.AuthGroup.findOrCreate({
      where: { name },
      defaults: { name, isSystem: true },
      transaction
    })
  }
}

async function runBootstrap (outerTransaction) {
  const transaction = outerTransaction || await db.sequelize.transaction()
  const ownTransaction = !outerTransaction

  try {
    await ensureSystemGroups(transaction)

    let meta = await db.AuthBootstrapMeta.findByPk(1, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })
    if (!meta) {
      meta = await db.AuthBootstrapMeta.create({ id: 1 }, { transaction })
    }

    if (meta.completedAt) {
      if (ownTransaction) {
        await transaction.commit()
      }
      return { skipped: true, reason: 'already_completed' }
    }

    const { email, passwordRef, allowBootstrapLog } = getBootstrapConfig()
    if (!email || !passwordRef) {
      logger.warn('Embedded auth bootstrap skipped: OIDC_BOOTSTRAP_ADMIN_EMAIL and OIDC_BOOTSTRAP_ADMIN_PASSWORD are required for first boot')
      if (ownTransaction) {
        await transaction.commit()
      }
      return { skipped: true, reason: 'missing_credentials' }
    }

    const plainPassword = await resolveBootstrapPassword(passwordRef)
    if (!plainPassword) {
      logger.warn('Embedded auth bootstrap skipped: bootstrap admin password could not be resolved')
      if (ownTransaction) {
        await transaction.commit()
      }
      return { skipped: true, reason: 'missing_credentials' }
    }

    const policy = await AuthPolicyService.getPolicy(transaction)
    AuthPasswordService.validatePasswordComplexity(plainPassword, policy)

    const existingUser = await db.AuthUser.findOne({
      where: { email, deletedAt: null },
      transaction
    })
    if (existingUser) {
      await meta.update({
        completedAt: new Date(),
        bootstrapAdminUserId: existingUser.id
      }, { transaction })
      logger.info(`Embedded auth bootstrap marked complete for existing user ${email}`)
      if (ownTransaction) {
        await transaction.commit()
      }
      return { skipped: true, reason: 'user_exists', userId: existingUser.id }
    }

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
      email,
      passwordHash,
      isBootstrap: true,
      mustChangePassword: false
    }, { transaction })

    await db.AuthUserGroup.create({
      userId: user.id,
      groupId: adminGroup.id
    }, { transaction })

    await meta.update({
      completedAt: new Date(),
      bootstrapAdminUserId: user.id
    }, { transaction })

    logger.info(`Embedded auth bootstrap admin created for ${email}`)
    if (allowBootstrapLog) {
      logger.warn(`Bootstrap admin temporary password for ${email}: ${plainPassword}`)
    }

    if (ownTransaction) {
      await transaction.commit()
    }
    return { skipped: false, userId: user.id, email }
  } catch (error) {
    if (ownTransaction) {
      await transaction.rollback()
    }
    throw error
  }
}

module.exports = {
  SYSTEM_GROUPS,
  ensureSystemGroups,
  runBootstrap
}

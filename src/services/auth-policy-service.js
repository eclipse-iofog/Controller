'use strict'

const db = require('../data/models')
const { withTransaction } = require('../helpers/app-helper')

const DEFAULT_POLICY = {
  minPasswordLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  passwordMaxAgeDays: 0,
  passwordHistoryCount: 5,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 604800,
  refreshRotation: true,
  maxConcurrentSessions: null
}

async function getPolicy (transaction) {
  const policy = await db.AuthPolicy.findByPk(1, withTransaction(transaction))
  if (!policy) {
    return { ...DEFAULT_POLICY }
  }
  return policy.get({ plain: true })
}

function isAccountLocked (user, policy) {
  if (!user.lockedUntil) {
    return false
  }
  const lockedUntil = user.lockedUntil instanceof Date ? user.lockedUntil : new Date(user.lockedUntil)
  if (lockedUntil <= new Date()) {
    return false
  }
  return true
}

async function recordFailedLogin (user, policy, transaction) {
  const failedAttempts = (user.failedAttempts || 0) + 1
  const updates = { failedAttempts }

  if (failedAttempts >= policy.maxFailedAttempts) {
    updates.lockedUntil = new Date(Date.now() + policy.lockoutDurationMinutes * 60 * 1000)
  }

  await user.update(updates, withTransaction(transaction))
  return user.reload(withTransaction(transaction))
}

async function resetFailedLogin (user, transaction) {
  if (!user.failedAttempts && !user.lockedUntil) {
    return user
  }
  await user.update({
    failedAttempts: 0,
    lockedUntil: null
  }, withTransaction(transaction))
  return user.reload(withTransaction(transaction))
}

module.exports = {
  DEFAULT_POLICY,
  getPolicy,
  isAccountLocked,
  recordFailedLogin,
  resetFailedLogin
}

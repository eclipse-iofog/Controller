'use strict'

const crypto = require('crypto')
const { hash, verify } = require('@node-rs/argon2')
const Errors = require('../helpers/errors')

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
}

async function hashPassword (plainPassword) {
  return hash(plainPassword, ARGON2_OPTIONS)
}

async function verifyPassword (plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false
  }
  try {
    return await verify(passwordHash, plainPassword, ARGON2_OPTIONS)
  } catch (error) {
    return false
  }
}

function validatePasswordComplexity (plainPassword, policy) {
  const errors = []

  if (!plainPassword || plainPassword.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters`)
  }
  if (policy.requireUppercase && !/[A-Z]/.test(plainPassword || '')) {
    errors.push('Password must contain an uppercase letter')
  }
  if (policy.requireLowercase && !/[a-z]/.test(plainPassword || '')) {
    errors.push('Password must contain a lowercase letter')
  }
  if (policy.requireDigit && !/[0-9]/.test(plainPassword || '')) {
    errors.push('Password must contain a digit')
  }

  if (errors.length > 0) {
    throw new Errors.ValidationError(errors.join('; '))
  }
}

async function assertPasswordNotInHistory (plainPassword, policy, passwordHashes = []) {
  if (!policy.passwordHistoryCount || policy.passwordHistoryCount <= 0) {
    return
  }

  for (const previousHash of passwordHashes.slice(0, policy.passwordHistoryCount)) {
    if (previousHash && await verifyPassword(plainPassword, previousHash)) {
      throw new Errors.ValidationError('Password was used recently and cannot be reused')
    }
  }
}

async function recordPasswordHistory (previousHashes, previousPasswordHash, policy) {
  if (!policy.passwordHistoryCount || policy.passwordHistoryCount <= 0 || !previousPasswordHash) {
    return previousHashes
  }

  return [previousPasswordHash, ...(previousHashes || [])].slice(0, policy.passwordHistoryCount)
}

function generateRecoveryCodes (count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(5).toString('hex'))
  }
  return codes
}

async function hashRecoveryCodes (codes) {
  const hashed = []
  for (const code of codes) {
    hashed.push(await hashPassword(code))
  }
  return JSON.stringify(hashed)
}

async function verifyRecoveryCode (code, recoveryCodesHash) {
  if (!code || !recoveryCodesHash) {
    return false
  }

  let storedHashes
  try {
    storedHashes = JSON.parse(recoveryCodesHash)
  } catch (error) {
    return false
  }

  for (const storedHash of storedHashes) {
    if (await verifyPassword(code, storedHash)) {
      return true
    }
  }
  return false
}

async function consumeRecoveryCode (code, recoveryCodesHash) {
  if (!code || !recoveryCodesHash) {
    return null
  }

  let storedHashes
  try {
    storedHashes = JSON.parse(recoveryCodesHash)
  } catch (error) {
    return null
  }

  for (let index = 0; index < storedHashes.length; index++) {
    if (await verifyPassword(code, storedHashes[index])) {
      storedHashes.splice(index, 1)
      return JSON.stringify(storedHashes)
    }
  }
  return null
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
  assertPasswordNotInHistory,
  recordPasswordHistory,
  generateRecoveryCodes,
  hashRecoveryCodes,
  verifyRecoveryCode,
  consumeRecoveryCode
}

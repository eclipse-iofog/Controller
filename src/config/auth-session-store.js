'use strict'

const crypto = require('crypto')
const session = require('express-session')
const config = require('./index')
const logger = require('../logger')
const secretHelper = require('../helpers/secret-helper')

const VALID_TYPES = ['memory', 'database']
const DEFAULT_TTL_MS = 10 * 60 * 1000
const SESSION_SECRET_NAME = 'auth-bff-session-secret'

let storeInstance = null
let cachedSessionSecret = null

function getDatabaseProvider () {
  return process.env.DB_PROVIDER || config.get('database.provider', 'sqlite')
}

function getSessionStoreType () {
  const explicit = process.env.AUTH_SESSION_STORE_TYPE || config.get('auth.sessionStore.type')
  if (explicit) {
    if (!VALID_TYPES.includes(explicit)) {
      throw new Error(`Invalid auth.sessionStore.type "${explicit}". Must be memory or database`)
    }
    return explicit
  }

  const provider = getDatabaseProvider()
  if (provider === 'mysql' || provider === 'postgres') {
    return 'database'
  }
  return 'memory'
}

function getSessionStoreTtlMs () {
  const envValue = process.env.AUTH_SESSION_STORE_TTL_MS
  if (envValue !== undefined && envValue !== null && envValue !== '') {
    const parsed = Number(envValue)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('AUTH_SESSION_STORE_TTL_MS must be a positive number')
    }
    return parsed
  }

  const configured = config.get('auth.sessionStore.ttlMs', DEFAULT_TTL_MS)
  const parsed = Number(configured)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_MS
  }
  return parsed
}

function getSessionStoreConfig () {
  return {
    type: getSessionStoreType(),
    ttlMs: getSessionStoreTtlMs()
  }
}

function getConfiguredSessionSecret () {
  const envSecret = process.env.AUTH_SESSION_SECRET
  if (envSecret) {
    return envSecret
  }

  const configured = config.get('auth.sessionStore.secret')
  if (configured) {
    return configured
  }

  return null
}

async function resolveStoredSessionSecret (secretRef) {
  if (!secretRef) {
    return null
  }

  try {
    const data = await secretHelper.decryptSecret(secretRef, SESSION_SECRET_NAME, 'auth-session')
    return data.secret || data.value || null
  } catch (error) {
    return null
  }
}

async function persistSessionSecret (db, secret) {
  const secretRef = await secretHelper.encryptSecret({ secret }, SESSION_SECRET_NAME, 'auth-session')
  let meta = await db.AuthBootstrapMeta.findByPk(1)
  if (!meta) {
    meta = await db.AuthBootstrapMeta.create({ id: 1, sessionSecretRef: secretRef })
    return meta
  }

  await meta.update({ sessionSecretRef: secretRef })
  return meta
}

function generateSessionSecret () {
  return crypto.randomBytes(32).toString('base64url')
}

async function resolveSessionSecret () {
  const configured = getConfiguredSessionSecret()
  if (configured) {
    cachedSessionSecret = configured
    return configured
  }

  const db = require('../data/models')
  if (!db.AuthBootstrapMeta) {
    throw new Error('AuthBootstrapMeta model is required to resolve auth session secret')
  }

  let meta = await db.AuthBootstrapMeta.findByPk(1)
  if (!meta) {
    meta = await db.AuthBootstrapMeta.create({ id: 1 })
  }

  const storedSecret = await resolveStoredSessionSecret(meta.sessionSecretRef)
  if (storedSecret) {
    cachedSessionSecret = storedSecret
    return storedSecret
  }

  const generated = generateSessionSecret()
  await persistSessionSecret(db, generated)
  logger.info('Generated auth BFF session secret and persisted to database')
  cachedSessionSecret = generated
  return generated
}

function getSessionSecret () {
  if (!cachedSessionSecret) {
    throw new Error('Auth session secret is not initialized. Call resolveSessionSecret() during startup.')
  }
  return cachedSessionSecret
}

function createSessionStore () {
  const { type, ttlMs } = getSessionStoreConfig()

  if (type === 'memory') {
    return new session.MemoryStore()
  }

  const db = require('../data/models')
  if (!db.AuthBffSession) {
    throw new Error('Database session store requires AuthBffSession model')
  }

  const SequelizeSessionStore = require('../data/stores/sequelize-session-store')
  return new SequelizeSessionStore({
    model: db.AuthBffSession,
    ttlMs
  })
}

function initAuthSessionStore () {
  if (!storeInstance) {
    storeInstance = createSessionStore()
    logger.info(`Auth BFF session store initialized (${getSessionStoreConfig().type})`)
  }
  return storeInstance
}

function getAuthSessionStore () {
  return storeInstance || initAuthSessionStore()
}

function isSharedSessionStore () {
  return getSessionStoreType() !== 'memory'
}

function resetAuthSessionStoreForTests () {
  storeInstance = null
  cachedSessionSecret = null
}

function setSessionSecretForTests (secret) {
  cachedSessionSecret = secret
}

module.exports = {
  getSessionStoreConfig,
  getSessionStoreTtlMs,
  getSessionSecret,
  resolveSessionSecret,
  initAuthSessionStore,
  getAuthSessionStore,
  isSharedSessionStore,
  resetAuthSessionStoreForTests,
  setSessionSecretForTests,
  getMemoryStore: getAuthSessionStore
}

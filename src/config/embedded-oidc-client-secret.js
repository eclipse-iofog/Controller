'use strict'

const crypto = require('crypto')
const config = require('./index')
const logger = require('../logger')
const secretHelper = require('../helpers/secret-helper')

const CONTROLLER_CLIENT_ID = 'controller'

function getConfidentialClientId () {
  return process.env.OIDC_CLIENT_ID || config.get('auth.client.id') || CONTROLLER_CLIENT_ID
}

function getEnvClientSecret () {
  const secret = process.env.OIDC_CLIENT_SECRET || config.get('auth.client.secret') || ''
  return secret || null
}

function generateClientSecret () {
  return crypto.randomBytes(32).toString('base64url')
}

async function resolveStoredSecret (secretRef, secretName, secretType) {
  if (!secretRef) {
    return null
  }

  if (secretHelper.isVaultReference(secretRef)) {
    const data = await secretHelper.decryptSecret(secretRef, secretName, secretType)
    return data.secret || data.client_secret || data.value || null
  }

  try {
    const data = await secretHelper.decryptSecret(secretRef, secretName, secretType)
    return data.secret || data.client_secret || data.value || null
  } catch (error) {
    return secretRef
  }
}

async function persistClientSecret (db, clientId, secret) {
  const secretRef = await secretHelper.encryptSecret({ secret }, `oidc-client-${clientId}`, 'oidc-client')
  const existing = await db.AuthOidcClient.findOne({ where: { clientId } })
  if (existing) {
    await existing.update({ secretRef })
    return existing
  }

  return db.AuthOidcClient.create({
    clientId,
    secretRef,
    clientType: 'confidential'
  })
}

/**
 * Resolve the embedded confidential OIDC client secret (env → DB → optional generate).
 * Env wins at runtime; when env differs from DB, DB is reconciled on startup (encrypted).
 */
async function resolveConfidentialClientSecret (db, { createIfMissing = false } = {}) {
  const clientId = getConfidentialClientId()
  const envSecret = getEnvClientSecret()

  if (!db || !db.AuthOidcClient) {
    if (envSecret) {
      return { clientId, clientSecret: envSecret }
    }
    throw new Error('AuthOidcClient model is required to resolve embedded OIDC client secret')
  }

  const clientRow = await db.AuthOidcClient.findOne({ where: { clientId } })
  let dbSecret = null
  if (clientRow && clientRow.secretRef) {
    dbSecret = await resolveStoredSecret(clientRow.secretRef, `oidc-client-${clientId}`, 'oidc-client')
  }

  if (envSecret) {
    if (!dbSecret || dbSecret !== envSecret) {
      await persistClientSecret(db, clientId, envSecret)
      if (dbSecret && dbSecret !== envSecret) {
        logger.info(`Reconciled embedded OIDC client secret for "${clientId}" from env`)
      }
    }
    return { clientId, clientSecret: envSecret }
  }

  if (dbSecret) {
    return { clientId, clientSecret: dbSecret }
  }

  if (createIfMissing) {
    const secret = generateClientSecret()
    await persistClientSecret(db, clientId, secret)
    logger.info(`Generated embedded OIDC client secret for "${clientId}"`)
    return { clientId, clientSecret: secret }
  }

  throw new Error(
    `Embedded OIDC client secret for "${clientId}" is not available. ` +
    'Ensure embedded issuer is initialized or set OIDC_CLIENT_SECRET.'
  )
}

module.exports = {
  CONTROLLER_CLIENT_ID,
  getConfidentialClientId,
  resolveConfidentialClientSecret
}

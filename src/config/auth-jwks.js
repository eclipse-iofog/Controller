'use strict'

const { importJWK } = require('jose')
const db = require('../data/models')
const { withTransaction } = require('../helpers/app-helper')
const secretHelper = require('../helpers/secret-helper')

let cachedSigningMaterial = null

async function loadPrivateJwk (row) {
  if (row.vaultRef) {
    const data = await secretHelper.decryptSecret(row.vaultRef, `oidc-key-${row.kid}`, 'oidc-key')
    return data.jwk
  }

  if (row.keyMaterialEncrypted) {
    const data = await secretHelper.decryptSecret(row.keyMaterialEncrypted, `oidc-key-${row.kid}`, 'oidc-key')
    return data.jwk
  }

  return null
}

async function getActiveSigningMaterial (transaction, forceReload = false) {
  if (cachedSigningMaterial && !forceReload) {
    return cachedSigningMaterial
  }

  if (!db.AuthOidcKey) {
    throw new Error('Auth models are not initialized')
  }

  const activeKeys = await db.AuthOidcKey.findAll(withTransaction(transaction, {
    where: { active: true },
    order: [['id', 'ASC']]
  }))

  for (const row of activeKeys) {
    const privateJwk = await loadPrivateJwk(row)
    if (privateJwk) {
      cachedSigningMaterial = {
        kid: privateJwk.kid || row.kid,
        privateJwk,
        signingKey: await importJWK(privateJwk, 'RS256')
      }
      return cachedSigningMaterial
    }
  }

  throw new Error('Embedded OIDC signing key is not configured')
}

function getPublicJwk (privateJwk) {
  const publicJwk = { ...privateJwk }
  delete publicJwk.d
  delete publicJwk.p
  delete publicJwk.q
  delete publicJwk.dp
  delete publicJwk.dq
  delete publicJwk.qi
  return publicJwk
}

function resetSigningMaterialCache () {
  cachedSigningMaterial = null
}

function resetSigningMaterialCacheForTests () {
  resetSigningMaterialCache()
}

module.exports = {
  getActiveSigningMaterial,
  getPublicJwk,
  resetSigningMaterialCache,
  resetSigningMaterialCacheForTests
}

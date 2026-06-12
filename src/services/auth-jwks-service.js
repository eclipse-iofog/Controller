'use strict'

const crypto = require('crypto')
const { generateKeyPair, exportJWK } = require('jose')
const db = require('../data/models')
const secretHelper = require('../helpers/secret-helper')
const { withTransaction } = require('../helpers/app-helper')
const TransactionDecorator = require('../decorators/transaction-decorator')
const { resetSigningMaterialCache } = require('../config/auth-jwks')
const AuthUserService = require('./auth-user-service')

async function rotateSigningKey (transaction) {
  AuthUserService.ensureEmbeddedMode()

  await db.AuthOidcKey.update(
    { active: false },
    withTransaction(transaction, { where: { active: true } })
  )

  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const publicJwk = await exportJWK(publicKey)
  const privateJwk = await exportJWK(privateKey)
  const kid = crypto.randomUUID()

  publicJwk.kid = kid
  publicJwk.alg = 'RS256'
  publicJwk.use = 'sig'
  privateJwk.kid = kid
  privateJwk.alg = 'RS256'
  privateJwk.use = 'sig'

  const keyMaterialEncrypted = await secretHelper.encryptSecret(
    { jwk: privateJwk },
    `oidc-key-${kid}`,
    'oidc-key'
  )

  await db.AuthOidcKey.create({
    kid,
    keyMaterialEncrypted,
    active: true
  }, withTransaction(transaction))

  resetSigningMaterialCache()

  return {
    kid,
    rotatedAt: new Date().toISOString(),
    restartRequired: true
  }
}

module.exports = {
  rotateSigningKey: TransactionDecorator.generateTransaction(rotateSigningKey)
}

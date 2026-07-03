'use strict'

const { isTest } = require('./app-helper')
const logger = require('../logger')
const SecretHelper = require('./secret-helper')
const vaultManager = require('../vault/vault-manager')
const { runInTransaction, PRIORITY_INTERACTIVE } = require('./transaction-runner')

/**
 * Run vault HTTP work after the Sequelize transaction commits (or immediately in tests).
 * Failures are logged; they do not roll back the committed DB state.
 */
function scheduleVaultAfterCommit (transaction, fn, label = 'vault') {
  const run = () => Promise.resolve(fn()).catch((err) => {
    logger.warn(`Deferred vault work (${label}) failed: ${err.message}`)
  })

  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(run)
    return
  }

  if (isTest()) {
    return run()
  }
}

function shouldDeferVaultStore (secretType, useVault) {
  if (secretType === 'configmap' && useVault === false) {
    return false
  }
  return vaultManager.isEnabled()
}

function scheduleVaultDeleteAfterCommit (transaction, secretName, secretType, label) {
  if (!vaultManager.isEnabled()) {
    return
  }
  scheduleVaultAfterCommit(
    transaction,
    () => SecretHelper.deleteSecret(secretName, secretType),
    label || `vault.delete.${secretName}`
  )
}

/**
 * After commit: store plaintext in vault and patch the DB row with the vault reference.
 */
function scheduleVaultPromoteAfterCommit (transaction, {
  secretData,
  secretName,
  secretType,
  useVault = null,
  model,
  where,
  field
}, label) {
  if (!shouldDeferVaultStore(secretType, useVault)) {
    return
  }

  const promoteLabel = label || `vault.promote.${secretName}`
  scheduleVaultAfterCommit(transaction, async () => {
    const Model = typeof model === 'function' ? model() : model
    if (!Model) {
      throw new Error('Model not available for vault promote')
    }
    const vaultRef = await SecretHelper.storeInVaultAndGetReference(
      secretData,
      secretName,
      secretType,
      useVault
    )
    await runInTransaction(async (tx) => {
      await Model.update({ [field]: vaultRef }, { where, transaction: tx })
    }, { priority: PRIORITY_INTERACTIVE, label: promoteLabel })
  }, promoteLabel)
}

module.exports = {
  scheduleVaultAfterCommit,
  scheduleVaultDeleteAfterCommit,
  scheduleVaultPromoteAfterCommit,
  shouldDeferVaultStore
}

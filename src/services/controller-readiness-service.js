const databaseProvider = require('../data/providers/database-factory')
const vaultManager = require('../vault/vault-manager')
const oidcConfig = require('../config/oidc')
const authJwks = require('../config/auth-jwks')
const transactionRunner = require('../helpers/transaction-runner')
const { isSqliteBusyError } = require('../helpers/db-busy-retry')
const CODES = require('../helpers/agent-auth-error-codes')
const { ReadinessNotReadyError, TransactionTimeoutError } = require('../helpers/errors')

async function checkDatabaseReady () {
  if (transactionRunner.isSqliteProvider()) {
    await transactionRunner.runSqliteReadOutsideQueue(async () => {
      await databaseProvider.sequelize.query('SELECT 1')
    }, { label: transactionRunner.READINESS_LABEL })
    return
  }

  await transactionRunner.runInTransaction(async (transaction) => {
    await databaseProvider.sequelize.query('SELECT 1', { transaction })
  }, { label: transactionRunner.READINESS_LABEL })
}

async function checkVaultReady () {
  if (!vaultManager.isEnabled()) {
    return
  }

  const provider = vaultManager.getProvider()
  if (provider && typeof provider.testConnection === 'function') {
    await provider.testConnection()
    return
  }

  throw new Error('Vault provider does not support health checks')
}

async function checkAuthReady () {
  if (!oidcConfig.isAuthConfigured()) {
    return
  }

  if (oidcConfig.getAuthMode() === 'embedded') {
    await authJwks.getActiveSigningMaterial()
  }
}

function buildReadinessFailure (code, message) {
  return new ReadinessNotReadyError(code, message, null)
}

function classifyDatabaseReadinessFailure (error) {
  if (isSqliteBusyError(error)) {
    return CODES.CONTROLLER_DB_BUSY
  }
  if (error instanceof TransactionTimeoutError) {
    return CODES.CONTROLLER_DB_UNAVAILABLE
  }
  return CODES.CONTROLLER_DB_UNAVAILABLE
}

async function assertReadiness () {
  try {
    await checkDatabaseReady()
  } catch (error) {
    throw buildReadinessFailure(
      classifyDatabaseReadinessFailure(error),
      'Database is not ready'
    )
  }

  try {
    await checkVaultReady()
  } catch (error) {
    throw buildReadinessFailure(CODES.CONTROLLER_VAULT_UNAVAILABLE, 'Vault is not ready')
  }

  try {
    await checkAuthReady()
  } catch (error) {
    throw buildReadinessFailure(CODES.CONTROLLER_NOT_READY, 'Authentication subsystem is not ready')
  }
}

module.exports = {
  assertReadiness,
  checkAuthReady,
  checkDatabaseReady,
  checkVaultReady
}

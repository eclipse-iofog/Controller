const databaseProvider = require('../data/providers/database-factory')
const vaultManager = require('../vault/vault-manager')
const oidcConfig = require('../config/oidc')
const authJwks = require('../config/auth-jwks')
const transactionRunner = require('../helpers/transaction-runner')
const { isSqliteBusyError } = require('../helpers/db-busy-retry')
const CODES = require('../helpers/agent-auth-error-codes')
const { ReadinessNotReadyError } = require('../helpers/errors')

async function checkDatabaseReady () {
  await transactionRunner.runInTransaction(async (transaction) => {
    await databaseProvider.sequelize.query('SELECT 1', { transaction })
  }, { label: 'readiness.database' })
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

async function assertReadiness () {
  try {
    await checkDatabaseReady()
  } catch (error) {
    const code = isSqliteBusyError(error)
      ? CODES.CONTROLLER_DB_BUSY
      : CODES.CONTROLLER_DB_UNAVAILABLE
    throw buildReadinessFailure(code, 'Database is not ready')
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

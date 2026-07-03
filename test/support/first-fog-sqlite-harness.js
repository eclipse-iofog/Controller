'use strict'

const fs = require('fs')
const path = require('path')
const express = require('express')

const BOOTSTRAP_PASSWORD = 'ChangeMeSecure123!'

const ENV_KEYS = [
  'DB_PROVIDER',
  'DB_NAME',
  'AUTH_MODE',
  'CONTROLLER_PUBLIC_URL',
  'AUTH_INSECURE_ALLOW_HTTP',
  'OIDC_BOOTSTRAP_ADMIN_USERNAME',
  'OIDC_BOOTSTRAP_ADMIN_PASSWORD',
  'CONTROL_PLANE',
  'NODE_ENV'
]

function snapshotEnv (keys) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]))
}

function restoreEnv (snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = snapshot[key]
    }
  }
}

function applyEnv (values) {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value
  }
}

function sqliteStoragePath (dbName) {
  return path.resolve(__dirname, '../../src/data/sqlite_files', dbName)
}

function cleanupSqliteFiles (dbName) {
  const base = sqliteStoragePath(dbName)
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(base + suffix)
    } catch (_) { /* ignore */ }
  }
}

function installBusyRetryCounter (onRetry) {
  const dbMetrics = require('../../src/helpers/db-metrics')
  const original = dbMetrics.recordBusyRetry
  dbMetrics.recordBusyRetry = (...args) => {
    onRetry()
    return original(...args)
  }
  return () => {
    dbMetrics.recordBusyRetry = original
  }
}

async function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function driveReconcileUntilReady (fogUuid, {
  timeoutMs = 10000,
  drainOnce,
  processNextFogTask,
  processNextNatsTask = async () => {},
  getStatus
}) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    await drainOnce()
    await processNextFogTask()
    await processNextNatsTask()

    const status = await getStatus(fogUuid)
    if (status && status.phase === 'Ready') {
      return status
    }

    await sleep(50)
  }

  const lastStatus = await getStatus(fogUuid)
  throw new Error(
    `Timed out waiting for Ready (last phase: ${lastStatus && lastStatus.phase}, ` +
    `lastError: ${lastStatus && lastStatus.lastError})`
  )
}

async function createFirstFogSqliteHarness () {
  const envSnapshot = snapshotEnv(ENV_KEYS)
  const dbName = `first-fog-int-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`

  applyEnv({
    DB_PROVIDER: 'sqlite',
    DB_NAME: dbName,
    AUTH_MODE: 'embedded',
    CONTROLLER_PUBLIC_URL: 'http://controller.test',
    AUTH_INSECURE_ALLOW_HTTP: 'true',
    OIDC_BOOTSTRAP_ADMIN_USERNAME: 'admin',
    OIDC_BOOTSTRAP_ADMIN_PASSWORD: BOOTSTRAP_PASSWORD,
    NODE_ENV: 'test'
  })
  delete process.env.CONTROL_PLANE

  const { _resetQueueForTests } = require('../../src/helpers/transaction-runner')
  _resetQueueForTests()

  const { initialize } = require('../../src/init')
  await initialize()

  const { runBootstrap } = require('../../src/services/auth-bootstrap-service')
  await runBootstrap()

  const db = require('../../src/data/models')
  const { initEmbeddedIssuer, resetEmbeddedIssuerForTests } = require('../../src/config/embedded-oidc')
  const { resetSigningMaterialCacheForTests } = require('../../src/config/auth-jwks')
  await initEmbeddedIssuer(express(), { db })

  return {
    bootstrapPassword: BOOTSTRAP_PASSWORD,
    dbName,
    async teardown () {
      await db.sequelize.close()
      _resetQueueForTests()
      resetEmbeddedIssuerForTests()
      resetSigningMaterialCacheForTests()
      cleanupSqliteFiles(dbName)
      restoreEnv(envSnapshot)
    }
  }
}

module.exports = {
  BOOTSTRAP_PASSWORD,
  createFirstFogSqliteHarness,
  driveReconcileUntilReady,
  installBusyRetryCounter
}

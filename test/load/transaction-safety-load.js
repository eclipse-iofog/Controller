#!/usr/bin/env node
'use strict'

/**
 * Plan 19 transaction-safety load probe (sqlite profile).
 *
 * Simulates 200 fogs polling config/changes + status, 10 operator API clients,
 * background reconcile outbox drainer + task claims, optional WS-style session churn.
 *
 * Usage:
 *   nvm use 24
 *   node test/load/transaction-safety-load.js
 *   node test/load/transaction-safety-load.js --fogs 200 --soak-minutes 30 --operators 10 --poll-interval-ms 40000
 *
 * Exit 0 when SLO gates pass; exit 1 otherwise.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')

function parseArg (name, fallback) {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.split('=')[1]
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

const FOG_COUNT = parseInt(parseArg('fogs', '200'), 10)
const SOAK_MINUTES = parseFloat(parseArg('soak-minutes', '30'))
const OPERATOR_COUNT = parseInt(parseArg('operators', '10'), 10)
const POLL_INTERVAL_MS = parseInt(parseArg('poll-interval-ms', '40000'), 10)
const BUSY_THRESHOLD = parseInt(parseArg('busy-threshold', '0'), 10)
const INVALIDATED_THRESHOLD = parseInt(parseArg('invalidated-threshold', '0'), 10)

const AGENT_P99_SLO_MS = 200
const OPERATOR_P99_SLO_MS = 1000

const agentLatencies = []
const operatorLatencies = []
const counters = {
  busyRetries: 0,
  connectionInvalidated: 0
}

let stopping = false
let dbPath
let sequelize
let originalSequelize
let originalNodeEnv

function percentile (sorted, p) {
  if (!sorted.length) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function recordLatency (bucket, ms) {
  bucket.push(ms)
}

function installMetricCounters () {
  const dbMetrics = require('../../src/helpers/db-metrics')
  const originalBusy = dbMetrics.recordBusyRetry
  const originalInvalidated = dbMetrics.recordConnectionInvalidated

  dbMetrics.recordBusyRetry = (...args) => {
    counters.busyRetries += 1
    return originalBusy(...args)
  }
  dbMetrics.recordConnectionInvalidated = (...args) => {
    counters.connectionInvalidated += 1
    return originalInvalidated(...args)
  }
}

async function setupDatabase () {
  originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'load'
  delete process.env.DB_PROVIDER

  dbPath = path.join(os.tmpdir(), `controller-tx-load-${Date.now()}-${Math.random()}.sqlite`)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
    pool: { max: 1, min: 0, idle: 10000 }
  })

  const { registerSqlitePragmas, applySqlitePragmas } = require('../../src/helpers/sqlite-pragmas')
  registerSqlitePragmas(sequelize, {
    journalMode: 'WAL',
    busyTimeoutMs: 10000,
    synchronous: 'NORMAL'
  })
  await sequelize.authenticate()
  await applySqlitePragmas(sequelize, {
    journalMode: 'WAL',
    busyTimeoutMs: 10000,
    synchronous: 'NORMAL'
  })

  const defineFog = require('../../src/data/models/fog')
  const defineChangeTracking = require('../../src/data/models/changetracking')
  const defineReconcileOutbox = require('../../src/data/models/reconcileOutbox')
  const defineFogPlatformReconcileTask = require('../../src/data/models/fogPlatformReconcileTask')

  const Fog = defineFog(sequelize, Sequelize.DataTypes)
  const ChangeTracking = defineChangeTracking(sequelize, Sequelize.DataTypes)
  const ReconcileOutbox = defineReconcileOutbox(sequelize, Sequelize.DataTypes)
  const FogPlatformReconcileTask = defineFogPlatformReconcileTask(sequelize, Sequelize.DataTypes)

  await Fog.sync()
  const modelBag = { Fog, ChangeTracking, ReconcileOutbox, FogPlatformReconcileTask }
  if (typeof ChangeTracking.associate === 'function') {
    ChangeTracking.associate(modelBag)
  }
  await ChangeTracking.sync()
  await ReconcileOutbox.sync()
  await FogPlatformReconcileTask.sync()
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS ws_session_sim (
      session_id TEXT PRIMARY KEY,
      fog_uuid TEXT NOT NULL,
      opened_at INTEGER NOT NULL
    )
  `)

  const models = require('../../src/data/models')
  models.Fog = Fog
  models.ChangeTracking = ChangeTracking
  models.ReconcileOutbox = ReconcileOutbox
  models.FogPlatformReconcileTask = FogPlatformReconcileTask
  models.sequelize = sequelize

  const databaseProvider = require('../../src/data/providers/database-factory')
  originalSequelize = databaseProvider.sequelize
  databaseProvider.sequelize = sequelize

  installMetricCounters()

  return { Fog, ChangeTracking }
}

async function seedFogs (Fog, ChangeTracking) {
  const rows = Array.from({ length: FOG_COUNT }, (_, index) => ({
    uuid: `load-fog-${String(index).padStart(4, '0')}`,
    name: `Load Fog ${index}`,
    daemonStatus: 'RUNNING',
    memoryUsage: 10,
    cpuUsage: 5
  }))

  await Fog.bulkCreate(rows)
  await ChangeTracking.bulkCreate(rows.map((row) => ({ iofogUuid: row.uuid })))
  return rows.map((row) => row.uuid)
}

async function agentConfigChanges (ChangeTrackingManager, fogUuid, runInTransaction, PRIORITY_INTERACTIVE) {
  const start = Date.now()
  await runInTransaction(async (transaction) => {
    await ChangeTrackingManager.findAll({ iofogUuid: fogUuid }, transaction)
  }, { priority: PRIORITY_INTERACTIVE, label: 'agent.configChanges' })
  recordLatency(agentLatencies, Date.now() - start)
}

async function agentStatusPut (FogManager, fogUuid, runInTransaction, PRIORITY_INTERACTIVE) {
  const start = Date.now()
  await runInTransaction(async (transaction) => {
    await FogManager.update({ uuid: fogUuid }, {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      lastStatusTime: Date.now()
    }, transaction)
  }, { priority: PRIORITY_INTERACTIVE, label: 'agent.status' })
  recordLatency(agentLatencies, Date.now() - start)
}

async function operatorRead (FogManager, runInTransaction, PRIORITY_INTERACTIVE) {
  const start = Date.now()
  await runInTransaction(async (transaction) => {
    await FogManager.findAll({}, transaction)
  }, { priority: PRIORITY_INTERACTIVE, label: 'operator.listFogs' })
  recordLatency(operatorLatencies, Date.now() - start)
}

async function operatorMutate (ReconcileOutboxManager, fogUuid, generation, runInTransaction, PRIORITY_INTERACTIVE) {
  const start = Date.now()
  await runInTransaction(async (transaction) => {
    await ReconcileOutboxManager.enqueueFogPlatform({
      fogUuid,
      reason: 'spec-changed',
      specGeneration: generation
    }, transaction)
  }, { priority: PRIORITY_INTERACTIVE, label: 'operator.enqueueReconcile' })
  recordLatency(operatorLatencies, Date.now() - start)
}

async function wsSessionChurn (fogUuid, runInTransaction, PRIORITY_INTERACTIVE) {
  const sessionId = `${fogUuid}-${Date.now()}-${Math.random()}`
  await runInTransaction(async (transaction) => {
    await sequelize.query(
      'INSERT INTO ws_session_sim (session_id, fog_uuid, opened_at) VALUES (:sessionId, :fogUuid, :openedAt)',
      {
        replacements: { sessionId, fogUuid, openedAt: Date.now() },
        transaction
      }
    )
    await sequelize.query(
      'DELETE FROM ws_session_sim WHERE session_id = :sessionId',
      { replacements: { sessionId }, transaction }
    )
  }, { priority: PRIORITY_INTERACTIVE, label: 'ws.sessionChurn' })
}

function startAgentSimulators (fogUuids, deps) {
  const timers = []

  fogUuids.forEach((fogUuid, index) => {
    const staggerMs = Math.floor((index / fogUuids.length) * POLL_INTERVAL_MS)
    const tick = async () => {
      if (stopping) return
      try {
        await agentConfigChanges(deps.ChangeTrackingManager, fogUuid, deps.runInTransaction, deps.PRIORITY_INTERACTIVE)
        await agentStatusPut(deps.FogManager, fogUuid, deps.runInTransaction, deps.PRIORITY_INTERACTIVE)
        if (Math.random() < 0.02) {
          await wsSessionChurn(fogUuid, deps.runInTransaction, deps.PRIORITY_INTERACTIVE)
        }
      } catch (error) {
        console.error(`Agent simulator error (${fogUuid}):`, error.message)
      }
      if (!stopping) {
        timers.push(setTimeout(tick, POLL_INTERVAL_MS))
      }
    }
    timers.push(setTimeout(tick, staggerMs))
  })

  return () => timers.forEach(clearTimeout)
}

function startOperatorSimulators (fogUuids, deps) {
  const timers = []
  let generation = 1

  for (let operator = 0; operator < OPERATOR_COUNT; operator++) {
    const tick = async () => {
      if (stopping) return
      try {
        if (Math.random() < 0.12) {
          const fogUuid = fogUuids[Math.floor(Math.random() * fogUuids.length)]
          generation += 1
          await operatorMutate(deps.ReconcileOutboxManager, fogUuid, generation, deps.runInTransaction, deps.PRIORITY_INTERACTIVE)
        } else {
          await operatorRead(deps.FogManager, deps.runInTransaction, deps.PRIORITY_INTERACTIVE)
        }
      } catch (error) {
        console.error(`Operator simulator error (${operator}):`, error.message)
      }
      if (!stopping) {
        timers.push(setTimeout(tick, 250 + Math.floor(Math.random() * 500)))
      }
    }
    timers.push(setTimeout(tick, operator * 100))
  }

  return () => timers.forEach(clearTimeout)
}

function startBackgroundWorkers (deps) {
  const { drainOnce } = require('../../src/jobs/reconcile-outbox-drainer-job')
  const drainerTimer = setInterval(async () => {
    if (stopping) return
    try {
      await drainOnce()
    } catch (error) {
      console.error('Outbox drainer error:', error.message)
    }
  }, 3000)

  const claimTimer = setInterval(async () => {
    if (stopping) return
    try {
      await deps.runInTransaction(async () => {
        await deps.FogPlatformReconcileTaskManager.claimNextFogTask('tx-load-worker', 300)
      }, { priority: deps.PRIORITY_BACKGROUND, label: 'reconcile.claim' })
    } catch (error) {
      console.error('Reconcile claim error:', error.message)
    }
  }, 5000)

  return () => {
    clearInterval(drainerTimer)
    clearInterval(claimTimer)
  }
}

function reportResults () {
  agentLatencies.sort((a, b) => a - b)
  operatorLatencies.sort((a, b) => a - b)

  const agentP50 = percentile(agentLatencies, 50)
  const agentP95 = percentile(agentLatencies, 95)
  const agentP99 = percentile(agentLatencies, 99)
  const operatorP50 = percentile(operatorLatencies, 50)
  const operatorP95 = percentile(operatorLatencies, 95)
  const operatorP99 = percentile(operatorLatencies, 99)

  const sloPass = agentLatencies.length > 0 &&
    operatorLatencies.length > 0 &&
    agentP99 < AGENT_P99_SLO_MS &&
    operatorP99 < OPERATOR_P99_SLO_MS &&
    counters.busyRetries <= BUSY_THRESHOLD &&
    counters.connectionInvalidated <= INVALIDATED_THRESHOLD

  console.log('')
  console.log('Transaction safety load probe — results')
  console.log(`  fogs:              ${FOG_COUNT}`)
  console.log(`  operators:         ${OPERATOR_COUNT}`)
  console.log(`  soak minutes:      ${SOAK_MINUTES}`)
  console.log(`  poll interval ms:  ${POLL_INTERVAL_MS}`)
  console.log('')
  console.log('Agent latencies (config/changes + status):')
  console.log(`  samples:  ${agentLatencies.length}`)
  console.log(`  p50:      ${agentP50} ms`)
  console.log(`  p95:      ${agentP95} ms`)
  console.log(`  p99:      ${agentP99} ms  (SLO < ${AGENT_P99_SLO_MS} ms)`)
  console.log('')
  console.log('Operator latencies (read-heavy + mutations):')
  console.log(`  samples:  ${operatorLatencies.length}`)
  console.log(`  p50:      ${operatorP50} ms`)
  console.log(`  p95:      ${operatorP95} ms`)
  console.log(`  p99:      ${operatorP99} ms  (SLO < ${OPERATOR_P99_SLO_MS} ms)`)
  console.log('')
  console.log('Contention counters:')
  console.log(`  busy retries:           ${counters.busyRetries}  (threshold <= ${BUSY_THRESHOLD})`)
  console.log(`  connection invalidated: ${counters.connectionInvalidated}  (threshold <= ${INVALIDATED_THRESHOLD})`)
  console.log('')
  console.log(`  status: ${sloPass ? 'PASS' : 'FAIL'}`)

  return sloPass
}

async function cleanup () {
  const databaseProvider = require('../../src/data/providers/database-factory')
  if (originalSequelize) {
    databaseProvider.sequelize = originalSequelize
  }
  if (sequelize) {
    await sequelize.close()
  }
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + suffix)
    } catch (_) { /* ignore */ }
  }
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
}

async function main () {
  const startedAt = Date.now()
  const soakMs = SOAK_MINUTES * 60 * 1000

  console.log('Transaction safety load probe — starting')
  console.log(`  profile: sqlite, ${FOG_COUNT} fogs, ${OPERATOR_COUNT} operators, ${SOAK_MINUTES} min soak`)

  const { Fog, ChangeTracking } = await setupDatabase()
  const fogUuids = await seedFogs(Fog, ChangeTracking)

  const {
    runInTransaction,
    PRIORITY_BACKGROUND,
    PRIORITY_INTERACTIVE,
    _resetQueueForTests
  } = require('../../src/helpers/transaction-runner')

  const deps = {
    FogManager: require('../../src/data/managers/iofog-manager'),
    ChangeTrackingManager: require('../../src/data/managers/change-tracking-manager'),
    ReconcileOutboxManager: require('../../src/data/managers/reconcile-outbox-manager'),
    FogPlatformReconcileTaskManager: require('../../src/data/managers/fog-platform-reconcile-task-manager'),
    runInTransaction,
    PRIORITY_BACKGROUND,
    PRIORITY_INTERACTIVE
  }

  const stopAgents = startAgentSimulators(fogUuids, deps)
  const stopOperators = startOperatorSimulators(fogUuids, deps)
  const stopBackground = startBackgroundWorkers(deps)

  await new Promise((resolve) => setTimeout(resolve, soakMs))

  stopping = true
  stopAgents()
  stopOperators()
  stopBackground()
  _resetQueueForTests()

  const pass = reportResults()
  console.log(`  runtime: ${((Date.now() - startedAt) / 1000).toFixed(1)} s`)

  await cleanup()
  process.exit(pass ? 0 : 1)
}

main().catch(async (error) => {
  console.error(error)
  try {
    await cleanup()
  } catch (_) { /* ignore */ }
  process.exit(1)
})

const config = require('../config')
const logger = require('../logger')
const ReconcileOutboxManager = require('../data/managers/reconcile-outbox-manager')
const FogPlatformReconcileTaskManager = require('../data/managers/fog-platform-reconcile-task-manager')
const ServicePlatformReconcileTaskManager = require('../data/managers/service-platform-reconcile-task-manager')
const NatsService = require('../services/nats-service')
const AgentPropagationService = require('../services/agent-propagation-service')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

const DEFAULT_BATCH_SIZE = 32

async function run () {
  try {
    await drainOnce()
  } catch (error) {
    logger.error('Reconcile outbox drainer error:', error)
  } finally {
    const intervalSeconds = config.get('settings.reconcileOutboxDrainerIntervalSeconds', 1)
    setTimeout(run, intervalSeconds * 1000)
  }
}

async function drainRow (row, transaction) {
  const payload = ReconcileOutboxManager.parsePayload(row)
  if (!payload) {
    throw new Error(`Outbox row ${row.id} has empty payload`)
  }

  switch (row.kind) {
    case 'nats':
      await NatsService.enqueueReconcileTask(payload, transaction)
      return { markProcessed: true }
    case 'fog_platform':
      await FogPlatformReconcileTaskManager.enqueueFogPlatformReconcileTask(payload, transaction)
      return { markProcessed: true }
    case 'service_platform':
      await ServicePlatformReconcileTaskManager.enqueueServicePlatformReconcileTask(payload, transaction)
      return { markProcessed: true }
    case 'agent_propagation': {
      const result = await AgentPropagationService.propagateAgentChangeTracking(payload, transaction)
      if (!result.complete) {
        return {
          markProcessed: false,
          nextPayload: result.nextPayload
        }
      }
      return { markProcessed: true }
    }
    default:
      throw new Error(`Unknown reconcile outbox kind: ${row.kind}`)
  }
}

async function drainOnce () {
  const batchSize = config.get('settings.reconcileOutboxDrainerBatchSize', DEFAULT_BATCH_SIZE)

  return runInTransaction(async (transaction) => {
    const rows = await ReconcileOutboxManager.claimUnprocessed(batchSize, transaction)
    if (!rows.length) {
      return { processed: 0, failed: 0 }
    }

    let processed = 0
    let failed = 0

    for (const row of rows) {
      try {
        const drainResult = await drainRow(row, transaction)
        if (drainResult.nextPayload) {
          await ReconcileOutboxManager.update(
            { id: row.id },
            { payload: JSON.stringify(drainResult.nextPayload) },
            transaction
          )
        }
        if (drainResult.markProcessed) {
          await ReconcileOutboxManager.markProcessed(row.id, transaction)
          processed += 1
        }
      } catch (error) {
        failed += 1
        logger.error(`Reconcile outbox drain failed for row ${row.id}: ${error.message}`)
        await ReconcileOutboxManager.markFailed(row.id, error.message, transaction)
      }
    }

    if (processed > 0 || failed > 0) {
      logger.debug('Reconcile outbox drainer batch complete', { processed, failed })
    }

    return { processed, failed }
  }, { priority: PRIORITY_BACKGROUND, label: 'reconcileOutboxDrainer' })
}

module.exports = {
  run,
  drainOnce
}

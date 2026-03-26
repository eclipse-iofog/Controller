/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const ClusterControllerService = require('../services/cluster-controller-service')
const NatsService = require('../services/nats-service')
const NatsReconcileTaskManager = require('../data/managers/nats-reconcile-task-manager')
const databaseProvider = require('../data/providers/database-factory')
const Config = require('../config')
const logger = require('../logger')

const scheduleTime = (Config.get('settings.natsReconcileWorkerIntervalSeconds', 3)) * 1000

async function run () {
  try {
    await processNextTask()
  } catch (error) {
    logger.error('NATS reconcile worker error:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function processNextTask () {
  const uuid = ClusterControllerService.getCurrentControllerUuid()
  if (!uuid) {
    return
  }
  const task = await NatsService.claimNextTask(uuid)
  if (!task) {
    return
  }
  const fogUuids = task.fogUuids
    ? task.fogUuids.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined
  const options = {
    reason: task.reason,
    applicationId: task.applicationId,
    accountRuleId: task.accountRuleId,
    userRuleId: task.userRuleId,
    fogUuids: fogUuids && fogUuids.length > 0 ? fogUuids : undefined
  }
  try {
    logger.info(`NATS reconcile task ${task.id} started`)
    await NatsService.reconcileResolverArtifacts(options)
    logger.info(`NATS reconcile task ${task.id} completed`)
    await databaseProvider.sequelize.transaction(async (transaction) => {
      await NatsReconcileTaskManager.getEntity().destroy({
        where: { id: task.id },
        transaction
      })
    })
  } catch (error) {
    logger.error(`NATS reconcile task ${task.id} failed: ${error.message}. Task will be reclaimed after staleness.`)
  }
}

module.exports = {
  run
}

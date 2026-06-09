/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
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
const Config = require('../config')
const logger = require('../logger')

const scheduleTime = (Config.get('settings.controllerHeartbeatInterval', 30)) * 1000

async function run () {
  try {
    await updateControllerHeartbeat()
  } catch (error) {
    logger.error('Error during controller heartbeat update:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function updateControllerHeartbeat () {
  try {
    const uuid = ClusterControllerService.getCurrentControllerUuid()
    if (!uuid) {
      logger.debug('Controller UUID not initialized yet, skipping heartbeat')
      return
    }

    const fakeTransaction = { fakeTransaction: true }
    await ClusterControllerService.updateHeartbeat(uuid, fakeTransaction)
    logger.debug(`Updated heartbeat for controller: ${uuid}`)
  } catch (error) {
    logger.error(`Failed to update controller heartbeat: ${error.message}`)
    throw error
  }
}

module.exports = {
  run
}

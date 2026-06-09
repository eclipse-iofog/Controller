/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const EventManager = require('../data/managers/event-manager')
const EventService = require('../services/event-service')
const Config = require('../config')
const logger = require('../logger')

async function run () {
  try {
    await cleanupOldEvents()
  } catch (error) {
    logger.error('Error during event cleanup:', error)
  } finally {
    // Schedule next run with current interval (may have changed via env var)
    const currentInterval = process.env.EVENT_CLEANUP_INTERVAL || Config.get('settings.eventCleanupInterval', 86400)
    setTimeout(run, currentInterval * 1000)
  }
}

async function cleanupOldEvents () {
  try {
    // Read retention days from config
    const retentionDays = process.env.EVENT_RETENTION_DAYS || Config.get('settings.eventRetentionDays', 7)

    logger.debug(`Starting cleanup of events older than ${retentionDays} days`)
    const count = await EventManager.deleteEventsOlderThanDays(retentionDays, { fakeTransaction: true })
    logger.info(`Cleaned up ${count} events older than ${retentionDays} days`)

    // Create audit trail for automated cleanup (non-blocking)
    // This allows admins to distinguish between manual deletions and automated cleanup
    if (count > 0) {
      setImmediate(async () => {
        try {
          await EventService.createEvent({
            timestamp: Date.now(),
            eventType: 'HTTP',
            endpointType: 'user',
            actorId: 'SYSTEM_CLEANUP',
            method: 'DELETE',
            resourceType: 'event',
            resourceId: null,
            endpointPath: '/api/v3/events',
            ipAddress: null,
            status: 'SUCCESS',
            statusCode: 200,
            statusMessage: `Automated cleanup: Deleted ${count} events older than ${retentionDays} days`,
            requestId: null
          }, { fakeTransaction: true }).catch(err => {
            logger.error('Failed to create cleanup job audit record (non-blocking):', err)
          })
        } catch (error) {
          logger.error('Error creating cleanup job audit record (non-blocking):', error)
        }
      })
    }
  } catch (error) {
    logger.error('Error during event cleanup:', error)
  }
}

module.exports = {
  run
}

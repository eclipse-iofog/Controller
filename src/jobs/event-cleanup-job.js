const EventManager = require('../data/managers/event-manager')
const EventService = require('../services/event-service')
const Config = require('../config')
const logger = require('../logger')
const { runInTransaction, PRIORITY_BACKGROUND } = require('../helpers/transaction-runner')

async function run () {
  try {
    await cleanupOldEvents()
  } catch (error) {
    logger.error('Error during event cleanup:', error)
  } finally {
    const currentInterval = process.env.EVENT_CLEANUP_INTERVAL || Config.get('settings.eventCleanupInterval', 86400)
    setTimeout(run, currentInterval * 1000)
  }
}

async function cleanupOldEvents () {
  try {
    const retentionDays = process.env.EVENT_RETENTION_DAYS || Config.get('settings.eventRetentionDays', 7)

    logger.debug(`Starting cleanup of events older than ${retentionDays} days`)
    const count = await runInTransaction(
      (transaction) => EventManager.deleteEventsOlderThanDays(retentionDays, transaction),
      { priority: PRIORITY_BACKGROUND, label: 'event-cleanup' }
    )
    logger.info(`Cleaned up ${count} events older than ${retentionDays} days`)

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
          }).catch(err => {
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

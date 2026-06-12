const EventService = require('../services/event-service')

/**
 * List events with query filters and pagination
 * @param {object} req - Express request object
 * @returns {Promise<object>} Events list with pagination info
 */
async function listEventsEndpoint (req) {
  return EventService.listEvents({ query: req.query }, { req })
}

/**
 * Delete old events manually
 * @param {object} req - Express request object
 * @returns {Promise<object>} Deletion result
 */
async function deleteOldEventsEndpoint (req) {
  return EventService.deleteEvents({ body: req.body }, { req })
}

module.exports = {
  listEventsEndpoint,
  deleteOldEventsEndpoint
}

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

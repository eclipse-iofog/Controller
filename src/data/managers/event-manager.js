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

const BaseManager = require('./base-manager')
const models = require('../models')
const Event = models.Event
const { Op } = require('sequelize')
const AppHelper = require('../../helpers/app-helper')
const logger = require('../../logger')

class EventManager extends BaseManager {
  getEntity () {
    return Event
  }

  async findAllWithFilters (filters, transaction) {
    AppHelper.checkTransaction(transaction)

    const where = {}

    // Time range filters
    if (filters.startTime || filters.endTime) {
      where.timestamp = {}
      if (filters.startTime) {
        where.timestamp[Op.gte] = filters.startTime
      }
      if (filters.endTime) {
        where.timestamp[Op.lte] = filters.endTime
      }
    }

    // Endpoint type filter
    if (filters.endpointType) {
      where.endpointType = filters.endpointType
    }

    // Resource type filter
    if (filters.resourceType) {
      where.resourceType = filters.resourceType
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status
    }

    // Method filter (can be array for multiple methods)
    if (filters.method) {
      if (Array.isArray(filters.method)) {
        where.method = { [Op.in]: filters.method }
      } else {
        where.method = filters.method
      }
    }

    // Actor ID filter
    if (filters.actorId) {
      where.actorId = filters.actorId
    }

    // Event type filter
    if (filters.eventType) {
      where.eventType = filters.eventType
    }

    // Ensure limit is a valid positive integer
    let limit = 200 // Default
    if (filters.limit !== undefined && filters.limit !== null) {
      const parsedLimit = parseInt(filters.limit)
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 1000)
      }
    }

    // Ensure offset is a valid non-negative integer
    let offset = 0
    if (filters.offset !== undefined && filters.offset !== null) {
      const parsedOffset = parseInt(filters.offset)
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset
      }
    }

    const options = {
      where: where,
      order: [['timestamp', 'DESC']],
      limit: Number(limit), // Ensure it's a number
      offset: Number(offset) // Ensure it's a number
    }

    if (!transaction.fakeTransaction) {
      options.transaction = transaction
    }

    const { count, rows } = await Event.findAndCountAll(options)

    // CRITICAL: Always enforce the limit, even if Sequelize returns more rows
    // Sequelize's findAndCountAll sometimes doesn't respect limit in certain scenarios
    const limitedRows = rows.slice(0, limit)

    if (rows.length > limit) {
      logger.warn(`Sequelize returned ${rows.length} rows but limit was ${limit}. Limiting to ${limit} rows.`)
    }

    logger.debug(`Event query final - returning ${limitedRows.length} events`)

    return {
      events: limitedRows,
      total: count,
      limit: limit,
      offset: offset
    }
  }

  async deleteEventsOlderThanDays (days, transaction) {
    AppHelper.checkTransaction(transaction)

    const options = {
      where: {}
    }

    // Special case: days = 0 means delete ALL events (no timestamp filter)
    // days > 0 means delete events older than that many days
    if (days > 0) {
      const cutoffTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000)
      options.where.timestamp = {
        [Op.lt]: cutoffTimestamp
      }
    }
    // If days = 0, where clause is empty, so all events will be deleted

    if (!transaction.fakeTransaction) {
      options.transaction = transaction
    }

    const deletedCount = await Event.destroy(options)
    return deletedCount
  }
}

const instance = new EventManager()
module.exports = instance

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
const config = require('../config')
const logger = require('../logger')

/**
 * Event audit middleware for HTTP requests
 * Tracks all non-GET API operations (POST, PATCH, DELETE, PUT)
 * CRITICAL: This middleware is fully async and non-blocking.
 * Event logging failures will never affect request processing.
 */
function eventAuditMiddleware (req, res, next) {
  // Only track non-GET methods
  if (req.method === 'GET') {
    return next()
  }

  // Don't audit DELETE on events endpoint (to avoid recursion and noise)
  // The DELETE endpoint controller will explicitly create an event AFTER successful deletion
  if (req.method === 'DELETE' && req.path === '/api/v3/events') {
    return next()
  }

  // Check if auditing is enabled (reads from YAML or env var)
  // Use config.get() which properly parses boolean strings from env vars
  const auditEnabled = config.get('settings.eventAuditEnabled', true)
  if (!auditEnabled) {
    return next()
  }

  // Capture request start time
  const startTime = Date.now()

  // Store original end function
  const originalEnd = res.end

  // Wrap response.end to capture status
  res.end = function (...args) {
    // Call original end first
    originalEnd.apply(this, args)

    // Defer event logging to next tick - NEVER AWAIT
    setImmediate(async () => {
      try {
        // Fire and forget - never await
        EventService.createHttpEvent(req, res, startTime).catch(err => {
          // Silent error handling - never throw
          logger.error('Event logging failed (non-blocking):', err)
        })
      } catch (error) {
        // Catch any synchronous errors
        logger.error('Event logging setup failed (non-blocking):', error)
        // Don't throw - request already completed
      }
    })
  }

  next()
}

module.exports = eventAuditMiddleware

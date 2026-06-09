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
const config = require('../config')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const Validator = require('../schemas')
const TransactionDecorator = require('../decorators/transaction-decorator')

/**
 * Extract resource type from URL path
 * @param {string} path - URL path
 * @returns {string|null} Resource type or null
 */
function extractResourceType (path) {
  if (!path) return null

  // Resource type mapping based on URL patterns
  const resourcePatterns = [
    { pattern: /^\/api\/v3\/iofog/, type: 'agent' },
    { pattern: /^\/api\/v3\/microservices/, type: 'microservice' },
    { pattern: /^\/api\/v3\/applications/, type: 'application' },
    { pattern: /^\/api\/v3\/agent/, type: 'agent' },
    { pattern: /^\/api\/v3\/config/, type: 'config' },
    { pattern: /^\/api\/v3\/secrets/, type: 'secret' },
    { pattern: /^\/api\/v3\/services/, type: 'service' },
    { pattern: /^\/api\/v3\/certificates/, type: 'certificate' },
    { pattern: /^\/api\/v3\/tunnels/, type: 'tunnel' },
    { pattern: /^\/api\/v3\/router/, type: 'router' },
    { pattern: /^\/api\/v3\/nats/, type: 'nats' },
    { pattern: /^\/api\/v3\/registries/, type: 'registry' },
    { pattern: /^\/api\/v3\/volumeMounts/, type: 'volumeMount' },
    { pattern: /^\/api\/v3\/configMaps/, type: 'configMap' },
    { pattern: /^\/api\/v3\/edgeResources/, type: 'edgeResource' },
    { pattern: /^\/api\/v3\/diagnostics/, type: 'diagnostics' },
    { pattern: /^\/api\/v3\/flows/, type: 'application' },
    { pattern: /^\/api\/v3\/applicationTemplates/, type: 'applicationTemplate' },
    { pattern: /^\/api\/v3\/catalog/, type: 'catalog' },
    { pattern: /^\/api\/v3\/controller/, type: 'controller' },
    { pattern: /^\/api\/v3\/cluster/, type: 'cluster' },
    { pattern: /^\/api\/v3\/users/, type: 'user' },
    { pattern: /^\/api\/v3\/capabilities/, type: 'capabilities' },
    { pattern: /^\/api\/v3\/events/, type: 'event' }
  ]

  for (const { pattern, type } of resourcePatterns) {
    if (pattern.test(path)) {
      return type
    }
  }

  return null
}

/**
 * Extract resource ID from URL path, params, or body
 * @param {object} req - Express request object
 * @returns {string|null} Resource ID or null
 */
function extractResourceId (req) {
  if (!req) return null

  // Try path parameters first (most common)
  if (req.params) {
    // Common parameter names
    const paramNames = ['uuid', 'id', 'name', 'key', 'appName', 'microserviceUuid']
    for (const paramName of paramNames) {
      if (req.params[paramName]) {
        return req.params[paramName]
      }
    }
    // Check for versioned resources (name:version)
    if (req.params.name && req.params.version) {
      return `${req.params.name}:${req.params.version}`
    }
  }

  // Try query parameters
  if (req.query) {
    if (req.query.uuid) return req.query.uuid
    if (req.query.id) return req.query.id
    if (req.query.name) return req.query.name
  }

  // Try request body (for POST/PUT/PATCH)
  if (req.body) {
    if (req.body.uuid) return req.body.uuid
    if (req.body.id) return req.body.id
    if (req.body.name) return req.body.name
  }

  return null
}

/**
 * Extract username from Keycloak JWT token
 * @param {string} token - Bearer token string (with or without "Bearer " prefix)
 * @returns {string|null} Username or null
 */
function extractUsernameFromToken (token) {
  if (!token) return null

  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '')
    const tokenParts = cleanToken.split('.')
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      return payload.preferred_username || null
    }
  } catch (error) {
    logger.debug('Failed to extract username from token:', error)
  }

  return null
}

/**
 * Extract IPv4 address from request, converting IPv6-mapped IPv4 addresses
 * @param {object} req - Express request object
 * @returns {string|null} IPv4 address or null
 */
function extractIPv4Address (req) {
  if (!req) return null

  let ipAddress = null

  // Try req.ip first (Express sets this)
  if (req.ip) {
    ipAddress = req.ip
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddress = req.connection.remoteAddress
  } else if (req.socket && req.socket.remoteAddress) {
    ipAddress = req.socket.remoteAddress
  }

  if (!ipAddress) {
    return null
  }

  // Convert IPv6-mapped IPv4 address (::ffff:127.0.0.1) to IPv4 (127.0.0.1)
  if (ipAddress.startsWith('::ffff:')) {
    return ipAddress.substring(7) // Remove '::ffff:' prefix
  }

  // Filter out pure IPv6 addresses (like ::1)
  if (ipAddress.includes(':')) {
    return null
  }

  // Return IPv4 address as-is
  return ipAddress
}

/**
 * Sanitize URL path by removing sensitive query parameters
 * Prevents storing tokens and other sensitive data in audit logs
 * @param {string} urlPath - Full URL path with query string
 * @returns {string} Sanitized path without sensitive query parameters
 */
function sanitizeEndpointPath (urlPath) {
  if (!urlPath) return urlPath

  try {
    // List of sensitive query parameters to remove
    const sensitiveParams = ['token', 'access_token', 'refresh_token', 'api_key', 'apikey', 'password', 'secret']

    // Split URL into path and query string
    const [path, queryString] = urlPath.split('?')

    // If no query string, return path as-is
    if (!queryString) {
      return path
    }

    // Parse query parameters
    const params = new URLSearchParams(queryString)
    const sanitizedParams = new URLSearchParams()

    // Copy only non-sensitive parameters
    for (const [key, value] of params.entries()) {
      if (!sensitiveParams.includes(key.toLowerCase())) {
        sanitizedParams.append(key, value)
      }
    }

    // Reconstruct URL
    const sanitizedQuery = sanitizedParams.toString()
    return sanitizedQuery ? `${path}?${sanitizedQuery}` : path
  } catch (error) {
    // If parsing fails, return path without query string as fallback
    logger.debug('Failed to sanitize endpoint path, removing query string:', error)
    const [path] = urlPath.split('?')
    return path
  }
}

/**
 * Extract actor ID from request (user or agent)
 * @param {object} req - Express request object
 * @returns {string|null} Actor ID (username or fog UUID) or null
 */
function extractActorId (req) {
  if (!req) return null

  // Check if it's an agent endpoint
  if (req.path && req.path.startsWith('/api/v3/agent/')) {
    // Extract fog UUID from JWT token
    try {
      const authHeader = req.headers.authorization
      if (authHeader) {
        const [scheme, token] = authHeader.split(' ')
        if (scheme.toLowerCase() === 'bearer' && token) {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            return payload.sub || null
          }
        }
      }
    } catch (error) {
      logger.debug('Failed to extract fog UUID from token:', error)
    }
    return null
  }

  // Special handling for user authentication endpoints
  if (req.path && req.path.startsWith('/api/v3/user/')) {
    // For login endpoint: extract from req.body.email
    if (req.path === '/api/v3/user/login' && req.body && req.body.email) {
      return req.body.email
    }

    // For refresh endpoint: extract from req.body.refreshToken
    if (req.path === '/api/v3/user/refresh' && req.body && req.body.refreshToken) {
      try {
        const tokenParts = req.body.refreshToken.split('.')
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
          return payload.preferred_username || payload.email || payload.sub || null
        }
      } catch (error) {
        logger.debug('Failed to extract username from refresh token:', error)
      }
    }

    // For logout endpoint: extract from access token in headers or kauth
    if (req.path === '/api/v3/user/logout') {
      // Try Keycloak middleware first
      try {
        if (req.kauth && req.kauth.grant && req.kauth.grant.access_token &&
            req.kauth.grant.access_token.content && req.kauth.grant.access_token.content.preferred_username) {
          return req.kauth.grant.access_token.content.preferred_username
        }
      } catch (error) {
        logger.debug('Failed to extract username from Keycloak middleware:', error)
      }

      // Fallback: extract from Authorization header
      try {
        const authHeader = req.headers.authorization
        if (authHeader) {
          const username = extractUsernameFromToken(authHeader)
          if (username) {
            return username
          }
        }
      } catch (error) {
        logger.debug('Failed to extract username from access token:', error)
      }
    }
  }

  // User endpoint - try Keycloak middleware first (for HTTP requests)
  try {
    if (req.kauth && req.kauth.grant && req.kauth.grant.access_token &&
        req.kauth.grant.access_token.content && req.kauth.grant.access_token.content.preferred_username) {
      return req.kauth.grant.access_token.content.preferred_username
    }
  } catch (error) {
    logger.debug('Failed to extract username from Keycloak middleware:', error)
  }

  // Fallback: extract from token directly (for WebSocket connections or other endpoints)
  try {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const username = extractUsernameFromToken(authHeader)
      if (username) {
        return username
      }
    }
  } catch (error) {
    logger.debug('Failed to extract username from token:', error)
  }

  return null
}

/**
 * Determine status from HTTP status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} 'SUCCESS' or 'FAILED'
 */
function determineStatus (statusCode) {
  if (!statusCode) return 'FAILED'
  return (statusCode >= 200 && statusCode < 300) ? 'SUCCESS' : 'FAILED'
}

/**
 * Determine status from WebSocket close code
 * @param {number} closeCode - WebSocket close code
 * @returns {string} 'SUCCESS' or 'FAILED'
 */
function determineWsStatus (closeCode) {
  // Normal closure (1000) and going away (1001) are considered success
  // Other codes indicate errors
  if (closeCode === 1000 || closeCode === 1001) {
    return 'SUCCESS'
  }
  return 'FAILED'
}

/**
 * Create an event record
 * @param {object} eventData - Event data object
 * @param {object} transaction - Database transaction
 * @returns {Promise<object>} Created event
 */
async function createEvent (eventData, transaction) {
  const eventRecord = {
    timestamp: eventData.timestamp || Date.now(),
    eventType: eventData.eventType,
    endpointType: eventData.endpointType,
    actorId: eventData.actorId || null,
    method: eventData.method || null,
    resourceType: eventData.resourceType || null,
    resourceId: eventData.resourceId || null,
    endpointPath: eventData.endpointPath,
    ipAddress: eventData.ipAddress || null,
    status: eventData.status,
    statusCode: eventData.statusCode || null,
    statusMessage: eventData.statusMessage || null,
    requestId: eventData.requestId || null
  }

  return EventManager.create(eventRecord, transaction)
}

/**
 * Create event from HTTP request/response
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} startTime - Request start timestamp
 * @returns {Promise<void>}
 */
async function createHttpEvent (req, res, startTime) {
  // Check if auditing is enabled
  // Use config.get() which properly parses boolean strings from env vars
  const auditEnabled = config.get('settings.eventAuditEnabled', true)
  if (!auditEnabled) {
    return
  }

  // Only track non-GET methods
  if (req.method === 'GET') {
    return
  }

  // Don't audit DELETE on events endpoint (handled explicitly in controller)
  if (req.method === 'DELETE' && req.path === '/api/v3/events') {
    return
  }

  const captureIp = config.get('settings.eventCaptureIpAddress', true)
  const endpointType = req.path.startsWith('/api/v3/agent/') ? 'agent' : 'user'
  const actorId = extractActorId(req)
  const resourceType = extractResourceType(req.path)
  const resourceId = extractResourceId(req)
  const status = determineStatus(res.statusCode)

  const eventData = {
    timestamp: startTime,
    eventType: 'HTTP',
    endpointType: endpointType,
    actorId: actorId,
    method: req.method,
    resourceType: resourceType,
    resourceId: resourceId,
    endpointPath: req.path,
    ipAddress: captureIp ? extractIPv4Address(req) : null,
    status: status,
    statusCode: res.statusCode,
    statusMessage: status === 'SUCCESS' ? 'Success' : `HTTP ${res.statusCode}`,
    requestId: req.id || null
  }

  // Use fake transaction for non-blocking event creation
  await createEvent(eventData, { fakeTransaction: true }).catch(err => {
    logger.error('Event logging failed (non-blocking):', err)
  })
}

/**
 * Create WebSocket connection event
 * @param {object} connectionData - Connection data
 * @returns {Promise<void>}
 */
async function createWsConnectEvent (connectionData) {
  // Check if auditing is enabled
  // Use config.get() which properly parses boolean strings from env vars
  const auditEnabled = config.get('settings.eventAuditEnabled', true)
  if (!auditEnabled) {
    return
  }

  const captureIp = config.get('settings.eventCaptureIpAddress', true)
  const endpointType = connectionData.endpointType || 'user'
  // Sanitize path to remove sensitive query parameters (e.g., token)
  const sanitizedPath = sanitizeEndpointPath(connectionData.path)
  const resourceType = extractResourceType(sanitizedPath)

  const eventData = {
    timestamp: connectionData.timestamp || Date.now(),
    eventType: 'WS_CONNECT',
    endpointType: endpointType,
    actorId: connectionData.actorId || null,
    method: 'WS',
    resourceType: resourceType,
    resourceId: connectionData.resourceId || null,
    endpointPath: sanitizedPath,
    ipAddress: captureIp ? (connectionData.ipAddress || null) : null,
    status: 'SUCCESS',
    statusCode: null,
    statusMessage: 'WebSocket connection established',
    requestId: null
  }

  // Use fake transaction for non-blocking event creation
  await createEvent(eventData, { fakeTransaction: true }).catch(err => {
    logger.error('WebSocket connect event logging failed (non-blocking):', err)
  })
}

/**
 * Create WebSocket disconnection event
 * @param {object} connectionData - Connection data
 * @returns {Promise<void>}
 */
async function createWsDisconnectEvent (connectionData) {
  // Check if auditing is enabled
  // Use config.get() which properly parses boolean strings from env vars
  const auditEnabled = config.get('settings.eventAuditEnabled', true)
  if (!auditEnabled) {
    return
  }

  const captureIp = config.get('settings.eventCaptureIpAddress', true)
  const endpointType = connectionData.endpointType || 'user'
  // Sanitize path to remove sensitive query parameters (e.g., token)
  const sanitizedPath = sanitizeEndpointPath(connectionData.path)
  const resourceType = extractResourceType(sanitizedPath)
  const status = determineWsStatus(connectionData.closeCode)

  const eventData = {
    timestamp: connectionData.timestamp || Date.now(),
    eventType: 'WS_DISCONNECT',
    endpointType: endpointType,
    actorId: connectionData.actorId || null,
    method: 'WS',
    resourceType: resourceType,
    resourceId: connectionData.resourceId || null,
    endpointPath: sanitizedPath,
    ipAddress: captureIp ? (connectionData.ipAddress || null) : null,
    status: status,
    statusCode: connectionData.closeCode || null,
    statusMessage: status === 'SUCCESS' ? 'WebSocket connection closed normally' : `WebSocket closed with code ${connectionData.closeCode}`,
    requestId: null
  }

  // Use fake transaction for non-blocking event creation
  await createEvent(eventData, { fakeTransaction: true }).catch(err => {
    logger.error('WebSocket disconnect event logging failed (non-blocking):', err)
  })
}

/**
 * Parse time from query parameter (Unix timestamp or ISO 8601)
 * @param {string|number} timeValue - Time value
 * @returns {number|null} Unix timestamp in milliseconds or null
 */
function parseTime (timeValue) {
  if (timeValue === undefined || timeValue === null || timeValue === '') return null

  if (typeof timeValue === 'number') {
    return timeValue < 10000000000 ? timeValue * 1000 : timeValue
  }

  if (typeof timeValue === 'string' && /^\d+$/.test(timeValue)) {
    const timestamp = parseInt(timeValue)
    return timestamp < 10000000000 ? timestamp * 1000 : timestamp
  }

  try {
    const date = new Date(timeValue)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null
}

/**
 * Normalize event payloads before returning to clients
 * Ensures timestamp is always a number
 * @param {object} event - Sequelize event instance
 * @returns {object} normalized plain object
 */
function normalizeEventForResponse (event) {
  const json = typeof event.toJSON === 'function' ? event.toJSON() : { ...event }

  if (json.timestamp !== undefined && json.timestamp !== null) {
    const numericTimestamp = Number(json.timestamp)
    if (!Number.isNaN(numericTimestamp)) {
      json.timestamp = numericTimestamp
    }
  }

  return json
}

/**
 * List events with filters and pagination
 * @param {object} params - Parameters containing raw query object
 * @param {object} context - Optional context (req, user, etc.)
 * @returns {Promise<object>} Events list with pagination info
 */
async function listEvents (params = {}, context = {}, transaction) {
  const query = params.query || {}
  await Validator.validate(query, Validator.schemas.eventListQuery)

  const filters = {}

  if (query.startTime !== undefined) {
    const startTime = parseTime(query.startTime)
    if (startTime === null) {
      throw new Errors.ValidationError('Invalid startTime format. Use Unix timestamp (seconds or milliseconds) or ISO 8601 format (e.g., 2023-10-01T12:00:00Z)')
    }
    filters.startTime = startTime
  }

  if (query.endTime !== undefined) {
    const endTime = parseTime(query.endTime)
    if (endTime === null) {
      throw new Errors.ValidationError('Invalid endTime format. Use Unix timestamp (seconds or milliseconds) or ISO 8601 format (e.g., 2023-10-01T12:00:00Z)')
    }
    filters.endTime = endTime
  }

  if (filters.startTime && filters.endTime && filters.startTime > filters.endTime) {
    throw new Errors.ValidationError('startTime must be before or equal to endTime')
  }

  if (query.endpointType) {
    filters.endpointType = query.endpointType
  }

  if (query.resourceType) {
    filters.resourceType = query.resourceType
  }

  if (query.status) {
    filters.status = query.status
  }

  if (query.method) {
    filters.method = Array.isArray(query.method) ? query.method : [query.method]
  }

  if (query.actorId) {
    filters.actorId = query.actorId
  }

  if (query.eventType) {
    filters.eventType = query.eventType
  }

  let limit = 200
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const parsedLimit = parseInt(query.limit)
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 1000)
    }
  }

  let offset = 0
  if (query.offset !== undefined && query.offset !== null && query.offset !== '') {
    const parsedOffset = parseInt(query.offset)
    if (!isNaN(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset
    }
  }

  filters.limit = limit
  filters.offset = offset

  const result = await EventManager.findAllWithFilters(filters, transaction)

  return {
    events: result.events.map(normalizeEventForResponse),
    total: result.total,
    limit: result.limit,
    offset: result.offset
  }
}

/**
 * Delete events based on retention configuration
 * @param {object} params - Parameters containing days
 * @param {object} context - Additional context (req, etc.)
 * @returns {Promise<object>} Deletion summary
 */
async function deleteEvents (params = {}, context = {}, transaction) {
  const body = params.body || {}
  await Validator.validate(body, Validator.schemas.eventDeleteRequest)

  const { days } = body
  const request = context.req || {}

  const cutoffTimestamp = days > 0 ? Date.now() - (days * 24 * 60 * 60 * 1000) : null
  const deletedCount = await EventManager.deleteEventsOlderThanDays(days, transaction)

  setImmediate(async () => {
    try {
      // Use config.get() which properly parses boolean strings from env vars
      const captureIp = config.get('settings.eventCaptureIpAddress', true)
      const endpointType = request.path && request.path.startsWith('/api/v3/agent/') ? 'agent' : 'user'
      const actorId = extractActorId(request)

      await createEvent({
        timestamp: Date.now(),
        eventType: 'HTTP',
        endpointType,
        actorId,
        method: 'DELETE',
        resourceType: 'event',
        resourceId: null,
        endpointPath: '/api/v3/events',
        ipAddress: captureIp ? extractIPv4Address(request) : null,
        status: 'SUCCESS',
        statusCode: 200,
        statusMessage: days === 0 ? `Deleted all ${deletedCount} events` : `Deleted ${deletedCount} events older than ${days} days`,
        requestId: request.id || null
      }, { fakeTransaction: true }).catch(err => {
        logger.error('Failed to create DELETE events audit record (non-blocking):', err)
      })
    } catch (error) {
      logger.error('Error creating DELETE events audit record (non-blocking):', error)
    }
  })

  return {
    deletedCount,
    deletedBefore: cutoffTimestamp ? new Date(cutoffTimestamp).toISOString() : null,
    deletedAt: new Date().toISOString(),
    deletedAll: days === 0
  }
}

module.exports = {
  extractResourceType,
  extractResourceId,
  extractActorId,
  extractUsernameFromToken,
  extractIPv4Address,
  determineStatus,
  determineWsStatus,
  createEvent: TransactionDecorator.generateTransaction(createEvent),
  createHttpEvent,
  createWsConnectEvent,
  createWsDisconnectEvent,
  listEvents: TransactionDecorator.generateTransaction(listEvents),
  deleteEvents: TransactionDecorator.generateTransaction(deleteEvents)
}

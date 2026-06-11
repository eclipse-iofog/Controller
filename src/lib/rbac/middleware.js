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

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const authorizer = require('./authorizer')
const logger = require('../../logger')
const config = require('../../config')
const db = require('../../data/models')
const { getOidcSettings } = require('../../config/oidc')
const { PASSWORD_CHANGE_REQUIRED_CLAIM } = require('../../services/auth-token-service')

const PASSWORD_CHANGE_ALLOWLIST = [
  { method: 'GET', path: '/api/v3/user/profile' },
  { method: 'POST', path: '/api/v3/user/change-password' }
]

// Load route resource catalog
let routeCatalog = null
function loadRouteCatalog () {
  if (routeCatalog) {
    return routeCatalog
  }

  try {
    const catalogPath = path.resolve(__dirname, '../../config/rbac-resources.yaml')
    const fileContents = fs.readFileSync(catalogPath, 'utf8')
    routeCatalog = yaml.load(fileContents)
    return routeCatalog
  } catch (error) {
    logger.error('Failed to load RBAC route catalog:', error)
    throw new Error('RBAC route catalog not found or invalid')
  }
}

function getAuthClientId () {
  const { clientId } = getOidcSettings()
  return clientId || config.get('auth.client.id')
}

function extractUserSubject (tokenContent) {
  const username = tokenContent.preferred_username
    || tokenContent.username
    || tokenContent.email
    || tokenContent.sub
  if (!username) {
    return null
  }
  return {
    kind: 'User',
    name: String(username)
  }
}

function extractGroupSubjects (tokenContent) {
  const groups = []
  const clientId = getAuthClientId()

  if (clientId && tokenContent.resource_access && tokenContent.resource_access[clientId]) {
    const clientRoles = tokenContent.resource_access[clientId].roles || []
    for (const role of clientRoles) {
      groups.push({
        kind: 'Group',
        name: role.toLowerCase()
      })
    }
  }

  if (Array.isArray(tokenContent.roles)) {
    for (const role of tokenContent.roles) {
      groups.push({
        kind: 'Group',
        name: String(role).toLowerCase()
      })
    }
  }

  if (Array.isArray(tokenContent.groups)) {
    for (const group of tokenContent.groups) {
      groups.push({
        kind: 'Group',
        name: String(group).toLowerCase()
      })
    }
  }

  return groups
}

function normalizeRequestPath (path) {
  let normalizedPath = path
  try {
    if (path.includes('?')) {
      normalizedPath = path.split('?')[0]
    }
    if (normalizedPath.includes('#')) {
      normalizedPath = normalizedPath.split('#')[0]
    }
  } catch (error) {
    // If parsing fails, use path as-is
  }
  return normalizedPath.replace(/\/$/, '')
}

function tokenRequiresPasswordChange (tokenContent) {
  return Boolean(tokenContent && tokenContent[PASSWORD_CHANGE_REQUIRED_CLAIM] === true)
}

function isPasswordChangeAllowlistedRoute (method, path) {
  const normalizedPath = normalizeRequestPath(path)
  return PASSWORD_CHANGE_ALLOWLIST.some((route) => (
    route.method === method.toUpperCase() && route.path === normalizedPath
  ))
}

function denyPasswordChangeRequired (res) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Password change required before accessing this resource'
  })
}

async function userStillRequiresPasswordChange (tokenContent) {
  if (!tokenRequiresPasswordChange(tokenContent)) {
    return false
  }

  const userId = tokenContent.sub
  if (!userId) {
    return true
  }

  const user = await db.AuthUser.findByPk(userId, {
    attributes: ['mustChangePassword', 'deletedAt']
  })

  if (!user || user.deletedAt) {
    return true
  }

  return Boolean(user.mustChangePassword)
}

async function enforcePasswordChangeGate (req, res, tokenContent) {
  if (!await userStillRequiresPasswordChange(tokenContent)) {
    return false
  }
  if (isPasswordChangeAllowlistedRoute(req.method, req.path)) {
    return false
  }
  denyPasswordChangeRequired(res)
  return true
}

async function enforcePasswordChangeGateForWebSocket (tokenContent, path) {
  if (!await userStillRequiresPasswordChange(tokenContent)) {
    return { blocked: false }
  }
  if (isPasswordChangeAllowlistedRoute('WS', path)) {
    return { blocked: false }
  }
  return {
    blocked: true,
    reason: 'Password change required before accessing this resource'
  }
}

/**
 * Extract subjects from request (OIDC bearer token via req.kauth or ServiceAccount JWT)
 */
function extractSubjects (req) {
  const subjects = []

  if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
    const tokenContent = req.kauth.grant.access_token.content

    const user = extractUserSubject(tokenContent)
    if (user) {
      subjects.push(user)
    }

    subjects.push(...extractGroupSubjects(tokenContent))
  }

  // // Extract from ServiceAccount JWT (if present in Authorization header)
  // // This would be for agent-to-controller or microservice-to-controller communication
  // if (req.headers.authorization) {
  //   const authHeader = req.headers.authorization
  //   if (authHeader.startsWith('Bearer ')) {
  //     // TODO: Parse JWT and extract ServiceAccount subject
  //     // For now, we'll handle this in a future update
  //   }
  // }

  return subjects
}

/**
 * Find route definition in catalog
 */
function findRouteDefinition (method, path) {
  const catalog = loadRouteCatalog()
  if (!catalog || !catalog.resources) {
    return null
  }

  // Normalize path (remove trailing slashes and query parameters)
  // Extract pathname only (remove query string and hash)
  const normalizedPath = normalizeRequestPath(path)

  for (const [resourceName, resourceDef] of Object.entries(catalog.resources)) {
    if (!resourceDef.routes || !Array.isArray(resourceDef.routes)) {
      continue
    }

    for (const route of resourceDef.routes) {
      // Normalize route path (remove trailing slashes) before creating regex
      const normalizedRoutePath = route.path.replace(/\/$/, '')
      // Convert route path pattern to regex
      // Replace :param with ([^/]+) for matching
      const routePattern = normalizedRoutePath.replace(/:[^/]+/g, '([^/]+)')
      const routeRegex = new RegExp(`^${routePattern}$`)

      if (routeRegex.test(normalizedPath)) {
        const methods = route.methods || {}
        // Support both HTTP methods and WebSocket (WS)
        const methodKey = method.toUpperCase() === 'WS' ? 'WS' : method.toUpperCase()
        const verbs = methods[methodKey]

        if (verbs && verbs.length > 0) {
          // Extract resource name from path if resourceNameParam is specified
          const matches = normalizedPath.match(routeRegex)
          let resourceNameValue = null
          if (route.resourceNameParam && matches) {
            // Find the parameter index in the original path
            const paramNames = []
            const paramPattern = /:([^/]+)/g
            let match
            while ((match = paramPattern.exec(route.path)) !== null) {
              paramNames.push(match[1])
            }
            const paramIndex = paramNames.indexOf(route.resourceNameParam)
            if (paramIndex >= 0 && matches[paramIndex + 1]) {
              resourceNameValue = matches[paramIndex + 1]
            }
          }

          return {
            resource: resourceName,
            verb: verbs[0], // Use first verb if multiple
            resourceName: resourceNameValue,
            apiGroup: '' // Core API group
          }
        }
      }
    }
  }

  return null
}

/**
 * Extract subjects from WebSocket request (for WebSocket connections)
 */
function extractSubjectsFromWebSocket (req, token) {
  const subjects = []

  if (token) {
    try {
      const tokenParts = token.replace('Bearer ', '').split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())

        const user = extractUserSubject(payload)
        if (user) {
          subjects.push(user)
        }

        subjects.push(...extractGroupSubjects(payload))
      }
    } catch (error) {
      logger.warn('Failed to extract subjects from WebSocket token:', error)
    }
  }

  return subjects
}

/**
 * RBAC middleware factory for HTTP routes
 * @param {string} resource - Resource name (optional, will be auto-detected from route)
 * @param {string} verb - Verb (optional, will be auto-detected from route)
 * @returns {Function} Express middleware
 */
function requirePermission (resource, verb) {
  return async (req, res, next) => {
    try {
      // Extract subjects from request
      const subjects = extractSubjects(req)
      if (subjects.length === 0) {
        logger.warn('No subjects found in request for RBAC authorization')
        return res.status(401).json({ error: 'Unauthorized: No authentication information found' })
      }

      const tokenContent = req.kauth.grant.access_token.content
      if (await enforcePasswordChangeGate(req, res, tokenContent)) {
        return
      }

      // Find route definition
      const routeDef = findRouteDefinition(req.method, req.path)
      if (!routeDef) {
        // If route not in catalog, allow (for backward compatibility with non-RBAC routes)
        logger.debug(`Route ${req.method} ${req.path} not found in RBAC catalog, allowing`)
        return next()
      }

      // Use provided resource/verb or route definition
      const finalResource = resource || routeDef.resource
      const finalVerb = verb || routeDef.verb
      const resourceName = routeDef.resourceName

      // Get database transaction (create a fake transaction for read-only operations)
      const transaction = { fakeTransaction: true }

      // Authorize
      const authResult = await authorizer.authorize(
        subjects,
        routeDef.apiGroup || '',
        finalResource,
        finalVerb,
        resourceName,
        transaction
      )

      if (!authResult.allowed) {
        logger.warn(`RBAC authorization denied: ${authResult.reason}`, {
          subjects,
          resource: finalResource,
          verb: finalVerb,
          resourceName,
          path: req.path,
          method: req.method
        })
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason || 'Access denied'
        })
      }

      // Authorization successful
      logger.debug('RBAC authorization allowed', {
        subjects,
        resource: finalResource,
        verb: finalVerb,
        resourceName
      })

      return next()
    } catch (error) {
      logger.error('RBAC middleware error:', error)
      return res.status(500).json({ error: 'Internal server error during authorization' })
    }
  }
}

/**
 * RBAC authorization check for WebSocket connections
 * @param {Object} req - WebSocket request object
 * @param {string} token - Bearer token from Authorization header or query params
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
async function authorizeWebSocket (req, token) {
  let subjects = []
  try {
    // Extract subjects from WebSocket token
    subjects = extractSubjectsFromWebSocket(req, token)
    if (subjects.length === 0) {
      return { allowed: false, reason: 'No subjects found in WebSocket token' }
    }

    let tokenPayload = null
    if (token) {
      try {
        const tokenParts = token.replace('Bearer ', '').split('.')
        if (tokenParts.length === 3) {
          tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
        }
      } catch (error) {
        logger.warn('Failed to parse WebSocket token for password-change gate:', error)
      }
    }

    const passwordChangeGate = await enforcePasswordChangeGateForWebSocket(tokenPayload, req.url)
    if (passwordChangeGate.blocked) {
      return { allowed: false, reason: passwordChangeGate.reason }
    }

    // Find route definition (use 'WS' as method)
    const routeDef = findRouteDefinition('WS', req.url)
    if (!routeDef) {
      // If route not in catalog, allow (for backward compatibility)
      logger.debug(`WebSocket route ${req.url} not found in RBAC catalog, allowing`)
      return { allowed: true, reason: 'Route not in catalog' }
    }

    logger.debug(`WebSocket route found in catalog:`, {
      url: req.url,
      resource: routeDef.resource,
      verb: routeDef.verb,
      resourceName: routeDef.resourceName,
      subjects: subjects
    })

    // Get database transaction
    const transaction = { fakeTransaction: true }

    // Authorize
    const authResult = await authorizer.authorize(
      subjects,
      routeDef.apiGroup || '',
      routeDef.resource,
      routeDef.verb,
      routeDef.resourceName,
      transaction
    )

    logger.debug(`WebSocket authorization result:`, {
      allowed: authResult.allowed,
      reason: authResult.reason,
      resource: routeDef.resource,
      verb: routeDef.verb,
      subjects: subjects
    })

    if (!authResult.allowed) {
      logger.warn(`RBAC authorization denied for WebSocket: ${authResult.reason}`, {
        subjects,
        resource: routeDef.resource,
        verb: routeDef.verb,
        resourceName: routeDef.resourceName,
        path: req.url
      })
    }

    return authResult
  } catch (error) {
    logger.error('RBAC WebSocket authorization error:', JSON.stringify({
      error: error.message,
      stack: error.stack,
      url: req.url,
      subjects: subjects
    }))
    return { allowed: false, reason: 'Internal server error during authorization' }
  }
}

/**
 * Middleware to skip RBAC (for public routes)
 */
function skipRBAC () {
  return (req, res, next) => {
    next()
  }
}

/**
 * RBAC protection for WebSocket connections
 * Handles token extraction from headers or query parameters
 * @param {Function} handler - WebSocket handler function (ws, req) => {}
 * @returns {Function} Protected WebSocket handler
 */
function protectWebSocket (handler) {
  return async (ws, req) => {
    try {
      // Extract token from Authorization header first (for agent and CLI connections)
      let token = req.headers.authorization

      // If no token in header, check query parameters (for React UI connections)
      if (!token) {
        logger.debug('Missing authentication token in header, checking query parameters')
        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          const queryToken = url.searchParams.get('token')
          if (queryToken) {
            // Format as Bearer token and store in headers for consistency
            token = `Bearer ${queryToken}`
            req.headers.authorization = token
          }
        } catch (urlError) {
          logger.warn('Failed to parse URL for token extraction:', urlError)
        }
      }

      if (!token) {
        logger.error('WebSocket connection failed: Missing authentication token neither in header nor query parameters')
        try {
          ws.close(1008, 'Missing authentication token')
        } catch (error) {
          logger.error('Error closing WebSocket:', error)
        }
        return
      }

      // Create mock request object for route definition lookup
      const mockReq = {
        url: req.url,
        method: 'WS'
      }

      // Perform RBAC authorization
      const authResult = await authorizeWebSocket(mockReq, token)
      if (!authResult.allowed) {
        logger.warn(`RBAC authorization denied for WebSocket: ${authResult.reason}`, {
          path: req.url
        })
        try {
          ws.close(1008, authResult.reason || 'Access denied')
        } catch (error) {
          logger.error('Error closing WebSocket:', error)
        }
        return
      }

      // Authorization successful - call the original handler
      return handler(ws, req)
    } catch (error) {
      logger.error('WebSocket RBAC protection error:', error)
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1008, error.message || 'Authorization failed')
        }
      } catch (closeError) {
        logger.error('Error closing WebSocket:', closeError)
      }
    }
  }
}

/**
 * RBAC protect function — OIDC-aware authorization gate (keycloak.protect() replacement)
 *
 * NOTE: The roles parameter is IGNORED. Authorization is determined automatically
 * from the route catalog (rbac-resources.yaml) and RoleBindings in the database.
 *
 * Do NOT pass static role arrays. All authorization is based on fine-grained RBAC rules
 * defined via Role and RoleBinding objects.
 *
 * @param {string|Array} _roles - IGNORED (kept for backward compatibility only)
 * @returns {Function} Middleware function compatible with legacy keycloak.protect() signature
 */
function protect (_roles) {
  // _roles parameter is ignored - authorization determined from route catalog and RoleBindings
  // Return a function that matches legacy protect() signature: (req, res, callback) => {}
  return async (req, res, callback) => {
    try {
      // Extract subjects from request
      const subjects = extractSubjects(req)
      if (subjects.length === 0) {
        logger.warn('No subjects found in request for RBAC authorization')
        return res.status(401).json({ error: 'Unauthorized: No authentication information found' })
      }

      const tokenContent = req.kauth.grant.access_token.content
      if (await enforcePasswordChangeGate(req, res, tokenContent)) {
        return
      }

      // Find route definition
      const routeDef = findRouteDefinition(req.method, req.path)
      if (!routeDef) {
        // If route not in catalog, allow (for backward compatibility with non-RBAC routes)
        logger.debug(`Route ${req.method} ${req.path} not found in RBAC catalog, allowing`)
        return callback()
      }

      // Get database transaction
      const transaction = { fakeTransaction: true }

      // Authorize
      const authResult = await authorizer.authorize(
        subjects,
        routeDef.apiGroup || '',
        routeDef.resource,
        routeDef.verb,
        routeDef.resourceName,
        transaction
      )

      if (!authResult.allowed) {
        logger.warn(`RBAC authorization denied: ${authResult.reason}`, {
          subjects,
          resource: routeDef.resource,
          verb: routeDef.verb,
          resourceName: routeDef.resourceName,
          path: req.path,
          method: req.method
        })
        return res.status(403).json({
          error: 'Forbidden',
          message: authResult.reason || 'Access denied'
        })
      }

      // Authorization successful - call the callback
      logger.debug('RBAC authorization allowed', {
        subjects,
        resource: routeDef.resource,
        verb: routeDef.verb,
        resourceName: routeDef.resourceName
      })

      return callback()
    } catch (error) {
      logger.error('RBAC middleware error:', error)
      return res.status(500).json({ error: 'Internal server error during authorization' })
    }
  }
}

module.exports = {
  requirePermission,
  protect, // OIDC-aware replacement for legacy keycloak.protect()
  authorizeWebSocket,
  protectWebSocket, // RBAC protection for WebSocket connections
  skipRBAC,
  extractSubjects,
  extractSubjectsFromWebSocket,
  findRouteDefinition,
  tokenRequiresPasswordChange,
  isPasswordChangeAllowlistedRoute
}



const WebSocket = require('ws')
const config = require('../config')
const baseLogger = require('../logger')
const Errors = require('../helpers/errors')
const LogSessionManager = require('./log-session-manager')
const ExecSessionManager = require('./exec-session-manager')
const { WebSocketError } = require('./error-handler')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const { microserviceState } = require('../enums/microservice-state')
const AuthDecorator = require('../decorators/authorization-decorator')
const TransactionDecorator = require('../decorators/transaction-decorator')
const msgpack = require('@msgpack/msgpack')
const { resolveTransport } = require('../services/ws-relay-transport-factory')
const {
  recordExecSessionActive,
  recordLogSessionActive
} = require('./ws-metrics')
const AppHelper = require('../helpers/app-helper')
const MicroserviceLogStatusManager = require('../data/managers/microservice-log-status-manager')
const MicroserviceExecSessionManager = require('../data/managers/microservice-exec-session-manager')
const FogLogStatusManager = require('../data/managers/fog-log-status-manager')
const ChangeTrackingService = require('../services/change-tracking-service')
const FogManager = require('../data/managers/iofog-manager')
const FogStates = require('../enums/fog-state')

const MESSAGE_TYPES = {
  STDIN: 0,
  STDOUT: 1,
  STDERR: 2,
  CONTROL: 3,
  CLOSE: 4,
  ACTIVATION: 5,
  LOG_LINE: 6, // Log line from agent
  LOG_START: 7, // Log streaming started
  LOG_STOP: 8, // Log streaming stopped
  LOG_ERROR: 9 // Log streaming error
}

const RELAY_UNAVAILABLE_CLOSE_CODE = 1013
const RELAY_UNAVAILABLE_CLOSE_REASON = 'Relay unavailable for cross-replica session'
const DRAIN_CLOSE_CODE = 1001
const DRAIN_CLOSE_REASON = 'Server draining'
// when user WS bufferedAmount exceeds this, drop LOG_LINE silently and emit LOG_ERROR once.
const LOG_BACKPRESSURE_BUFFER_BYTES = 256 * 1024

const EventService = require('../services/event-service')
const { isAuthConfigured: isOidcAuthConfigured } = require('../config/oidc')

let processErrorHandlersRegistered = false

function safeSerializeForLog (value) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    return {
      serializationError: error.message,
      type: value && value.constructor ? value.constructor.name : typeof value,
      asString: String(value)
    }
  }
}

function formatErrorForLog (errorLike) {
  if (errorLike instanceof Error) {
    return {
      type: 'Error',
      name: errorLike.name,
      message: errorLike.message,
      stack: errorLike.stack,
      cause: errorLike.cause ? formatErrorForLog(errorLike.cause) : undefined
    }
  }

  if (typeof errorLike === 'string') {
    return {
      type: 'string',
      message: errorLike
    }
  }

  if (typeof errorLike === 'object' && errorLike !== null) {
    return {
      type: errorLike.constructor ? errorLike.constructor.name : 'object',
      details: safeSerializeForLog(errorLike)
    }
  }

  return {
    type: typeof errorLike,
    details: errorLike
  }
}

function normalizeErrorLogArgs (args) {
  if (!Array.isArray(args) || args.length === 0) {
    return args
  }

  const [first, ...rest] = args

  if (args.length === 1) {
    if (first instanceof Error) {
      return [{
        msg: first.message || 'Error',
        error: formatErrorForLog(first)
      }]
    }
    return args
  }

  if (typeof first === 'string') {
    const payload = { msg: first }
    const context = {}
    const additional = []

    for (const item of rest) {
      if (item instanceof Error && !payload.error) {
        payload.error = formatErrorForLog(item)
        continue
      }

      if (typeof item === 'object' && item !== null) {
        Object.assign(context, safeSerializeForLog(item))
        continue
      }

      additional.push(item)
    }

    if (Object.keys(context).length > 0) {
      payload.context = context
    }
    if (additional.length > 0) {
      payload.args = additional
    }

    return [payload]
  }

  return args
}

function createSafeLogger (loggerInstance) {
  return new Proxy(loggerInstance, {
    get (target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver)
      if (prop !== 'error' || typeof original !== 'function') {
        return original
      }

      return (...args) => original.apply(target, normalizeErrorLogArgs(args))
    }
  })
}

const logger = createSafeLogger(baseLogger)

class WebSocketServer {
  constructor () {
    this.wss = null
    this.agentSessions = new Map()
    this.userSessions = new Map()
    this.connectionLimits = new Map()
    this.rateLimits = new Map()
    this.logSessionManager = new LogSessionManager(config.get('server.webSocket'))
    this.execSessionManager = new ExecSessionManager(config.get('server.webSocket'))
    this.sessionConfig = config.get('server.webSocket.session')
    this.relayTransport = resolveTransport()
    this.relayTransport.onRecovery(async (sessionId, meta) => {
      if (!meta || meta.kind !== 'exec') return
      const session = this.execSessionManager.getExecSession(sessionId)
      if (!session || !session.user || !session.agent) return
      session.activationSent = false
      try {
        await TransactionDecorator.generateTransaction(async (tx) => {
          await this.sendExecActivationToExecSession(session, sessionId, tx)
        })()
      } catch (error) {
        logger.error('[RELAY] Failed to resend exec activation after relay recovery', {
          sessionId,
          error: error.message
        })
      }
    })
    this.pendingCloseTimeouts = new Map() // Track pending CLOSE messages in cross-replica scenarios
    this.haConfig = config.get('server.webSocket.ha') || {}
    this.isDraining = false
    this.drainPromise = null
    this.logBackpressureNotified = new Set()
    this.config = {
      pingInterval: process.env.WS_PING_INTERVAL || config.get('server.webSocket.pingInterval'),
      pongTimeout: process.env.WS_PONG_TIMEOUT || config.get('server.webSocket.pongTimeout'),
      maxPayload: process.env.WS_MAX_PAYLOAD || config.get('server.webSocket.maxPayload'),
      sessionTimeout: process.env.WS_SESSION_TIMEOUT || config.get('server.webSocket.session.timeout'),
      cleanupInterval: process.env.WS_CLEANUP_INTERVAL || config.get('server.webSocket.session.cleanupInterval'),
      sessionMaxConnections: process.env.WS_SESSION_MAX_CONNECTIONS || config.get('server.webSocket.session.maxConnections'),
      closeResponseTimeout: process.env.WS_CLOSE_RESPONSE_TIMEOUT || 5000 // 5 seconds timeout for agent CLOSE response
    }

    this.ensureSocketPongHandler = (ws) => {
      if (!ws || ws._hasPingListener) {
        return
      }
      ws._hasPingListener = true
      ws.on('ping', () => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.pong()
          } catch (error) {
            logger.debug('[RELAY] Failed to respond to ping frame', { error: error.message })
          }
        }
      })
    }
  }

  // MessagePack encoding/decoding helpers with improved error handling
  encodeMessage (message) {
    try {
      const encoded = msgpack.encode(message)
      logger.debug('Encoded MessagePack message', {
        encodedLength: encoded.length,
        hasExecId: message instanceof Map ? message.has('execId') : 'execId' in message
      })
      return encoded
    } catch (error) {
      logger.error('Failed to encode message:' + JSON.stringify({
        error: error.message,
        message
      }))
      throw new WebSocketError(1008, 'Message encoding failed')
    }
  }

  decodeMessage (buffer) {
    try {
      const decoded = msgpack.decode(buffer)
      logger.debug('Decoded MessagePack message', {
        bufferLength: buffer.length,
        hasExecId: decoded instanceof Map ? decoded.has('execId') : 'execId' in decoded
      })
      return decoded
    } catch (error) {
      logger.error('Failed to decode MessagePack message:' + JSON.stringify({
        error: error.message,
        bufferLength: buffer.length
      }))
      throw error
    }
  }

  initialize (server) {
    // Strict WebSocket configuration with no extensions and RSV control
    const options = {
      server,
      maxPayload: process.env.WS_SECURITY_MAX_PAYLOAD || config.get('server.webSocket.security.maxPayload'),
      perMessageDeflate: false, // Explicitly disable compression
      clientTracking: true,
      verifyClient: this.verifyClient.bind(this),
      // Strict protocol handling
      handleProtocols: (protocols) => {
        // Accept any protocol but ensure strict mode
        return protocols[0]
      }
    }

    logger.info('Initializing WebSocket server with strict options', {
      maxPayload: options.maxPayload,
      perMessageDeflate: options.perMessageDeflate,
      clientTracking: options.clientTracking,
      tls: Boolean(server && (server.key || server.cert))
    })
    this.wss = new WebSocket.Server(options)

    // Handle WebSocket server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:' + JSON.stringify({
        error: error.message,
        stack: error.stack
      }))
    })

    // Handle individual connection errors
    this.wss.on('connection', (ws, req) => {
      this.trackConnectionLimit(ws, req)

      // Note: Connection logging moved to after successful authorization in handleConnection
      // This ensures we only log connections that pass RBAC checks

      // Set strict WebSocket options for this connection
      ws.binaryType = 'arraybuffer' // Force binary type to be arraybuffer

      if (ws._socket) {
        ws._socket.setNoDelay(true)
        ws._socket.setKeepAlive(true, 30000) // Enable keep-alive instead of disabling
      }

      // Add error handler for each connection
      ws.on('error', (error) => {
        logger.error('WebSocket connection error:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url
        }))
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close(1002, 'Protocol error')
          } catch (closeError) {
            logger.error('Error closing WebSocket:' + JSON.stringify({
              error: closeError.message,
              originalError: error.message
            }))
          }
        }
      })

      // Wrap handleConnection in try-catch to prevent unhandled errors
      try {
        this.handleConnection(ws, req)
      } catch (error) {
        logger.error('Unhandled error in handleConnection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url
        }))
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close(1002, 'Internal server error')
          } catch (closeError) {
            logger.error('Error closing WebSocket:' + JSON.stringify({
              error: closeError.message,
              originalError: error.message
            }))
          }
        }
      }
    })

    // Register process-level handlers once to avoid duplicate logs.
    if (!processErrorHandlersRegistered) {
      process.on('uncaughtException', (error) => {
        logger.error({
          msg: 'Uncaught exception in process (registered by WebSocket server)',
          error: formatErrorForLog(error)
        })
        // Don't let the error crash the process
      })

      process.on('unhandledRejection', (reason, promise) => {
        logger.error({
          msg: 'Unhandled rejection in process (registered by WebSocket server)',
          reason: formatErrorForLog(reason),
          promise: {
            type: promise && promise.constructor ? promise.constructor.name : typeof promise
          }
        })
        // Don't let the error crash the process
      })

      processErrorHandlersRegistered = true
    }
  }

  getLogConcurrencyLimit () {
    return this.sessionConfig.logMaxConcurrentPerResource || 3
  }

  getExecConcurrencyLimit () {
    return this.sessionConfig.execMaxConcurrentPerResource || 3
  }

  getLogTailMaxLines () {
    return this.sessionConfig.logTailMaxLines || 5000
  }

  getExecPendingTimeoutMs () {
    return this.sessionConfig.execPendingTimeoutMs || 60000
  }

  getLogPendingTimeoutMs () {
    return this.sessionConfig.logPendingTimeoutMs || 120000
  }

  getDrainTimeoutMs () {
    return this.sessionConfig.drainTimeoutMs || 30000
  }

  isCrossReplicaSession (session) {
    return !!(session && (!session.agent || !session.user))
  }

  async requireRelayForCrossReplica (ws) {
    if (this.haConfig.failFastOnRouterUnavailable === false) {
      return true
    }
    const available = await this.relayTransport.isAvailable()
    if (!available) {
      logger.warn('[RELAY] Relay backend unavailable for cross-replica session', {
        transport: this.relayTransport.getTransport()
      })
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(RELAY_UNAVAILABLE_CLOSE_CODE, RELAY_UNAVAILABLE_CLOSE_REASON)
      }
      return false
    }
    return true
  }

  async countLogSessionsInDb (microserviceUuid, fogUuid, transaction) {
    if (microserviceUuid) {
      const rows = await MicroserviceLogStatusManager.findAll({ microserviceUuid }, transaction)
      return rows.length
    }
    if (fogUuid) {
      const rows = await FogLogStatusManager.findAll({ iofogUuid: fogUuid }, transaction)
      return rows.length
    }
    return 0
  }

  async countExecSessionsInDb (microserviceUuid, transaction) {
    if (!microserviceUuid) {
      return 0
    }
    const rows = await MicroserviceExecSessionManager.findAll({ microserviceUuid }, transaction)
    return rows.length
  }

  parseLogTailConfig (url, ws) {
    const tailMax = this.getLogTailMaxLines()
    const tailDefault = 100
    const tailParam = url.searchParams.get('tail')

    if (tailParam !== null && tailParam !== '') {
      const parsed = parseInt(tailParam, 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        ws.close(1008, `Invalid tail parameter. Must be between 1 and ${tailMax}.`)
        return null
      }
      if (parsed > tailMax) {
        ws.close(1008, `Tail exceeds maximum of ${tailMax} lines.`)
        return null
      }
    }

    const tailLines = (tailParam !== null && tailParam !== '')
      ? parseInt(tailParam, 10)
      : tailDefault

    return {
      lines: tailLines,
      follow: url.searchParams.get('follow') !== 'false',
      since: url.searchParams.get('since') || null,
      until: url.searchParams.get('until') || null
    }
  }

  async verifyClient (info, callback) {
    try {
      if (this.isDraining) {
        callback(new Error(DRAIN_CLOSE_REASON), false)
        return
      }

      // Check connection limits
      const clientIp = info.req.socket.remoteAddress
      const currentConnections = this.connectionLimits.get(clientIp) || 0
      if (currentConnections >= (process.env.WS_SECURITY_MAX_CONNECTIONS_PER_IP || config.get('server.webSocket.security.maxConnectionsPerIp'))) {
        callback(new Error('Too many connections'), false)
        return
      }

      // Check rate limits
      const now = Date.now()
      const rateLimit = this.rateLimits.get(clientIp) || { count: 0, resetTime: now + 60000 }
      if (now > rateLimit.resetTime) {
        rateLimit.count = 0
        rateLimit.resetTime = now + 60000
      }

      if (rateLimit.count >= (process.env.WS_SECURITY_MAX_REQUESTS_PER_MINUTE || config.get('server.webSocket.security.maxRequestsPerMinute'))) {
        callback(new Error('Rate limit exceeded'), false)
        return
      }

      rateLimit.count++
      this.rateLimits.set(clientIp, rateLimit)

      this.connectionLimits.set(clientIp, currentConnections + 1)

      callback(null, true)
    } catch (error) {
      callback(new Error('Internal server error'), false)
    }
  }

  decrementConnectionCount (clientIp) {
    const current = this.connectionLimits.get(clientIp) || 0
    if (current <= 1) {
      this.connectionLimits.delete(clientIp)
    } else {
      this.connectionLimits.set(clientIp, current - 1)
    }
  }

  trackConnectionLimit (ws, req) {
    const clientIp = req.socket.remoteAddress
    let released = false
    const release = () => {
      if (released) return
      released = true
      this.decrementConnectionCount(clientIp)
    }
    ws.once('close', release)
  }

  extractMicroserviceUuid (url) {
    // Match UUID pattern in the URL
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const match = url.match(uuidPattern)
    return match ? match[0] : null
  }

  handleConnection (ws, req) {
    if (this.isDraining) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(DRAIN_CLOSE_CODE, DRAIN_CLOSE_REASON)
      }
      return
    }

    // Add error handler for this connection
    ws.on('error', (error) => {
      logger.error('WebSocket connection error:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        url: req.url,
        headers: req.headers
      }))
      // Don't let the error crash the process
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1002, 'Protocol error')
        } catch (closeError) {
          logger.error('Error closing WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })

    // Wrap the entire connection handling in a transaction
    TransactionDecorator.generateTransaction(async (transaction) => {
      try {
        // Check if RBAC authorization has already been performed (from registered route middleware)
        if (req._rbacAuthorized) {
          // RBAC already passed, route directly to appropriate internal handler
          logger.debug(`WebSocket connection already RBAC authorized, routing to internal handler: ${req.url}`)
          await this._routeToInternalHandler(ws, req, transaction)
          return
        }

        // STEP 1: Check registered routes first (before internal routing)
        if (this.routes && this.routes.size > 0) {
          logger.debug(`Checking ${this.routes.size} registered routes for ${req.url}`)

          // Extract URL path (without query params) for prefix matching
          const urlPath = req.url.split('?')[0].replace(/\/$/, '')

          // Try to find a matching registered route
          for (const [routePath, routeData] of this.routes.entries()) {
            // Early exit: check prefix before expensive regex match
            const routePrefix = routeData.prefix || this.extractRoutePrefix(routePath)
            if (!urlPath.startsWith(routePrefix)) {
              // Skip this route - URL doesn't start with route prefix
              continue
            }

            // Only do regex match if prefix matches
            const matchResult = this.matchRoute(routePath, req.url)
            if (matchResult && matchResult.matched) {
              // Found matching route - extract params and call middleware
              // Middleware includes RBAC protection via protectWebSocket
              logger.info(`WebSocket route matched: ${routePath} for ${req.url}`, {
                routePath,
                url: req.url,
                params: matchResult.params,
                remoteAddress: req.socket.remoteAddress
              })

              // Set route params in req object for middleware access
              req.params = matchResult.params

              // Call the registered middleware (includes RBAC authorization)
              // If authorization fails, middleware will close the connection
              await routeData.middleware(ws, req)

              // If middleware returns successfully, connection is authorized
              logger.info(`WebSocket connection authorized and established: ${req.url}`, {
                url: req.url,
                remoteAddress: req.socket.remoteAddress,
                route: routePath
              })
              return // Exit early - route handled
            }
          }

          // No registered route matched - deny connection
          logger.warn(`WebSocket connection denied: No registered route found for ${req.url}`, {
            url: req.url,
            registeredRoutes: Array.from(this.routes.keys()),
            registeredRouteCount: this.routes.size
          })
          try {
            ws.close(1008, 'Route not registered')
          } catch (error) {
            logger.error('Error closing WebSocket after route mismatch:', error.message)
          }
          return
        } else {
          logger.warn(`WebSocket connection attempted but no routes are registered: ${req.url}`)
        }

        // STEP 2: Fallback to internal routing (DISABLED for security - all routes must be registered)
        // This fallback is only for agent connections which don't use RBAC
        // For user connections, all routes MUST be registered with RBAC protection
        logger.warn(`WebSocket connection attempted without registered route (fallback disabled): ${req.url}`)
        try {
          ws.close(1008, 'Route not registered - all WebSocket routes must be registered with RBAC protection')
        } catch (error) {
          logger.error('Error closing WebSocket:', error.message)
        }
      } catch (error) {
        logger.error('WebSocket connection error:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          headers: req.headers
        }))

        // Handle WebSocket errors gracefully
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Internal server error')
          }
        } catch (closeError) {
          logger.error('Error closing WebSocket connection:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })().catch(error => {
      logger.error('Unhandled WebSocket transaction error:' + JSON.stringify({
        error: error.message,
        stack: error.stack
      }))
    })
  }

  /**
   * Route to appropriate internal handler after RBAC authorization
   * This method is called when _rbacAuthorized flag is set (from route middleware)
   */
  async _routeToInternalHandler (ws, req, transaction) {
    try {
      // Extract token from headers (already set by protectWebSocket middleware)
      const token = req.headers.authorization
      if (!token) {
        logger.error('WebSocket internal routing failed: Missing authentication token')
        try {
          ws.close(1008, 'Missing authentication token')
        } catch (error) {
          logger.error('Error closing WebSocket:', error.message)
        }
        return
      }

      // Determine connection type and route to appropriate handler
      // IMPORTANT: Check more specific routes (system) BEFORE general routes
      if (req.url.startsWith('/api/v3/agent/exec/microservice/')) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const pathParts = url.pathname.split('/').filter(p => p)
        const microserviceIndex = pathParts.indexOf('microservice')
        const microserviceUuid = req.params.microserviceUuid ||
          (microserviceIndex >= 0 ? pathParts[microserviceIndex + 1] : null)
        const sessionId = req.params.sessionId ||
          (microserviceIndex >= 0 ? pathParts[microserviceIndex + 2] : null)
        if (!microserviceUuid || !sessionId) {
          logger.error('WebSocket internal routing failed: Invalid agent exec endpoint')
          try {
            ws.close(1008, 'Invalid endpoint')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }
        await this.handleAgentExecConnection(ws, req, token, microserviceUuid, sessionId, transaction)
      } else if (req.url.startsWith('/api/v3/microservices/system/exec/')) {
        // System microservice exec - check BEFORE regular microservice exec
        const microserviceUuid = req.params.microserviceUuid || this.extractMicroserviceUuid(req.url)
        if (!microserviceUuid) {
          logger.error('WebSocket internal routing failed: Invalid endpoint - no UUID found')
          try {
            ws.close(1008, 'Invalid endpoint')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }
        await this.handleUserExecConnection(ws, req, token, microserviceUuid, true, transaction) // true = expectSystem
      } else if (req.url.startsWith('/api/v3/microservices/exec/')) {
        // Regular microservice exec
        const microserviceUuid = req.params.microserviceUuid || this.extractMicroserviceUuid(req.url)
        if (!microserviceUuid) {
          logger.error('WebSocket internal routing failed: Invalid endpoint - no UUID found')
          try {
            ws.close(1008, 'Invalid endpoint')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }
        await this.handleUserExecConnection(ws, req, token, microserviceUuid, false, transaction) // false = not system
      } else if (req.url.includes('/logs')) {
        // Handle log connections - extract parameters from URL/req.params
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        const pathParts = url.pathname.split('/').filter(p => p)

        let microserviceUuid = req.params.uuid || null
        let fogUuid = req.params.uuid || null // For iofog routes, uuid is fogUuid
        let expectSystem = false

        // Determine if this is a system microservice log or fog log
        if (pathParts.includes('microservices') && pathParts.includes('system')) {
          const microserviceIndex = pathParts.indexOf('microservices')
          const systemIndex = pathParts.indexOf('system')
          if (systemIndex === microserviceIndex + 1) {
            microserviceUuid = req.params.uuid || pathParts[systemIndex + 1]
            expectSystem = true
            fogUuid = null
          }
        } else if (pathParts.includes('microservices')) {
          const microserviceIndex = pathParts.indexOf('microservices')
          microserviceUuid = req.params.uuid || pathParts[microserviceIndex + 1]
          expectSystem = false
          fogUuid = null
        } else if (pathParts.includes('iofog')) {
          const iofogIndex = pathParts.indexOf('iofog')
          fogUuid = req.params.uuid || pathParts[iofogIndex + 1]
          microserviceUuid = null
          expectSystem = false
        }

        await this.handleUserLogsConnection(ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction)
      } else {
        logger.error('WebSocket internal routing failed: Invalid endpoint')
        try {
          ws.close(1008, 'Invalid endpoint')
        } catch (error) {
          logger.error('Error closing WebSocket:', error.message)
        }
      }
    } catch (error) {
      logger.error('WebSocket internal routing error:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        url: req.url
      }))
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1008, error.message || 'Internal routing error')
        } catch (closeError) {
          logger.error('Error closing WebSocket:', closeError.message)
        }
      }
    }
  }

  scheduleAgentExecConnectEvent (req, resourceId) {
    setImmediate(async () => {
      try {
        const authHeader = req.headers.authorization
        let actorId = null
        if (authHeader) {
          const [scheme, token] = authHeader.split(' ')
          if (scheme.toLowerCase() === 'bearer' && token) {
            try {
              const tokenParts = token.split('.')
              if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                actorId = payload.sub || null
              }
            } catch (err) {
              // Ignore token parsing errors
            }
          }
        }
        await EventService.createWsConnectEvent({
          timestamp: Date.now(),
          endpointType: 'agent',
          actorId,
          path: req.url,
          resourceId,
          ipAddress: EventService.extractIPv4Address(req) || null
        })
      } catch (err) {
        logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
      }
    })
  }

  async handleUserExecConnection (ws, req, token, microserviceUuid, expectSystem, transaction) {
    try {
      this.ensureSocketPongHandler(ws)

      await this.validateUserConnection(token, microserviceUuid, expectSystem, transaction)

      const execConcurrencyLimit = this.getExecConcurrencyLimit()
      const existingExecCount = await this.countExecSessionsInDb(microserviceUuid, transaction)
      if (existingExecCount >= execConcurrencyLimit) {
        ws.close(1008, `Maximum of ${execConcurrencyLimit} concurrent exec sessions allowed for this microservice.`)
        return
      }

      const sessionId = AppHelper.generateUUID()

      await MicroserviceExecSessionManager.create({
        microserviceUuid,
        sessionId,
        status: 'PENDING',
        userConnected: true,
        agentConnected: false
      }, transaction)

      const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
      if (!microservice) {
        throw new Error(`Microservice not found: ${microserviceUuid}`)
      }

      const fog = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)
      if (!fog) {
        throw new Error(`Fog not found: ${microservice.iofogUuid}`)
      }

      await ChangeTrackingService.update(
        fog.uuid,
        ChangeTrackingService.events.microserviceExecSessions,
        transaction
      )

      logger.debug('Change tracking updated for exec session:' + JSON.stringify({
        fogUuid: fog.uuid,
        microserviceUuid,
        sessionId
      }))

      const execSession = this.execSessionManager.createExecSession(
        sessionId,
        microserviceUuid,
        null,
        ws,
        transaction
      )
      execSession.metricsActive = true
      recordExecSessionActive(1)

      const activationMsg = {
        type: MESSAGE_TYPES.ACTIVATION,
        data: Buffer.from(JSON.stringify({ sessionId, microserviceUuid })),
        sessionId,
        microserviceUuid,
        execId: sessionId,
        timestamp: Date.now()
      }
      ws.send(this.encodeMessage(activationMsg), { binary: true })

      try {
        const waitingMsg = {
          type: MESSAGE_TYPES.STDERR,
          data: Buffer.from('Waiting for agent connection. Interactive exec will begin once the agent connects.\n'),
          sessionId,
          microserviceUuid,
          execId: sessionId,
          timestamp: Date.now()
        }
        ws.send(this.encodeMessage(waitingMsg), { binary: true })
        logger.info('Sent waiting status message to user for exec session:' + JSON.stringify({
          sessionId,
          microserviceUuid
        }))
      } catch (error) {
        logger.warn('Failed to send waiting status message to user:' + JSON.stringify({
          error: error.message,
          sessionId
        }))
      }

      await this.setupExecMessageForwarding(sessionId, transaction)

      const EXEC_PENDING_TIMEOUT = this.getExecPendingTimeoutMs()
      const pendingTimer = setTimeout(async () => {
        const session = this.execSessionManager.getExecSession(sessionId)
        if (!session || session.agent) {
          return
        }
        logger.warn('Exec session pending timeout:' + JSON.stringify({
          sessionId,
          microserviceUuid,
          timeout: EXEC_PENDING_TIMEOUT
        }))
        try {
          if (ws.readyState === WebSocket.OPEN) {
            const timeoutMsg = {
              type: MESSAGE_TYPES.STDERR,
              data: Buffer.from('Timeout waiting for agent connection.\n'),
              sessionId,
              microserviceUuid,
              execId: sessionId,
              timestamp: Date.now()
            }
            ws.send(this.encodeMessage(timeoutMsg), { binary: true })
            ws.close(1008, 'Timeout waiting for agent connection')
          }
        } catch (error) {
          logger.warn('Failed to close exec session on pending timeout:' + error.message)
        }
        try {
          await TransactionDecorator.generateTransaction(async (timeoutTransaction) => {
            await this.cleanupExecSession(sessionId, timeoutTransaction)
          })()
        } catch (error) {
          logger.error('Failed to remove exec session after pending timeout:' + error.message)
        }
      }, EXEC_PENDING_TIMEOUT)

      setImmediate(async () => {
        try {
          let actorId = null
          if (req.headers && req.headers.authorization) {
            actorId = EventService.extractUsernameFromToken(req.headers.authorization)
          }
          await EventService.createWsConnectEvent({
            timestamp: Date.now(),
            endpointType: 'user',
            actorId,
            path: req.url,
            resourceId: microserviceUuid,
            ipAddress: EventService.extractIPv4Address(req) || null
          })
        } catch (err) {
          logger.error('Failed to create WS_CONNECT event for user exec session (non-blocking):', err)
        }
      })

      ws.on('close', async (code, reason) => {
        clearTimeout(pendingTimer)
        const session = this.execSessionManager.getExecSession(sessionId)
        if (session) {
          session.user = null
          session.lastActivity = Date.now()

          try {
            await TransactionDecorator.generateTransaction(async (closeTransaction) => {
              await this.cleanupExecSession(sessionId, closeTransaction)
            })()
          } catch (err) {
            logger.error('Failed to cleanup exec session on user disconnect:' + JSON.stringify({
              error: err.message,
              sessionId
            }))
          }
        }

        setImmediate(async () => {
          try {
            let actorId = null
            if (req.headers && req.headers.authorization) {
              actorId = EventService.extractUsernameFromToken(req.headers.authorization)
            }
            await EventService.createWsDisconnectEvent({
              timestamp: Date.now(),
              endpointType: 'user',
              actorId,
              path: req.url,
              resourceId: microserviceUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event for user exec session (non-blocking):', err)
          }
        })
      })
    } catch (error) {
      logger.error('User exec connection error:', error)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1008, error.message)
      }
    }
  }

  async handleAgentExecConnection (ws, req, token, microserviceUuid, sessionId, transaction) {
    try {
      this.ensureSocketPongHandler(ws)

      await this.validateAgentExecConnection(token, microserviceUuid, sessionId, transaction)

      const execRow = await MicroserviceExecSessionManager.findBySessionId(sessionId, transaction)
      if (!execRow) {
        logger.error('Agent exec: session not found:' + JSON.stringify({ sessionId, microserviceUuid }))
        ws.close(1008, 'Session not found')
        return
      }

      if (execRow.microserviceUuid !== microserviceUuid) {
        logger.error('Agent exec: session microservice mismatch:' + JSON.stringify({
          sessionId,
          microserviceUuid,
          rowMicroserviceUuid: execRow.microserviceUuid
        }))
        ws.close(1008, 'Session mismatch')
        return
      }

      await MicroserviceExecSessionManager.update(
        { sessionId },
        { agentConnected: true, status: 'ACTIVE' },
        transaction
      )

      const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
      const fog = await FogManager.findOne({ uuid: microservice.iofogUuid }, transaction)

      let session = this.execSessionManager.getExecSession(sessionId)
      if (!session) {
        if (!(await this.requireRelayForCrossReplica(ws))) {
          return
        }
        session = this.execSessionManager.createExecSession(
          sessionId,
          microserviceUuid,
          ws,
          null,
          transaction
        )
        session.metricsActive = true
        recordExecSessionActive(1)
      } else {
        session.agent = ws
        session.lastActivity = Date.now()
        session.activationSent = false
      }

      await this.setupExecMessageForwarding(sessionId, transaction)

      if (session.user && session.user.readyState === WebSocket.OPEN) {
        try {
          const readyMsg = {
            type: MESSAGE_TYPES.STDERR,
            data: Buffer.from('Agent connected. Interactive exec is ready.\n'),
            sessionId,
            microserviceUuid,
            execId: sessionId,
            timestamp: Date.now()
          }
          session.user.send(this.encodeMessage(readyMsg), { binary: true })
        } catch (error) {
          logger.warn('Failed to notify user that exec agent connected:' + JSON.stringify({
            sessionId,
            error: error.message
          }))
        }
      }

      this.scheduleAgentExecConnectEvent(req, microserviceUuid)

      setImmediate(async () => {
        try {
          const authHeader = req.headers.authorization
          let actorId = null
          if (authHeader) {
            const [scheme, authToken] = authHeader.split(' ')
            if (scheme.toLowerCase() === 'bearer' && authToken) {
              try {
                const tokenParts = authToken.split('.')
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                  actorId = payload.sub || null
                }
              } catch (err) {
                // Ignore token parsing errors
              }
            }
          }
          await EventService.createWsConnectEvent({
            timestamp: Date.now(),
            endpointType: 'agent',
            actorId,
            path: req.url,
            resourceId: microserviceUuid,
            ipAddress: EventService.extractIPv4Address(req) || null
          })
        } catch (err) {
          logger.error('Failed to create WS_CONNECT event for agent exec session (non-blocking):', err)
        }
      })

      ws.on('close', async (code, reason) => {
        const currentSession = this.execSessionManager.getExecSession(sessionId)
        if (currentSession) {
          currentSession.agent = null
          currentSession.lastActivity = Date.now()

          try {
            await TransactionDecorator.generateTransaction(async (closeTransaction) => {
              await MicroserviceExecSessionManager.update(
                { sessionId },
                { agentConnected: false },
                closeTransaction
              )

              const relayEnabled = this.relayTransport.shouldUseRelay(sessionId)

              if (!currentSession.user) {
                await this.cleanupExecSession(sessionId, closeTransaction)
              } else {
                if (relayEnabled) {
                  try {
                    const closeMsg = {
                      type: MESSAGE_TYPES.CLOSE,
                      execId: sessionId,
                      sessionId,
                      microserviceUuid: currentSession.microserviceUuid,
                      timestamp: Date.now(),
                      data: Buffer.from('Agent closed connection')
                    }
                    const encoded = this.encodeMessage(closeMsg)
                    await this.relayTransport.publishToUser(sessionId, encoded, { messageType: MESSAGE_TYPES.CLOSE })
                  } catch (error) {
                    logger.error('[WS-CLOSE] Failed to send CLOSE to user via queue after agent exec disconnect', {
                      sessionId,
                      error: error.message
                    })
                  }
                } else if (currentSession.user.readyState === WebSocket.OPEN) {
                  currentSession.user.close(1000, 'Agent closed connection')
                }

                await ChangeTrackingService.update(
                  fog.uuid,
                  ChangeTrackingService.events.microserviceExecSessions,
                  closeTransaction
                )
              }
            })()
          } catch (err) {
            logger.error('Failed to handle agent exec disconnect:' + JSON.stringify({
              sessionId,
              error: err.message
            }))
          }
        }

        setImmediate(async () => {
          try {
            const authHeader = req.headers.authorization
            let actorId = null
            if (authHeader) {
              const [scheme, authToken] = authHeader.split(' ')
              if (scheme.toLowerCase() === 'bearer' && authToken) {
                try {
                  const tokenParts = authToken.split('.')
                  if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                    actorId = payload.sub || null
                  }
                } catch (err) {
                  // Ignore token parsing errors
                }
              }
            }
            await EventService.createWsDisconnectEvent({
              timestamp: Date.now(),
              endpointType: 'agent',
              actorId,
              path: req.url,
              resourceId: microserviceUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event for agent exec session (non-blocking):', err)
          }
        })
      })

      ws.on('error', (error) => {
        logger.error('[WS-ERROR] Agent exec connection error:' + JSON.stringify({
          error: error.message,
          sessionId,
          microserviceUuid
        }))
      })
    } catch (error) {
      logger.error('Agent exec connection error:', error)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1008, error.message || 'Connection error')
      }
    }
  }

  // // Helper method - only filter obvious noise
  // isNoise(output) {
  //   // Filter only the most obvious noise
  //   const noisePatterns = [
  //     /^clear: command not found/,  // Clear command error
  //     /^\s*$/,                      // Empty or whitespace only
  //     /^.$/                         // Single character (usually control chars)
  //   ]
  //   return noisePatterns.some(pattern => pattern.test(output))
  // }

  async sendExecActivationToExecSession (session, sessionId, transaction) {
    if (!session.user || !session.agent) {
      return false
    }
    if (session.activationSent) {
      return true
    }

    const activationMsg = {
      type: MESSAGE_TYPES.ACTIVATION,
      data: Buffer.from(JSON.stringify({
        sessionId,
        execId: sessionId,
        microserviceUuid: session.microserviceUuid,
        timestamp: Date.now()
      })),
      sessionId,
      microserviceUuid: session.microserviceUuid,
      execId: sessionId,
      timestamp: Date.now()
    }

    try {
      const success = await this.sendMessageToAgent(session.agent, activationMsg, sessionId, session.microserviceUuid)
      if (success) {
        session.activationSent = true
        logger.info('[RELAY] Exec session activation sent to agent:' + JSON.stringify({
          sessionId,
          microserviceUuid: session.microserviceUuid,
          relayEnabled: this.relayTransport.shouldUseRelay(sessionId)
        }))
      } else {
        logger.error('[RELAY] Exec session activation to agent failed:' + JSON.stringify({
          sessionId,
          microserviceUuid: session.microserviceUuid
        }))
        if (session.agent) {
          await this.cleanupExecSession(sessionId, transaction)
        }
      }
      return success
    } catch (error) {
      logger.error('[RELAY] Exec session activation error:' + JSON.stringify({
        sessionId,
        error: error.message
      }))
      if (session.agent) {
        await this.cleanupExecSession(sessionId, transaction)
      }
      return false
    }
  }

  async validateAgentLogsConnection (token, microserviceUuid, iofogUuid, sessionId, transaction) {
    try {
      // 1. Validate agent token and get fog
      let fog = {}
      const req = { headers: { authorization: token }, transaction }
      const handler = AuthDecorator.checkFogToken(async (req, fogObj) => {
        fog = fogObj
        return fogObj
      })
      await handler(req)

      if (!fog) {
        logger.error('Agent validation failed: Invalid agent token')
        throw new WebSocketError(1008, 'Invalid agent token')
      }

      // 2. Validate microservice or fog
      if (microserviceUuid) {
        // Verify microservice exists and belongs to this fog
        const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
        if (!microservice || microservice.iofogUuid !== fog.uuid) {
          logger.error('Agent validation failed: Microservice not found or not associated with this agent' + JSON.stringify({
            microserviceUuid,
            fogUuid: fog.uuid,
            found: !!microservice,
            microserviceFogUuid: microservice ? microservice.iofogUuid : null
          }))
          throw new WebSocketError(1008, 'Microservice not found or not associated with this agent')
        }
      } else if (iofogUuid) {
        // Verify fog UUID matches the authenticated fog
        if (iofogUuid !== fog.uuid) {
          logger.error('Agent validation failed: Fog UUID mismatch' + JSON.stringify({
            iofogUuid,
            fogUuid: fog.uuid
          }))
          throw new WebSocketError(1008, 'Fog UUID mismatch')
        }
      } else {
        throw new WebSocketError(1008, 'Either microserviceUuid or iofogUuid must be provided')
      }

      return fog
    } catch (error) {
      logger.error('Agent logs validation error:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        microserviceUuid,
        iofogUuid,
        sessionId
      }))
      throw error // Propagate the original error
    }
  }

  async validateAgentExecConnection (token, microserviceUuid, sessionId, transaction) {
    return this.validateAgentLogsConnection(token, microserviceUuid, null, sessionId, transaction)
  }

  async validateUserConnection (token, microserviceUuid, expectSystem, transaction) {
    try {
      // 1. Basic token validation
      if (!token || !token.replace) {
        throw new Errors.AuthenticationError('Missing or invalid authorization token')
      }

      const bearerToken = token.replace('Bearer ', '')
      if (!bearerToken) {
        throw new Errors.AuthenticationError('Missing or invalid authorization token')
      }

      // 2. Validate microservice existence and type
      await this.validateMicroservice(microserviceUuid, expectSystem, transaction)

      // 3. Check microservice status
      const statusArr = await MicroserviceStatusManager.findAllExcludeFields({
        microserviceUuid
      }, transaction)
      if (!statusArr || statusArr.length === 0) {
        throw new Errors.NotFoundError('Microservice status not found')
      }
      const status = statusArr[0]
      if (status.status !== microserviceState.RUNNING) {
        throw new Errors.ValidationError('Microservice is not running')
      }

      // 4. RBAC Authorization is handled at route level, so we just validate resources here
      // Validation successful
      return { success: true }
    } catch (error) {
      logger.error('User connection validation failed:', {
        error: error.message,
        stack: error.stack,
        microserviceUuid,
        expectSystem
      })
      throw error
    }
  }

  /**
   * Validate microservice exists and check if it's a system microservice
   * @param {string} microserviceUuid - Microservice UUID
   * @param {boolean} expectSystem - If true, expects system microservice (app.isSystem === true)
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Microservice object
   */
  async validateMicroservice (microserviceUuid, expectSystem, transaction) {
    const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
    if (!microservice) {
      throw new Errors.NotFoundError(`Microservice not found: ${microserviceUuid}`)
    }

    if (expectSystem !== undefined) {
      const application = await ApplicationManager.findOne({ id: microservice.applicationId }, transaction)
      if (!application) {
        throw new Errors.NotFoundError(`Application not found for microservice: ${microserviceUuid}`)
      }

      const isSystem = application.isSystem === true
      if (expectSystem && !isSystem) {
        throw new Errors.NotFoundError(`Microservice ${microserviceUuid} is not found`)
      }
      if (!expectSystem && isSystem) {
        throw new Errors.NotFoundError(`Microservice ${microserviceUuid} is not found`)
      }
    }

    return microservice
  }

  /**
   * Validate fog node exists
   * @param {string} fogUuid - Fog UUID
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Object>} Fog object
   */
  async validateFog (fogUuid, transaction) {
    const fog = await FogManager.findOne({ uuid: fogUuid }, transaction)
    if (!fog) {
      throw new Errors.NotFoundError(`Fog node not found: ${fogUuid}`)
    }
    return fog
  }

  // Singleton instance
  async drain (timeoutMs = null) {
    if (this.drainPromise) {
      return this.drainPromise
    }

    const drainBudgetMs = timeoutMs || this.getDrainTimeoutMs()
    this.isDraining = true
    logger.info('[WS-DRAIN] Starting graceful drain', { timeoutMs: drainBudgetMs })

    this.drainPromise = (async () => {
      const deadline = Date.now() + drainBudgetMs
      const logSessionIds = this.logSessionManager.getAllLogSessionIds()
      const execSessionIds = this.execSessionManager.getAllExecSessionIds()
      const cleanupTasks = []

      for (const sessionId of execSessionIds) {
        cleanupTasks.push(
          TransactionDecorator.generateTransaction(async (tx) => {
            await this.cleanupExecSession(sessionId, tx)
          })().catch((error) => {
            logger.warn('[WS-DRAIN] Exec session cleanup failed', { sessionId, error: error.message })
          })
        )
      }

      for (const sessionId of logSessionIds) {
        cleanupTasks.push(
          TransactionDecorator.generateTransaction(async (tx) => {
            await this.cleanupLogSession(sessionId, tx)
          })().catch((error) => {
            logger.warn('[WS-DRAIN] Log session cleanup failed', { sessionId, error: error.message })
          })
        )
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs > 0 && cleanupTasks.length > 0) {
        await Promise.race([
          Promise.allSettled(cleanupTasks),
          new Promise((resolve) => setTimeout(resolve, remainingMs))
        ])
      }

      if (this.wss) {
        for (const client of this.wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.close(DRAIN_CLOSE_CODE, DRAIN_CLOSE_REASON)
            } catch (error) {
              logger.debug('[WS-DRAIN] Failed to close lingering client', { error: error.message })
            }
          }
        }
      }

      logger.info('[WS-DRAIN] Graceful drain complete', {
        execSessions: execSessionIds.length,
        logSessions: logSessionIds.length
      })

      await this.relayTransport.shutdown().catch((error) => {
        logger.warn('[WS-DRAIN] Relay transport shutdown failed', { error: error.message })
      })
    })()

    return this.drainPromise
  }

  static getInstance () {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer()
    }
    return WebSocketServer.instance
  }

  // Clean up session and close sockets
  // Utility to extract microserviceUuid from path
  extractUuidFromPath (path) {
    const match = path.match(/([a-f0-9-]{36})/i)
    return match ? match[1] : null
  }

  /**
   * Extract static prefix from route pattern (everything before first :param)
   * @param {string} routePattern - Route pattern like /api/v3/agent/exec/:microserviceUuid
   * @returns {string} - Static prefix like /api/v3/agent/exec
   */
  extractRoutePrefix (routePattern) {
    // Find first :param
    const paramIndex = routePattern.indexOf(':')
    if (paramIndex === -1) {
      // No params, entire route is prefix
      return routePattern.split('?')[0] // Remove query params if any
    }
    // Return everything before first :param
    return routePattern.substring(0, paramIndex).replace(/\/$/, '')
  }

  registerRoute (path, middleware) {
    // Store the route handler
    this.routes = this.routes || new Map()

    // Cache route prefix for fast filtering
    const prefix = this.extractRoutePrefix(path)
    this.routes.set(path, {
      middleware,
      prefix
    })

    logger.info('Registered WebSocket route: ' + path)
  }

  /**
   * Match a route pattern (e.g., /api/v3/iofog/:uuid/logs) against a URL
   * @param {string} routePattern - Route pattern with :param placeholders
   * @param {string} url - Full URL including query parameters
   * @returns {Object|null} - Match result with params or null if no match
   */
  matchRoute (routePattern, url) {
    try {
      // Strip query parameters and hash from URL
      let pathToMatch = url
      if (pathToMatch.includes('?')) {
        pathToMatch = pathToMatch.split('?')[0]
      }
      if (pathToMatch.includes('#')) {
        pathToMatch = pathToMatch.split('#')[0]
      }
      pathToMatch = pathToMatch.replace(/\/$/, '')

      // Normalize route pattern
      const normalizedRoute = routePattern.replace(/\/$/, '')

      // Convert route pattern to regex (replace :param with capture groups)
      const routeRegex = new RegExp('^' + normalizedRoute.replace(/:[^/]+/g, '([^/]+)') + '$')

      // Test match
      const matches = pathToMatch.match(routeRegex)
      if (!matches) {
        // Remove debug log - too noisy, prefix check already filtered most non-matches
        return null
      }

      // Extract parameter names and values
      const paramNames = []
      const paramPattern = /:([^/]+)/g
      let match
      while ((match = paramPattern.exec(normalizedRoute)) !== null) {
        paramNames.push(match[1])
      }

      const params = {}
      paramNames.forEach((name, index) => {
        if (matches[index + 1]) {
          params[name] = matches[index + 1]
        }
      })

      logger.debug(`Route pattern matched: ${routePattern} -> ${pathToMatch}`, {
        routePattern,
        url: pathToMatch,
        params
      })

      return { params, matched: true }
    } catch (error) {
      logger.error('Error matching route pattern:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        routePattern,
        url
      }))
      return null
    }
  }

  // Helper method for sending messages to agent
  async sendMessageToAgent (agent, message, execId, microserviceUuid) {
    try {
      const encoded = this.encodeMessage(message)
      const relayEnabled = this.relayTransport.shouldUseRelay(execId)
      const messageType = typeof message.type === 'number' ? message.type : null

      if (relayEnabled) {
        await this.relayTransport.publishToAgent(execId, encoded, { messageType })
        logger.debug('[RELAY] Queued message for agent via AMQP:' + JSON.stringify({
          execId,
          microserviceUuid,
          messageType: message.type,
          encodedLength: encoded.length
        }))
        return true
      }

      if (!agent || agent.readyState !== WebSocket.OPEN) {
        logger.error('[RELAY] Cannot send message - agent not ready:' + JSON.stringify({
          execId,
          microserviceUuid,
          agentState: agent ? agent.readyState : 'N/A',
          messageType: message.type
        }))
        return false
      }

      agent.send(encoded, {
        binary: true,
        compress: false,
        mask: false,
        fin: true
      })
      logger.debug('[RELAY] Message sent to agent:' + JSON.stringify({
        execId,
        microserviceUuid,
        messageType: message.type,
        encodedLength: encoded.length
      }))
      return true
    } catch (error) {
      logger.error('[RELAY] Failed to send message to agent:' + JSON.stringify({
        execId,
        microserviceUuid,
        messageType: message.type,
        error: error.message,
        stack: error.stack
      }))
      return false
    }
  }

  // Helper method to check if auth is configured
  isAuthConfigured () {
    return isOidcAuthConfigured()
  }

  // Helper method to validate ISO 8601 format
  isValidISO8601 (dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return false
    }
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/
    if (!iso8601Regex.test(dateString)) {
      return false
    }
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  // Route log connections to appropriate handler
  async handleLogConnection (ws, req, token, transaction) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const pathParts = url.pathname.split('/').filter(p => p)

      // Check if this is an agent log connection (has sessionId in path)
      if (pathParts.includes('agent') && pathParts.includes('logs')) {
        // Extract microserviceUuid or iofogUuid and sessionId
        let microserviceUuid = null
        let iofogUuid = null
        let sessionId = null

        if (pathParts.includes('microservice')) {
          const microserviceIndex = pathParts.indexOf('microservice')
          microserviceUuid = pathParts[microserviceIndex + 1]
          sessionId = pathParts[microserviceIndex + 2]
        } else if (pathParts.includes('iofog')) {
          const iofogIndex = pathParts.indexOf('iofog')
          iofogUuid = pathParts[iofogIndex + 1]
          sessionId = pathParts[iofogIndex + 2]
        }

        if (sessionId) {
          await this.handleAgentLogsConnection(ws, req, token, microserviceUuid, iofogUuid, sessionId, transaction)
        } else {
          ws.close(1008, 'Missing sessionId in agent log connection')
        }
      } else {
        // User log connection
        let microserviceUuid = null
        let fogUuid = null
        let expectSystem = false

        // Check for system microservice logs first (more specific)
        if (pathParts.includes('microservices') && pathParts.includes('system')) {
          const microserviceIndex = pathParts.indexOf('microservices')
          const systemIndex = pathParts.indexOf('system')
          // Path: api, v3, microservices, system, uuid, logs
          if (systemIndex === microserviceIndex + 1) {
            microserviceUuid = pathParts[systemIndex + 1]
            expectSystem = true
          }
        } else if (pathParts.includes('microservices')) {
          const microserviceIndex = pathParts.indexOf('microservices')
          microserviceUuid = pathParts[microserviceIndex + 1]
          expectSystem = false
        } else if (pathParts.includes('iofog')) {
          const iofogIndex = pathParts.indexOf('iofog')
          fogUuid = pathParts[iofogIndex + 1]
        }

        await this.handleUserLogsConnection(ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction)
      }
    } catch (error) {
      logger.error('Error in handleLogConnection:', error)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1008, error.message || 'Connection error')
      }
    }
  }

  async validateUserLogsConnection (token, microserviceUuid, fogUuid, expectSystem, transaction) {
    try {
      // 1. Basic token validation
      if (!token || !token.replace) {
        throw new Errors.AuthenticationError('Missing or invalid authorization token')
      }

      const bearerToken = token.replace('Bearer ', '')
      if (!bearerToken) {
        throw new Errors.AuthenticationError('Missing or invalid authorization token')
      }

      // 2. Validate resource existence
      if (microserviceUuid) {
        // Validate microservice and check if it matches expected system type
        await this.validateMicroservice(microserviceUuid, expectSystem, transaction)

        const statusArr = await MicroserviceStatusManager.findAllExcludeFields({
          microserviceUuid
        }, transaction)
        if (!statusArr || statusArr.length === 0) {
          throw new Errors.NotFoundError('Microservice status not found')
        }
        const status = statusArr[0]
        if (status.status !== microserviceState.RUNNING) {
          throw new Errors.ValidationError('Microservice is not running')
        }
      }

      if (fogUuid) {
        const fog = await this.validateFog(fogUuid, transaction)
        if (fog.daemonStatus !== FogStates.RUNNING) {
          throw new Errors.ValidationError('Fog is not running')
        }
      }

      // 3. RBAC Authorization is handled at route level, so we just validate resources here
      // Validation successful
      return { success: true }
    } catch (error) {
      logger.error('User logs connection validation failed:', {
        error: error.message,
        stack: error.stack,
        microserviceUuid,
        fogUuid,
        expectSystem
      })
      throw error
    }
  }

  async handleUserLogsConnection (ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction) {
    try {
      this.ensureSocketPongHandler(ws)

      // 1. Validate user authentication
      await this.validateUserLogsConnection(token, microserviceUuid, fogUuid, expectSystem, transaction)

      // 2. Parse tail configuration from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`)

      const tailConfig = this.parseLogTailConfig(url, ws)
      if (!tailConfig) {
        return
      }

      // Validate ISO 8601 format for since/until (if provided)
      if (tailConfig.since && !this.isValidISO8601(tailConfig.since)) {
        ws.close(1008, 'Invalid since format. Expected ISO 8601.')
        return
      }
      if (tailConfig.until && !this.isValidISO8601(tailConfig.until)) {
        ws.close(1008, 'Invalid until format. Expected ISO 8601.')
        return
      }

      // Enforce max concurrent log sessions per resource (R82)
      const logConcurrencyLimit = this.getLogConcurrencyLimit()
      const existingLogCount = await this.countLogSessionsInDb(microserviceUuid, fogUuid, transaction)
      if (existingLogCount >= logConcurrencyLimit) {
        ws.close(1008, `Maximum of ${logConcurrencyLimit} concurrent log sessions allowed for this resource.`)
        return
      }

      // 3. Generate unique sessionId for this user session
      const sessionId = AppHelper.generateUUID()
      const logSessionId = fogUuid ? `logs-${fogUuid}` : `logs-${microserviceUuid}`

      // 4. Create log session in database (no HTTP POST needed!)
      if (microserviceUuid) {
        await MicroserviceLogStatusManager.create({
          microserviceUuid,
          logSessionId,
          sessionId, // Unique per user session
          status: 'PENDING',
          tailConfig: JSON.stringify(tailConfig),
          agentConnected: false,
          userConnected: true
        }, transaction)
      } else if (fogUuid) {
        await FogLogStatusManager.create({
          iofogUuid: fogUuid,
          logSessionId,
          sessionId, // Unique per user session
          status: 'PENDING',
          tailConfig: JSON.stringify(tailConfig),
          agentConnected: false,
          userConnected: true
        }, transaction)
      }

      // 5. Trigger change tracking (notify agent of new session)
      let fogUuidForTracking = fogUuid
      if (!fogUuidForTracking && microserviceUuid) {
        const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
        if (!microservice) {
          throw new Error(`Microservice not found: ${microserviceUuid}`)
        }
        fogUuidForTracking = microservice.iofogUuid
      }

      if (!fogUuidForTracking) {
        throw new Error('Unable to determine fog UUID for change tracking')
      }

      const fog = await FogManager.findOne({
        uuid: fogUuidForTracking
      }, transaction)

      if (!fog) {
        throw new Error(`Fog not found: ${fogUuidForTracking}`)
      }

      await ChangeTrackingService.update(
        fog.uuid,
        fogUuid ? ChangeTrackingService.events.fogLogs : ChangeTrackingService.events.microserviceLogs,
        transaction
      )

      logger.debug('Change tracking updated for log session:' + JSON.stringify({
        fogUuid: fog.uuid,
        microserviceUuid,
        eventType: microserviceUuid ? 'microserviceLogs' : 'fogLogs',
        sessionId
      }))

      // 6. Create in-memory session (one-to-one: user only, waiting for agent)
      const logSession = this.logSessionManager.createLogSession(
        sessionId,
        microserviceUuid,
        fogUuid,
        null, // Agent not connected yet
        ws, // User connected
        tailConfig,
        transaction
      )
      logSession.metricsActive = true
      recordLogSessionActive(1)

      // 7. Send sessionId to user (MessagePack encoded)
      const sessionInfoMsg = {
        type: MESSAGE_TYPES.LOG_START,
        data: Buffer.from(JSON.stringify({
          sessionId,
          tailConfig
        })),
        sessionId,
        timestamp: Date.now()
      }
      ws.send(this.encodeMessage(sessionInfoMsg), { binary: true })

      // 8. Send waiting message to user (agent not connected yet)
      try {
        const waitingMsg = {
          type: MESSAGE_TYPES.LOG_LINE,
          data: Buffer.from('Waiting for agent connection. Log streaming will begin once the agent connects.\n'),
          sessionId,
          timestamp: Date.now(),
          microserviceUuid: microserviceUuid || null,
          iofogUuid: fogUuid || null
        }
        ws.send(this.encodeMessage(waitingMsg), { binary: true })
        logger.info('Sent waiting status message to user for log session:' + JSON.stringify({
          sessionId,
          microserviceUuid,
          fogUuid
        }))
      } catch (error) {
        logger.warn('Failed to send waiting status message to user:' + JSON.stringify({
          error: error.message,
          sessionId
        }))
      }

      // 9. Setup message forwarding (will be activated when agent connects)
      await this.setupLogMessageForwarding(sessionId, transaction)

      // Pending timeout: close if agent does not connect within logPendingTimeoutMs
      const LOG_PENDING_TIMEOUT = this.getLogPendingTimeoutMs()
      const pendingTimer = setTimeout(async () => {
        const session = this.logSessionManager.getLogSession(sessionId)
        if (!session || session.agent) {
          return
        }
        logger.warn('Log session pending timeout:' + JSON.stringify({
          sessionId,
          microserviceUuid,
          fogUuid,
          timeout: LOG_PENDING_TIMEOUT
        }))
        try {
          if (ws.readyState === WebSocket.OPEN) {
            const timeoutMsg = {
              type: MESSAGE_TYPES.LOG_LINE,
              data: Buffer.from('Timeout waiting for agent connection.\n'),
              sessionId,
              timestamp: Date.now(),
              microserviceUuid: microserviceUuid || null,
              iofogUuid: fogUuid || null
            }
            ws.send(this.encodeMessage(timeoutMsg), { binary: true })
            ws.close(1008, 'Timeout waiting for agent connection')
          }
        } catch (error) {
          logger.warn('Failed to close log session on pending timeout:' + error.message)
        }
        try {
          await TransactionDecorator.generateTransaction(async (timeoutTransaction) => {
            await this.logSessionManager.removeLogSession(sessionId, timeoutTransaction)
          })()
        } catch (error) {
          logger.error('Failed to remove log session after pending timeout:' + error.message)
        }
      }, LOG_PENDING_TIMEOUT)

      // 10. Record WebSocket connection event (non-blocking)
      setImmediate(async () => {
        try {
          // Extract actorId from token (req.kauth not available for WebSocket connections)
          let actorId = null
          if (req.headers && req.headers.authorization) {
            actorId = EventService.extractUsernameFromToken(req.headers.authorization)
          }
          await EventService.createWsConnectEvent({
            timestamp: Date.now(),
            endpointType: 'user',
            actorId,
            path: req.url,
            resourceId: microserviceUuid || fogUuid,
            ipAddress: EventService.extractIPv4Address(req) || null
          })
        } catch (err) {
          logger.error('Failed to create WS_CONNECT event for user log session (non-blocking):', err)
        }
      })

      // Handle user disconnect
      ws.on('close', async (code, reason) => {
        clearTimeout(pendingTimer)
        const session = this.logSessionManager.getLogSession(sessionId)
        if (session) {
          session.user = null
          session.lastActivity = Date.now()

          try {
            await TransactionDecorator.generateTransaction(async (closeTransaction) => {
              if (microserviceUuid) {
                await MicroserviceLogStatusManager.update(
                  { sessionId },
                  { userConnected: false },
                  closeTransaction
                )
              } else if (fogUuid) {
                await FogLogStatusManager.update(
                  { sessionId },
                  { userConnected: false },
                  closeTransaction
                )
              }

              if (!session.agent) {
                await this.logSessionManager.removeLogSession(sessionId, closeTransaction)
              } else {
                const fogForTracking = await FogManager.findOne({
                  uuid: fogUuid || (await MicroserviceManager.findOne({ uuid: microserviceUuid }, closeTransaction)).iofogUuid
                }, closeTransaction)
                await ChangeTrackingService.update(
                  fogForTracking.uuid,
                  fogUuid ? ChangeTrackingService.events.fogLogs : ChangeTrackingService.events.microserviceLogs,
                  closeTransaction
                )
              }
            })()
          } catch (err) {
            logger.error('Failed to cleanup log session on user disconnect:' + JSON.stringify({
              error: err.message,
              sessionId
            }))
          }
        }

        // Record WebSocket disconnection event (non-blocking)
        setImmediate(async () => {
          try {
            // Extract actorId from token (req.kauth not available for WebSocket connections)
            let actorId = null
            if (req.headers && req.headers.authorization) {
              actorId = EventService.extractUsernameFromToken(req.headers.authorization)
            }
            await EventService.createWsDisconnectEvent({
              timestamp: Date.now(),
              endpointType: 'user',
              actorId,
              path: req.url,
              resourceId: microserviceUuid || fogUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event for user log session (non-blocking):', err)
          }
        })
      })
    } catch (error) {
      logger.error('User logs connection error:', error)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1008, error.message)
      }
    }
  }

  async handleAgentLogsConnection (ws, req, token, microserviceUuid, iofogUuid, sessionId, transaction) {
    try {
      this.ensureSocketPongHandler(ws)

      // 1. Validate agent token and resource (microservice or fog)
      await this.validateAgentLogsConnection(token, microserviceUuid, iofogUuid, sessionId, transaction)

      // 2. Get session from database (by sessionId)
      let logStatus = null
      if (microserviceUuid) {
        logStatus = await MicroserviceLogStatusManager.findOne(
          { sessionId },
          transaction
        )
      } else if (iofogUuid) {
        logStatus = await FogLogStatusManager.findOne(
          { sessionId },
          transaction
        )
      }

      if (!logStatus) {
        logger.error('Agent connected to non-existent session:', sessionId)
        ws.close(1008, 'Session not found')
        return
      }

      // Validate sessionId belongs to correct resource
      if (microserviceUuid && logStatus.microserviceUuid !== microserviceUuid) {
        logger.error('Session does not belong to microservice:', { sessionId, microserviceUuid, logStatusMicroserviceUuid: logStatus.microserviceUuid })
        ws.close(1008, 'Session mismatch')
        return
      }
      if (iofogUuid && logStatus.iofogUuid !== iofogUuid) {
        logger.error('Session does not belong to fog:', { sessionId, iofogUuid, logStatusIofogUuid: logStatus.iofogUuid })
        ws.close(1008, 'Session mismatch')
        return
      }

      // 3. Parse tail config from database
      const tailConfig = JSON.parse(logStatus.tailConfig)

      // 4. Update database
      if (microserviceUuid) {
        await MicroserviceLogStatusManager.update(
          { sessionId },
          { agentConnected: true, status: 'ACTIVE' },
          transaction
        )
      } else if (iofogUuid) {
        await FogLogStatusManager.update(
          { sessionId },
          { agentConnected: true, status: 'ACTIVE' },
          transaction
        )
      }

      // 5. Get or create in-memory session
      let session = this.logSessionManager.getLogSession(sessionId)
      if (!session) {
        // Session might be on different replica, create it
        if (!(await this.requireRelayForCrossReplica(ws))) {
          return
        }
        session = this.logSessionManager.createLogSession(
          sessionId,
          logStatus.microserviceUuid,
          logStatus.iofogUuid,
          ws, // Agent
          null, // User (might be on different replica)
          tailConfig,
          transaction
        )
        session.metricsActive = true
        recordLogSessionActive(1)
      } else {
        session.agent = ws
        session.lastActivity = Date.now()
      }

      // 5.5. Set up message handler IMMEDIATELY on the agent WebSocket
      // This ensures messages are captured even if they arrive before setupLogMessageForwarding completes
      // Critical for microservice logs which may have timing issues
      ws.removeAllListeners('message')
      ws.on('message', async (data, isBinary) => {
        if (!isBinary) {
          logger.warn('Received non-binary message from agent, expected MessagePack')
          return
        }

        // Decode MessagePack (same as exec sessions)
        const buffer = Buffer.from(data)
        let msg
        try {
          msg = this.decodeMessage(buffer) // MessagePack decode
        } catch (error) {
          logger.error('Failed to decode MessagePack from agent (direct handler):' + JSON.stringify({
            error: error.message,
            sessionId,
            bufferLength: buffer.length
          }))
          return
        }

        logger.debug('Received log message from agent (direct handler):' + JSON.stringify({
          sessionId,
          type: msg.type,
          hasData: !!msg.data,
          dataLength: msg.data ? msg.data.length : 0
        }))

        if (msg.type === MESSAGE_TYPES.LOG_LINE) {
          // Forward to user (one-to-one, like exec sessions)
          await this.forwardLogToUser(sessionId, buffer, transaction)
        } else if (msg.type === MESSAGE_TYPES.LOG_START ||
                 msg.type === MESSAGE_TYPES.LOG_STOP ||
                 msg.type === MESSAGE_TYPES.LOG_ERROR) {
          // Handle control messages
          await this.forwardLogToUser(sessionId, buffer, transaction)
        }
      })

      logger.debug('Set up direct message handler on agent WebSocket:' + JSON.stringify({
        sessionId,
        microserviceUuid: logStatus.microserviceUuid,
        iofogUuid: logStatus.iofogUuid,
        agentState: ws.readyState
      }))

      // 6. Send tail config to agent (so agent knows what to stream)
      const configMsg = {
        type: MESSAGE_TYPES.LOG_START,
        data: Buffer.from(JSON.stringify({
          sessionId,
          tailConfig
        })),
        sessionId,
        timestamp: Date.now()
      }
      ws.send(this.encodeMessage(configMsg), { binary: true })

      // 7. Notify user that agent has connected and streaming has started
      if (session.user && session.user.readyState === WebSocket.OPEN) {
        try {
          const agentConnectedMsg = {
            type: MESSAGE_TYPES.LOG_START,
            data: Buffer.from(JSON.stringify({
              sessionId,
              message: 'Agent connected. Log streaming started.\n'
            })),
            sessionId,
            timestamp: Date.now()
          }
          session.user.send(this.encodeMessage(agentConnectedMsg), { binary: true })
          logger.info('Notified user that agent connected for log session:' + JSON.stringify({
            sessionId,
            microserviceUuid: logStatus.microserviceUuid,
            iofogUuid: logStatus.iofogUuid
          }))
        } catch (error) {
          logger.warn('Failed to notify user that agent connected:' + JSON.stringify({
            error: error.message,
            sessionId
          }))
        }
      }

      // 8. Setup message forwarding (unidirectional: agent → user, one-to-one)
      await this.setupLogMessageForwarding(sessionId, transaction)

      // 9. Record WebSocket connection event (non-blocking)
      setImmediate(async () => {
        try {
          // Extract actorId from token (fog UUID from JWT sub field)
          const authHeader = req.headers.authorization
          let actorId = null
          if (authHeader) {
            const [scheme, token] = authHeader.split(' ')
            if (scheme.toLowerCase() === 'bearer' && token) {
              try {
                const tokenParts = token.split('.')
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                  actorId = payload.sub || null
                }
              } catch (err) {
                // Ignore token parsing errors
              }
            }
          }
          await EventService.createWsConnectEvent({
            timestamp: Date.now(),
            endpointType: 'agent',
            actorId,
            path: req.url,
            resourceId: microserviceUuid || iofogUuid,
            ipAddress: EventService.extractIPv4Address(req) || null
          })
        } catch (err) {
          logger.error('Failed to create WS_CONNECT event for agent log session (non-blocking):', err)
        }
      })

      // Handle agent disconnect
      ws.on('close', async (code, reason) => {
        const session = this.logSessionManager.getLogSession(sessionId)
        if (session) {
          session.agent = null
          session.lastActivity = Date.now()

          try {
            await TransactionDecorator.generateTransaction(async (closeTransaction) => {
              if (microserviceUuid) {
                await MicroserviceLogStatusManager.update(
                  { sessionId },
                  { agentConnected: false },
                  closeTransaction
                )
              } else if (iofogUuid) {
                await FogLogStatusManager.update(
                  { sessionId },
                  { agentConnected: false },
                  closeTransaction
                )
              }

              if (!session.user) {
                await this.logSessionManager.removeLogSession(sessionId, closeTransaction)
              } else {
                const fog = await FogManager.findOne({
                  uuid: iofogUuid || logStatus.iofogUuid || (await MicroserviceManager.findOne({ uuid: logStatus.microserviceUuid }, closeTransaction)).iofogUuid
                }, closeTransaction)
                await ChangeTrackingService.update(
                  fog.uuid,
                  iofogUuid ? ChangeTrackingService.events.fogLogs : ChangeTrackingService.events.microserviceLogs,
                  closeTransaction
                )
              }
            })()
          } catch (err) {
            logger.error('Failed to cleanup log session on agent disconnect:' + JSON.stringify({
              error: err.message,
              sessionId
            }))
          }
        }

        // Record WebSocket disconnection event (non-blocking)
        setImmediate(async () => {
          try {
            // Extract actorId from token (fog UUID from JWT sub field)
            const authHeader = req.headers.authorization
            let actorId = null
            if (authHeader) {
              const [scheme, token] = authHeader.split(' ')
              if (scheme.toLowerCase() === 'bearer' && token) {
                try {
                  const tokenParts = token.split('.')
                  if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                    actorId = payload.sub || null
                  }
                } catch (err) {
                  // Ignore token parsing errors
                }
              }
            }
            await EventService.createWsDisconnectEvent({
              timestamp: Date.now(),
              endpointType: 'agent',
              actorId,
              path: req.url,
              resourceId: microserviceUuid || iofogUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event for agent log session (non-blocking):', err)
          }
        })
      })
    } catch (error) {
      logger.error('Agent logs connection error:', error)
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1008, error.message)
      }
    }
  }

  async setupLogMessageForwarding (sessionId, transaction) {
    const session = this.logSessionManager.getLogSession(sessionId)
    if (!session) {
      logger.warn('setupLogMessageForwarding: Session not found:' + JSON.stringify({ sessionId }))
      return
    }

    // Enable queue bridge for cross-replica support (one-to-one, like exec sessions)
    await this.relayTransport.enableForLogSession(session, (sessionId) => {
      this.cleanupLogSession(sessionId, transaction)
    })

    // ONLY agent → user forwarding (unidirectional, one-to-one)
    // All messages from agent are MessagePack encoded (binary)
    if (session.agent) {
      // Remove any existing message handlers to avoid duplicates (like exec sessions)
      session.agent.removeAllListeners('message')

      logger.debug('Setting up agent message handler for log session:' + JSON.stringify({
        sessionId,
        microserviceUuid: session.microserviceUuid,
        fogUuid: session.fogUuid,
        agentState: session.agent.readyState,
        userState: session.user ? session.user.readyState : 'N/A'
      }))

      session.agent.on('message', async (data, isBinary) => {
        if (!isBinary) {
          logger.warn('Received non-binary message from agent, expected MessagePack')
          return
        }

        // Decode MessagePack (same as exec sessions)
        const buffer = Buffer.from(data)
        let msg
        try {
          msg = this.decodeMessage(buffer) // MessagePack decode
        } catch (error) {
          logger.error('Failed to decode MessagePack from agent:' + JSON.stringify({
            error: error.message,
            sessionId,
            bufferLength: buffer.length
          }))
          return
        }

        logger.debug('Received log message from agent:' + JSON.stringify({
          sessionId,
          type: msg.type,
          hasData: !!msg.data,
          dataLength: msg.data ? msg.data.length : 0
        }))

        if (msg.type === MESSAGE_TYPES.LOG_LINE) {
          // Forward to user (one-to-one, like exec sessions)
          await this.forwardLogToUser(sessionId, buffer, transaction)
        } else if (msg.type === MESSAGE_TYPES.LOG_START ||
                 msg.type === MESSAGE_TYPES.LOG_STOP ||
                 msg.type === MESSAGE_TYPES.LOG_ERROR) {
          // Handle control messages
          await this.forwardLogToUser(sessionId, buffer, transaction)
        }
      })
    } else {
      logger.debug('setupLogMessageForwarding: Agent not connected yet:' + JSON.stringify({
        sessionId,
        microserviceUuid: session.microserviceUuid,
        fogUuid: session.fogUuid
      }))
    }

    // NO user → agent forwarding needed!
    // Users are read-only
  }

  _shouldDropLogLineForBackpressure (session, sessionId) {
    const user = session && session.user
    if (!user || user.readyState !== WebSocket.OPEN) {
      return true
    }
    if (user.bufferedAmount <= LOG_BACKPRESSURE_BUFFER_BYTES) {
      return false
    }

    // drop LOG_LINE under backpressure; emit LOG_ERROR once per episode.
    if (!this.logBackpressureNotified.has(sessionId)) {
      this.logBackpressureNotified.add(sessionId)
      try {
        const errorMsg = this.encodeMessage({
          type: MESSAGE_TYPES.LOG_ERROR,
          data: Buffer.from('Log stream backpressure: dropping lines until client catches up\n'),
          sessionId,
          timestamp: Date.now(),
          microserviceUuid: session.microserviceUuid || null,
          iofogUuid: session.fogUuid || null
        })
        user.send(errorMsg, { binary: true })
      } catch (error) {
        logger.debug('Failed to notify user of log backpressure', { sessionId, error: error.message })
      }
    }
    return true
  }

  async forwardLogToUser (sessionId, buffer, transaction) {
    const session = this.logSessionManager.getLogSession(sessionId)
    if (!session) {
      logger.warn('forwardLogToUser: Session not found:' + JSON.stringify({ sessionId }))
      return
    }

    // Buffer is already MessagePack encoded from agent
    // Following exec session pattern: Use queue for ALL scenarios (single and multi-replica)
    // One-to-one forwarding (agent → user) via queue
    const useRelay = this.relayTransport.shouldUseRelayForLogs(sessionId)
    logger.debug('forwardLogToUser:' + JSON.stringify({
      sessionId,
      useRelay,
      hasUser: !!session.user,
      userState: session.user ? session.user.readyState : 'N/A',
      bufferLength: buffer.length
    }))

    if (useRelay) {
      // Publish MessagePack encoded buffer to user relay
      await this.relayTransport.publishLogToUser(sessionId, buffer)
    } else {
      // Fallback: Direct WebSocket (only if queue not enabled)
      if (this._shouldDropLogLineForBackpressure(session, sessionId)) {
        logger.debug('Dropped log line due to backpressure or missing user', { sessionId })
        return
      }
      // Send MessagePack encoded buffer directly (binary)
      if (session.user && session.user.readyState === WebSocket.OPEN) {
        try {
          session.user.send(buffer, {
            binary: true, // MessagePack is binary
            compress: false,
            mask: false,
            fin: true
          })
          logger.debug('Sent log message directly to user:' + JSON.stringify({
            sessionId,
            bufferLength: buffer.length
          }))
        } catch (error) {
          logger.error('Failed to send log to user:' + JSON.stringify({
            error: error.message,
            sessionId,
            bufferLength: buffer.length
          }))
        }
      } else {
        logger.warn('Cannot send log to user - user not connected:' + JSON.stringify({
          sessionId,
          userState: session.user ? session.user.readyState : 'N/A'
        }))
      }
    }
  }

  async cleanupLogSession (sessionId, transaction) {
    const session = this.logSessionManager.getLogSession(sessionId)
    if (session && session.metricsActive) {
      recordLogSessionActive(-1)
    }
    this.logBackpressureNotified.delete(sessionId)
    await this.logSessionManager.removeLogSession(sessionId, transaction)
    await this.relayTransport.cleanupLogSession(sessionId)
  }

  async setupExecMessageForwarding (sessionId, transaction) {
    const session = this.execSessionManager.getExecSession(sessionId)
    if (!session) {
      logger.warn('setupExecMessageForwarding: Session not found:' + JSON.stringify({ sessionId }))
      return
    }

    const { agent, user } = session
    const execId = sessionId
    const wasQueueBridgeEnabled = session.queueBridgeEnabled

    try {
      await this.relayTransport.enableForSession(session, async (closeExecId) => {
        const timeout = this.pendingCloseTimeouts.get(closeExecId)
        if (timeout) {
          clearTimeout(timeout)
          this.pendingCloseTimeouts.delete(closeExecId)
        }
        await this.cleanupExecSession(closeExecId, transaction)
      })
      session.queueBridgeEnabled = true
      if (!wasQueueBridgeEnabled) {
        logger.info('[RELAY] Relay bridge enabled for exec session', {
          sessionId,
          microserviceUuid: session.microserviceUuid,
          transport: this.relayTransport.getTransport()
        })
      }
    } catch (error) {
      session.queueBridgeEnabled = false
      const requireQueue = this.isCrossReplicaSession(session) &&
        this.haConfig.failFastOnRouterUnavailable !== false
      if (requireQueue && !wasQueueBridgeEnabled) {
        logger.error('[RELAY] Relay required for cross-replica exec session but bridge failed', {
          sessionId,
          transport: this.relayTransport.getTransport(),
          error: error.message
        })
        if (session.user && session.user.readyState === WebSocket.OPEN) {
          session.user.close(RELAY_UNAVAILABLE_CLOSE_CODE, RELAY_UNAVAILABLE_CLOSE_REASON)
        }
        if (session.agent && session.agent.readyState === WebSocket.OPEN) {
          session.agent.close(RELAY_UNAVAILABLE_CLOSE_CODE, RELAY_UNAVAILABLE_CLOSE_REASON)
        }
        await this.cleanupExecSession(sessionId, transaction)
        return
      }
      logger.warn('[RELAY] Failed to enable relay bridge for exec session', {
        sessionId,
        transport: this.relayTransport.getTransport(),
        error: error.message
      })
    }

    if (user && agent) {
      const activated = await this.sendExecActivationToExecSession(session, sessionId, transaction)
      if (!activated) {
        logger.error('[RELAY] Exec session activation failed; aborting message forwarding setup', {
          sessionId,
          microserviceUuid: session.microserviceUuid
        })
        return
      }
    }

    if (user) {
      user.removeAllListeners('message')
    }
    if (agent) {
      agent.removeAllListeners('message')
    }

    if (user) {
      user.on('message', async (data, isBinary) => {
        if (!isBinary) {
          const text = data.toString()
          const msg = {
            type: MESSAGE_TYPES.STDIN,
            data: Buffer.from(text + '\n'),
            microserviceUuid: session.microserviceUuid,
            execId,
            sessionId,
            timestamp: Date.now()
          }
          const sent = await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)
          if (!sent && this.relayTransport.shouldUseRelay(execId)) {
            logger.error('[RELAY] Exec relay publish failed; closing session', { sessionId: execId })
            await this.cleanupExecSession(execId, transaction)
          }
          return
        }

        const buffer = Buffer.from(data)
        try {
          const msg = this.decodeMessage(buffer)
          if (!msg.microserviceUuid) msg.microserviceUuid = session.microserviceUuid
          if (!msg.execId) msg.execId = execId
          if (!msg.sessionId) msg.sessionId = sessionId
          if (!msg.timestamp) msg.timestamp = Date.now()

          if (msg.type === MESSAGE_TYPES.CLOSE) {
            await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)

            const relayEnabled = this.relayTransport.shouldUseRelay(execId)
            if (relayEnabled) {
              const timeout = setTimeout(async () => {
                const currentSession = this.execSessionManager.getExecSession(execId)
                if (currentSession && currentSession.user && currentSession.user.readyState === WebSocket.OPEN) {
                  try {
                    currentSession.user.close(1000, 'Session closed (timeout)')
                    await this.cleanupExecSession(execId, transaction)
                  } catch (error) {
                    logger.error('[RELAY] Failed to close exec user socket on CLOSE timeout', {
                      sessionId: execId,
                      error: error.message
                    })
                  }
                }
                this.pendingCloseTimeouts.delete(execId)
              }, this.config.closeResponseTimeout)
              this.pendingCloseTimeouts.set(execId, timeout)
              return
            }

            if (user && user.readyState === WebSocket.OPEN) {
              user.close(1000, 'Session closed')
            }
            await this.cleanupExecSession(execId, transaction)
            return
          }

          if (msg.type === MESSAGE_TYPES.CONTROL) {
            const controlData = msg.data.toString()
            if (controlData === 'keepalive') {
              const keepAliveResponse = {
                type: MESSAGE_TYPES.CONTROL,
                data: Buffer.from('keepalive'),
                microserviceUuid: session.microserviceUuid,
                execId,
                sessionId,
                timestamp: Date.now()
              }
              user.send(this.encodeMessage(keepAliveResponse), { binary: true })
              return
            }
          }

          const sent = await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)
          if (!sent && this.relayTransport.shouldUseRelay(execId)) {
            logger.error('[RELAY] Exec relay publish failed; closing session', { sessionId: execId })
            await this.cleanupExecSession(execId, transaction)
          }
        } catch (error) {
          logger.error('[RELAY] Failed to process exec user message:' + JSON.stringify({
            sessionId: execId,
            error: error.message
          }))
        }
      })
    }

    if (agent) {
      agent.on('message', async (data, isBinary) => {
        if (!isBinary) {
          logger.warn('[RELAY] Received non-binary message from exec agent, expected MessagePack')
          return
        }

        try {
          const buffer = Buffer.from(data)
          const msg = this.decodeMessage(buffer)

          if (msg.type === MESSAGE_TYPES.CLOSE) {
            const relayEnabled = this.relayTransport.shouldUseRelay(execId)
            if (relayEnabled) {
              try {
                await this.relayTransport.publishToUser(execId, buffer, { messageType: MESSAGE_TYPES.CLOSE })
              } catch (error) {
                logger.error('[RELAY] Failed to enqueue exec CLOSE for user', {
                  sessionId: execId,
                  error: error.message
                })
              }
            } else if (session.user && session.user.readyState === WebSocket.OPEN) {
              session.user.close(1000, 'Agent closed connection')
            }
            await this.cleanupExecSession(execId, transaction)
            return
          }

          const relayEnabled = this.relayTransport.shouldUseRelay(execId)
          if (relayEnabled) {
            try {
              await this.relayTransport.publishToUser(execId, buffer)
            } catch (error) {
              logger.error('[RELAY] Exec relay publish to user failed; closing session', {
                sessionId: execId,
                error: error.message
              })
              await this.cleanupExecSession(execId, transaction)
            }
          } else if (session.user && session.user.readyState === WebSocket.OPEN) {
            if (msg.type === MESSAGE_TYPES.STDOUT || msg.type === MESSAGE_TYPES.STDERR) {
              if (msg.data && msg.data.length > 0) {
                const userMsg = {
                  type: msg.type,
                  data: msg.data,
                  microserviceUuid: session.microserviceUuid,
                  execId,
                  sessionId,
                  timestamp: Date.now()
                }
                session.user.send(this.encodeMessage(userMsg), { binary: true })
              }
            } else if (msg.type === MESSAGE_TYPES.CONTROL) {
              session.user.send(data, { binary: true })
            }
          }
        } catch (error) {
          logger.error('[RELAY] Failed to process exec agent message:' + JSON.stringify({
            sessionId: execId,
            error: error.message
          }))
        }
      })
    }

    logger.info('[RELAY] Exec message forwarding setup complete:' + JSON.stringify({
      sessionId,
      microserviceUuid: session.microserviceUuid,
      agentConnected: !!agent,
      userConnected: !!user
    }))
  }

  async cleanupExecSession (sessionId, transaction) {
    const session = this.execSessionManager.getExecSession(sessionId)
    if (session && session.metricsActive) {
      recordExecSessionActive(-1)
      session.metricsActive = false
    }

    const timeout = this.pendingCloseTimeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.pendingCloseTimeouts.delete(sessionId)
    }

    if (session && session.agent && session.agent.readyState === WebSocket.OPEN) {
      const closeMsg = {
        type: MESSAGE_TYPES.CLOSE,
        execId: sessionId,
        sessionId,
        microserviceUuid: session.microserviceUuid,
        timestamp: Date.now(),
        data: Buffer.from('Session closed')
      }
      try {
        session.agent.send(this.encodeMessage(closeMsg), { binary: true })
      } catch (error) {
        logger.warn('[RELAY] Failed to send CLOSE to agent during exec session cleanup', {
          sessionId,
          error: error.message
        })
      }
    }

    await this.execSessionManager.removeExecSession(sessionId, transaction)
    await this.relayTransport.cleanup(sessionId)
      .catch(error => {
        logger.warn('[RELAY] Failed to cleanup exec queue bridge during session cleanup', {
          sessionId,
          error: error.message
        })
      })
  }
}

module.exports = WebSocketServer

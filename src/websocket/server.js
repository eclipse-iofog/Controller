const WebSocket = require('ws')
const config = require('../config')
const baseLogger = require('../logger')
const Errors = require('../helpers/errors')
const SessionManager = require('./session-manager')
const LogSessionManager = require('./log-session-manager')
const { WebSocketError } = require('./error-handler')
const MicroserviceManager = require('../data/managers/microservice-manager')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceStatusManager = require('../data/managers/microservice-status-manager')
const { microserviceState, microserviceExecState } = require('../enums/microservice-state')
const MicroserviceExecStatusManager = require('../data/managers/microservice-exec-status-manager')
const AuthDecorator = require('../decorators/authorization-decorator')
const TransactionDecorator = require('../decorators/transaction-decorator')
const msgpack = require('@msgpack/msgpack')
const WebSocketQueueService = require('../services/websocket-queue-service')
const AppHelper = require('../helpers/app-helper')
const MicroserviceLogStatusManager = require('../data/managers/microservice-log-status-manager')
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

const EventService = require('../services/event-service')

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
    this.sessionManager = new SessionManager(config.get('server.webSocket'))
    this.logSessionManager = new LogSessionManager(config.get('server.webSocket'))
    this.queueService = WebSocketQueueService
    this.pendingCloseTimeouts = new Map() // Track pending CLOSE messages in cross-replica scenarios
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
      // Ensure we're only encoding the actual message content
      const encoded = msgpack.encode(message)
      logger.debug('Encoded MessagePack message:' + JSON.stringify({
        type: typeof message,
        isMap: message instanceof Map,
        keys: message instanceof Map ? Array.from(message.keys()) : Object.keys(message),
        hasExecId: message instanceof Map ? message.has('execId') : 'execId' in message,
        hasMicroserviceUuid: message instanceof Map ? message.has('microserviceUuid') : 'microserviceUuid' in message,
        encodedLength: encoded.length,
        firstBytes: encoded.subarray(0, 16).toString('hex')
      }))
      return encoded
    } catch (error) {
      logger.error('Failed to encode message:' + JSON.stringify({
        error: error.message,
        message: message
      }))
      throw new WebSocketError(1008, 'Message encoding failed')
    }
  }

  decodeMessage (buffer) {
    try {
      const decoded = msgpack.decode(buffer)
      logger.debug('Decoded MessagePack message:' + JSON.stringify({
        type: typeof decoded,
        isMap: decoded instanceof Map,
        keys: decoded instanceof Map ? Array.from(decoded.keys()) : Object.keys(decoded),
        hasExecId: decoded instanceof Map ? decoded.has('execId') : 'execId' in decoded,
        hasMicroserviceUuid: decoded instanceof Map ? decoded.has('microserviceUuid') : 'microserviceUuid' in decoded,
        bufferLength: buffer.length,
        firstBytes: buffer.subarray(0, 16).toString('hex')
      }))
      return decoded
    } catch (error) {
      logger.error('Failed to decode MessagePack message:' + JSON.stringify({
        error: error.message,
        bufferLength: buffer.length,
        firstBytes: buffer.subarray(0, 16).toString('hex')
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

    logger.info('Initializing WebSocket server with strict options:' + JSON.stringify(options))
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
      // Note: Connection logging moved to after successful authorization in handleConnection
      // This ensures we only log connections that pass RBAC checks

      // Set strict WebSocket options for this connection
      ws.binaryType = 'arraybuffer' // Force binary type to be arraybuffer

      if (ws._socket) {
        ws._socket.setNoDelay(true)
        ws._socket.setKeepAlive(true, 30000) // Enable keep-alive instead of disabling
      }

      // Add detailed frame-level logging
      ws.on('message', (data, isBinary) => {
        const buffer = Buffer.from(data)
        logger.debug('WebSocket frame received:' + JSON.stringify({
          isBinary,
          length: buffer.length,
          firstBytes: buffer.subarray(0, 16).toString('hex'),
          lastBytes: buffer.subarray(-16).toString('hex'),
          url: req.url
        }))
      })

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

    this.sessionManager.startCleanup()
  }

  async verifyClient (info, callback) {
    try {
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

      callback(null, true)
    } catch (error) {
      callback(new Error('Internal server error'), false)
    }
  }

  extractMicroserviceUuid (url) {
    // Match UUID pattern in the URL
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const match = url.match(uuidPattern)
    return match ? match[0] : null
  }

  handleConnection (ws, req) {
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
        return
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
            const microserviceUuid = this.extractMicroserviceUuid(req.url)
            if (microserviceUuid) {
              await MicroserviceExecStatusManager.update(
                { microserviceUuid: microserviceUuid },
                { execSessionId: '', status: microserviceExecState.INACTIVE },
                transaction
              )
              await MicroserviceManager.update({ uuid: microserviceUuid }, { execEnabled: false }, transaction)
            }
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
      let token = req.headers.authorization
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
      if (req.url.startsWith('/api/v3/agent/exec/')) {
        // Agent exec connection (agent routes don't use RBAC, but may come through here)
        const microserviceUuid = this.extractMicroserviceUuid(req.url)
        if (!microserviceUuid) {
          logger.error('WebSocket internal routing failed: Invalid endpoint - no UUID found')
          try {
            ws.close(1008, 'Invalid endpoint')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }
        await this.handleAgentConnection(ws, req, token, microserviceUuid, transaction)
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
        await this.handleUserConnection(ws, req, token, microserviceUuid, true, transaction) // true = expectSystem
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
        await this.handleUserConnection(ws, req, token, microserviceUuid, false, transaction) // false = not system
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
        return
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

  async handleAgentConnection (ws, req, token, microserviceUuid, transaction) {
    try {
      this.ensureSocketPongHandler(ws)
      logger.debug('[WS-CONN] Processing agent connection:' + JSON.stringify({
        url: req.url,
        microserviceUuid,
        remoteAddress: req.socket.remoteAddress
      }))

      // Set up message handler for initial message only
      const initialMessageHandler = async (data, isBinary) => {
        logger.debug('[WS-INIT] Received initial message from agent:' + JSON.stringify({
          isBinary,
          url: req.url,
          microserviceUuid
        }))

        if (!isBinary) {
          logger.error('[WS-ERROR] Expected binary message from agent')
          ws.close(1008, 'Expected binary message')
          return
        }

        const buffer = Buffer.from(data)
        logger.debug('[WS-INIT] Processing initial message from agent:' + JSON.stringify({
          isBinary,
          length: buffer.length,
          firstBytes: buffer.subarray(0, 16).toString('hex'),
          lastBytes: buffer.subarray(-16).toString('hex')
        }))

        let execMsg
        try {
          execMsg = this.decodeMessage(buffer)
          logger.info('[WS-INIT] Decoded MessagePack from agent:' + JSON.stringify(execMsg))
        } catch (err) {
          logger.error('[WS-ERROR] Failed to decode MessagePack from agent:' + JSON.stringify({
            error: err.message,
            stack: err.stack
          }))
          ws.close(1008, 'Invalid MessagePack')
          return
        }

        const { execId, microserviceUuid: msgMicroserviceUuid } = execMsg
        if (!execId || !msgMicroserviceUuid) {
          logger.error('[WS-ERROR] Agent message missing execId or microserviceUuid:' + JSON.stringify(execMsg))
          ws.close(1008, 'Missing required fields')
          return
        }

        // Remove the initial message handler
        ws.removeListener('message', initialMessageHandler)

        // Try to activate session with the execId from the message
        const session = await this.sessionManager.tryActivateSession(msgMicroserviceUuid, execId, ws, true, transaction)
        if (session) {
          logger.info('[WS-SESSION] Session activated for agent:' + JSON.stringify({
            execId,
            microserviceUuid: msgMicroserviceUuid
          }))
          // Set up message forwarding
          logger.debug('[WS-FORWARD] Setting up message forwarding:' + JSON.stringify({
            execId,
            microserviceUuid: msgMicroserviceUuid
          }))
          await this.setupMessageForwarding(execId, transaction)

          // Record WebSocket connection event (non-blocking)
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
                actorId: actorId,
                path: req.url,
                resourceId: msgMicroserviceUuid,
                ipAddress: EventService.extractIPv4Address(req) || null
              })
            } catch (err) {
              logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
            }
          })
        } else {
          this.attachPendingKeepAliveHandler(ws)
          try {
            await MicroserviceExecStatusManager.update(
              { microserviceUuid: microserviceUuid },
              { execSessionId: execId, status: microserviceExecState.PENDING },
              transaction
            )
            logger.debug('[WS-SESSION] Updated microservice exec status to PENDING', {
              execId,
              microserviceUuid: microserviceUuid
            })
          } catch (error) {
            logger.error('[WS-SESSION] Failed to update microservice exec status to PENDING', {
              execId,
              microserviceUuid: microserviceUuid,
              error: error.message,
              stack: error.stack
            })
            // Continue anyway - the in-memory state is correct
          }
          // Create session with agent only and enable queue bridge for cross-replica support
          // This allows the agent to receive messages from users on other replicas via AMQP queues
          const agentOnlySession = this.sessionManager.createSession(execId, msgMicroserviceUuid, ws, null, transaction)
          try {
            // Pass cleanup callback so queue service can notify us when CLOSE is received
            await this.queueService.enableForSession(agentOnlySession, (execId) => {
              // Clear timeout if it exists (agent responded to CLOSE)
              const timeout = this.pendingCloseTimeouts.get(execId)
              if (timeout) {
                clearTimeout(timeout)
                this.pendingCloseTimeouts.delete(execId)
                logger.debug('[WS-SESSION] Cleared pending CLOSE timeout - agent responded', { execId })
              }
              this.cleanupSession(execId, transaction)
            })
            agentOnlySession.queueBridgeEnabled = true
            logger.info('[WS-SESSION] No pending user found for agent, added to pending list and enabled queue bridge for cross-replica support:' + JSON.stringify({
              execId,
              microserviceUuid: msgMicroserviceUuid
            }))
            await this.setupMessageForwarding(execId, transaction)

            // Record WebSocket connection event for agent (non-blocking)
            // This covers the case when agent connects but no user is waiting (cross-replica or normal)
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
                  actorId: actorId,
                  path: req.url,
                  resourceId: msgMicroserviceUuid,
                  ipAddress: EventService.extractIPv4Address(req) || null
                })
              } catch (err) {
                logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
              }
            })
          } catch (error) {
            logger.warn('[WS-SESSION] Failed to enable queue bridge for pending agent, will use direct relay when user connects:', {
              execId,
              microserviceUuid: msgMicroserviceUuid,
              error: error.message
            })
            agentOnlySession.queueBridgeEnabled = false

            // Record WebSocket connection event even if queue bridge failed (non-blocking)
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
                  actorId: actorId,
                  path: req.url,
                  resourceId: msgMicroserviceUuid,
                  ipAddress: EventService.extractIPv4Address(req) || null
                })
              } catch (err) {
                logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
              }
            })
          }
        }
      }

      // Bind the message handler BEFORE validation
      ws.on('message', initialMessageHandler)

      // Now validate the connection
      const fog = await this.validateAgentConnection(token, microserviceUuid, transaction)
      logger.debug('[WS-VALIDATE] Agent connection validated:' + JSON.stringify({
        fogUuid: fog.uuid,
        microserviceUuid,
        url: req.url
      }))

      // Handle connection close
      ws.on('close', async (code, reason) => {
        // Record WebSocket disconnection event (non-blocking)
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
            await EventService.createWsDisconnectEvent({
              timestamp: Date.now(),
              endpointType: 'agent',
              actorId: actorId,
              path: req.url,
              resourceId: microserviceUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event (non-blocking):', err)
          }
        })

        for (const [execId, session] of this.sessionManager.sessions) {
          if (session.agent === ws) {
            // In cross-replica scenarios, send CLOSE message to user via queue
            // Note: session.user is null on agent's replica in cross-replica scenarios
            const queueEnabled = this.queueService.shouldUseQueue(execId)
            if (queueEnabled) {
              try {
                const closeMsg = {
                  type: MESSAGE_TYPES.CLOSE,
                  execId: execId,
                  microserviceUuid: session.microserviceUuid,
                  timestamp: Date.now(),
                  data: Buffer.from('Agent closed connection')
                }
                const encoded = this.encodeMessage(closeMsg)
                await this.queueService.publishToUser(execId, encoded, { messageType: MESSAGE_TYPES.CLOSE })
                logger.info('[WS-CLOSE] Sent CLOSE message to user via queue after agent disconnect', {
                  execId,
                  microserviceUuid: session.microserviceUuid
                })
              } catch (error) {
                logger.error('[WS-CLOSE] Failed to send CLOSE message to user via queue', {
                  execId,
                  error: error.message
                })
              }
            }
            this.cleanupSession(execId, transaction)
          }
        }
        this.sessionManager.removePendingAgent(microserviceUuid, ws)
        logger.debug('[WS-CLOSE] Agent connection closed:' + JSON.stringify({
          url: req.url,
          microserviceUuid
        }))
      })

      // Handle errors
      ws.on('error', (error) => {
        logger.error('[WS-ERROR] Agent connection error:' + JSON.stringify({
          error: error.message,
          url: req.url,
          microserviceUuid
        }))
      })
    } catch (error) {
      logger.error('[WS-ERROR] Error in handleAgentConnection:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        url: req.url,
        microserviceUuid
      }))
      if (ws.readyState === ws.OPEN) {
        ws.close(1008, error.message || 'Connection error')
      }
    }
  }

  async getPendingAgentExecIdsFromDB (microserviceUuid, transaction) {
    try {
      const pendingExecStatus = await MicroserviceExecStatusManager.findAllExcludeFields(
        {
          microserviceUuid: microserviceUuid,
          status: microserviceExecState.PENDING
        },
        transaction
      )

      const execIds = pendingExecStatus.map(status => status.execSessionId)
      logger.debug('Database query for pending agents:' + JSON.stringify({
        microserviceUuid,
        foundExecIds: execIds,
        count: execIds.length
      }))

      return execIds
    } catch (error) {
      logger.error('Failed to query database for pending agents:' + JSON.stringify({
        error: error.message,
        microserviceUuid
      }))
      return []
    }
  }

  async handleUserConnection (ws, req, token, microserviceUuid, expectSystem, transaction) {
    try {
      this.ensureSocketPongHandler(ws)
      await this.validateUserConnection(token, microserviceUuid, expectSystem, transaction)
      logger.info('User connection validated successfully for microservice:' + microserviceUuid)

      // Check if there's already an active session for this microservice
      const existingSession = Array.from(this.sessionManager.sessions.values())
        .find(session => session.microserviceUuid === microserviceUuid && session.user && session.user.readyState === WebSocket.OPEN)

      if (existingSession) {
        logger.debug('Microservice has already active exec session:' + JSON.stringify({
          microserviceUuid,
          existingExecId: existingSession.execId
        }))
        ws.close(1008, 'Microservice has already active exec session.')
        return
      }

      // Get pending agent execIds from database (multi-replica compatible)
      const pendingAgentExecIds = await this.getPendingAgentExecIdsFromDB(microserviceUuid, transaction)
      logger.info('Pending agent execIds from database:' + JSON.stringify(pendingAgentExecIds))

      // Simplified logic: find any available pending agent
      const hasPendingAgents = pendingAgentExecIds.length > 0

      if (hasPendingAgents) {
        // Find any available pending agent
        const availableExecId = pendingAgentExecIds[0]
        const pendingAgent = this.sessionManager.findPendingAgentForExecId(microserviceUuid, availableExecId)

        if (pendingAgent) {
          // Activate session using agent's execId (agent is on same replica)
          const session = this.sessionManager.tryActivateSession(microserviceUuid, availableExecId, ws, false, transaction)
          if (session) {
            logger.info('Session activated for user:', {
              execId: availableExecId,
              microserviceUuid,
              userState: ws.readyState,
              agentState: pendingAgent.readyState
            })
            await this.setupMessageForwarding(availableExecId, transaction)

            // Record WebSocket connection event (non-blocking)
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
                  actorId: actorId,
                  path: req.url,
                  resourceId: microserviceUuid,
                  ipAddress: EventService.extractIPv4Address(req) || null
                })
              } catch (err) {
                logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
              }
            })
            return
          }
        } else {
          // Agent is on a different replica - create session with just user and enable queue bridge
          // The AMQP queues will handle message relay between replicas
          logger.info('Found PENDING execId in DB but agent is on different replica, activating session with user only:', {
            execId: availableExecId,
            microserviceUuid
          })
          this.sessionManager.createSession(availableExecId, microserviceUuid, null, ws, transaction)
          await MicroserviceExecStatusManager.update(
            { microserviceUuid: microserviceUuid },
            { execSessionId: availableExecId, status: microserviceExecState.ACTIVE },
            transaction
          )
          await this.setupMessageForwarding(availableExecId, transaction)
          logger.info('Cross-replica session activated with user only:', {
            execId: availableExecId,
            microserviceUuid,
            userState: ws.readyState
          })

          // Record WebSocket connection event (non-blocking)
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
                actorId: actorId,
                path: req.url,
                resourceId: microserviceUuid,
                ipAddress: EventService.extractIPv4Address(req) || null
              })
            } catch (err) {
              logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
            }
          })
          return
        }
      }

      // If we reach here, either no pending agent or activation failed
      // Add user to pending list to wait for agent
      logger.info('No immediate agent available, adding user to pending list:' + JSON.stringify({
        microserviceUuid,
        hasPendingAgents,
        pendingAgentCount: pendingAgentExecIds.length
      }))
      this.sessionManager.addPendingUser(microserviceUuid, ws)
      this.attachPendingKeepAliveHandler(ws)

      // IMMEDIATE RE-CHECK: Look for any newly available agents after adding user (database query)
      const retryPendingAgents = await this.getPendingAgentExecIdsFromDB(microserviceUuid, transaction)
      if (retryPendingAgents.length > 0) {
        logger.info('Found available agent after adding user, attempting immediate activation:' + JSON.stringify({
          microserviceUuid,
          availableExecIds: retryPendingAgents
        }))

        // Try to activate session with first available agent
        const availableExecId = retryPendingAgents[0]
        const pendingAgent = this.sessionManager.findPendingAgentForExecId(microserviceUuid, availableExecId)

        if (pendingAgent) {
          // Remove user from pending first since we're activating
          this.sessionManager.removePendingUser(microserviceUuid, ws)
          const session = this.sessionManager.tryActivateSession(microserviceUuid, availableExecId, ws, false, transaction)
          if (session) {
            logger.info('Session activated immediately after re-check:' + JSON.stringify({
              execId: availableExecId,
              microserviceUuid,
              userState: ws.readyState,
              agentState: pendingAgent.readyState
            }))

            await this.setupMessageForwarding(availableExecId, transaction)

            // Record WebSocket connection event (non-blocking)
            setImmediate(async () => {
              try {
                let actorId = null
                if (req.headers && req.headers.authorization) {
                  actorId = EventService.extractUsernameFromToken(req.headers.authorization)
                }
                await EventService.createWsConnectEvent({
                  timestamp: Date.now(),
                  endpointType: 'user',
                  actorId: actorId,
                  path: req.url,
                  resourceId: microserviceUuid,
                  ipAddress: EventService.extractIPv4Address(req) || null
                })
              } catch (err) {
                logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
              }
            })
            return // Exit early, session activated successfully
          }
        } else {
          // Agent is on different replica - activate with user only
          logger.info('Found PENDING execId in retry but agent is on different replica, activating session with user only:', {
            execId: availableExecId,
            microserviceUuid
          })
          // Remove user from pending first
          this.sessionManager.removePendingUser(microserviceUuid, ws)
          this.sessionManager.createSession(availableExecId, microserviceUuid, null, ws, transaction)
          await MicroserviceExecStatusManager.update(
            { microserviceUuid: microserviceUuid },
            { execSessionId: availableExecId, status: microserviceExecState.ACTIVE },
            transaction
          )
          await this.setupMessageForwarding(availableExecId, transaction)
          logger.info('Cross-replica session activated with user only (retry):', {
            execId: availableExecId,
            microserviceUuid,
            userState: ws.readyState
          })

          // Record WebSocket connection event (non-blocking)
          setImmediate(async () => {
            try {
              let actorId = null
              if (req.headers && req.headers.authorization) {
                actorId = EventService.extractUsernameFromToken(req.headers.authorization)
              }
              await EventService.createWsConnectEvent({
                timestamp: Date.now(),
                endpointType: 'user',
                actorId: actorId,
                path: req.url,
                resourceId: microserviceUuid,
                ipAddress: EventService.extractIPv4Address(req) || null
              })
            } catch (err) {
              logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
            }
          })
          return
        }
      }

      // Only proceed with timeout mechanism if we still couldn't activate
      logger.info('No immediate agent available after re-check, proceeding with timeout mechanism')

      // Send status message to user when added to pending using STDERR
      try {
        const statusMsg = {
          type: MESSAGE_TYPES.STDERR,
          data: Buffer.from('Waiting for agent connection. Please ensure the microservice/agent is running.\n'),
          microserviceUuid: microserviceUuid,
          execId: 'pending', // Since we don't have execSessionId anymore
          timestamp: Date.now()
        }
        const encoded = this.encodeMessage(statusMsg)
        ws.send(encoded, {
          binary: true,
          compress: false,
          mask: false,
          fin: true
        })
        logger.info('Sent waiting status message to user:' + JSON.stringify({
          microserviceUuid,
          messageType: 'STDERR',
          encodedLength: encoded.length
        }))
      } catch (error) {
        logger.warn('Failed to send status message to user:' + JSON.stringify({
          error: error.message,
          microserviceUuid
        }))
      }

      // Start periodic retry timer for pending users (every 10 seconds)
      const RETRY_INTERVAL = 10000
      const startTime = Date.now()
      const retryTimer = setInterval(async () => {
        if (this.sessionManager.isUserStillPending(microserviceUuid, ws)) {
          logger.debug('Periodic retry: checking for available agents:' + JSON.stringify({
            microserviceUuid,
            retryCount: Math.floor((Date.now() - startTime) / RETRY_INTERVAL)
          }))

          try {
            const periodicRetryExecIds = await this.getPendingAgentExecIdsFromDB(microserviceUuid, transaction)
            if (periodicRetryExecIds.length > 0) {
              logger.info('Periodic retry found available agent:' + JSON.stringify({
                microserviceUuid,
                availableExecIds: periodicRetryExecIds
              }))

              // Attempt session activation with first available agent
              const availableExecId = periodicRetryExecIds[0]
              const pendingAgent = this.sessionManager.findPendingAgentForExecId(microserviceUuid, availableExecId)

              if (pendingAgent) {
                // Remove user from pending first
                this.sessionManager.removePendingUser(microserviceUuid, ws)
                const session = this.sessionManager.tryActivateSession(microserviceUuid, availableExecId, ws, false, transaction)
                if (session) {
                  logger.info('Session activated via periodic retry:' + JSON.stringify({
                    execId: availableExecId,
                    microserviceUuid,
                    userState: ws.readyState,
                    agentState: pendingAgent.readyState
                  }))

                  await this.setupMessageForwarding(availableExecId, transaction)

                  // Record WebSocket connection event (non-blocking)
                  setImmediate(async () => {
                    try {
                      let actorId = null
                      if (req.headers && req.headers.authorization) {
                        actorId = EventService.extractUsernameFromToken(req.headers.authorization)
                      }
                      await EventService.createWsConnectEvent({
                        timestamp: Date.now(),
                        endpointType: 'user',
                        actorId: actorId,
                        path: req.url,
                        resourceId: microserviceUuid,
                        ipAddress: EventService.extractIPv4Address(req) || null
                      })
                    } catch (err) {
                      logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
                    }
                  })
                  clearInterval(retryTimer) // Stop retry timer
                  return // Exit early, session activated successfully
                }
              } else {
                // Agent is on different replica - activate with user only
                logger.info('Periodic retry found PENDING execId but agent is on different replica, activating session with user only:', {
                  execId: availableExecId,
                  microserviceUuid
                })
                // Remove user from pending first
                this.sessionManager.removePendingUser(microserviceUuid, ws)
                this.sessionManager.createSession(availableExecId, microserviceUuid, null, ws, transaction)
                await MicroserviceExecStatusManager.update(
                  { microserviceUuid: microserviceUuid },
                  { execSessionId: availableExecId, status: microserviceExecState.ACTIVE },
                  transaction
                )
                await this.setupMessageForwarding(availableExecId, transaction)
                logger.info('Cross-replica session activated with user only (periodic retry):', {
                  execId: availableExecId,
                  microserviceUuid,
                  userState: ws.readyState
                })

                // Record WebSocket connection event (non-blocking)
                setImmediate(async () => {
                  try {
                    let actorId = null
                    if (req.headers && req.headers.authorization) {
                      actorId = EventService.extractUsernameFromToken(req.headers.authorization)
                    }
                    await EventService.createWsConnectEvent({
                      timestamp: Date.now(),
                      endpointType: 'user',
                      actorId: actorId,
                      path: req.url,
                      resourceId: microserviceUuid,
                      ipAddress: EventService.extractIPv4Address(req) || null
                    })
                  } catch (err) {
                    logger.error('Failed to create WS_CONNECT event (non-blocking):', err)
                  }
                })
                clearInterval(retryTimer) // Stop retry timer
                return
              }
            }
          } catch (retryError) {
            logger.warn('Periodic retry failed:' + JSON.stringify({
              error: retryError.message,
              microserviceUuid
            }))
          }
        } else {
          // User no longer pending, clear retry timer
          clearInterval(retryTimer)
        }
      }, RETRY_INTERVAL)

      // Store timer reference for cleanup
      this.sessionManager.setUserRetryTimer(microserviceUuid, ws, retryTimer)

      // Add timeout mechanism for pending users (60 seconds)
      const PENDING_USER_TIMEOUT = 60000
      setTimeout(() => {
        if (this.sessionManager.isUserStillPending(microserviceUuid, ws)) {
          logger.warn('Pending user timeout, closing connection:' + JSON.stringify({
            microserviceUuid,
            timeout: PENDING_USER_TIMEOUT
          }))

          // Send timeout message before closing
          try {
            const timeoutMsg = {
              type: MESSAGE_TYPES.STDERR,
              data: Buffer.from('Timeout waiting for agent connection. Please try again.\n'),
              microserviceUuid: microserviceUuid,
              execId: 'pending', // Since we don't have execSessionId anymore
              timestamp: Date.now()
            }
            const encoded = this.encodeMessage(timeoutMsg)
            ws.send(encoded, {
              binary: true,
              compress: false,
              mask: false,
              fin: true
            })
            logger.info('Sent timeout message to user:' + JSON.stringify({
              microserviceUuid,
              messageType: 'STDERR',
              encodedLength: encoded.length
            }))
          } catch (timeoutError) {
            logger.warn('Failed to send timeout message to user:' + JSON.stringify({
              error: timeoutError.message,
              microserviceUuid
            }))
          }

          try {
            ws.close(1008, 'Timeout waiting for agent connection')
          } catch (closeError) {
            logger.error('Error closing timed out user connection:' + JSON.stringify({
              error: closeError.message,
              microserviceUuid
            }))
          }
          // Clear retry timer before removing user
          const retryTimer = this.sessionManager.getUserRetryTimer(microserviceUuid, ws)
          if (retryTimer) {
            clearInterval(retryTimer)
            this.sessionManager.clearUserRetryTimer(microserviceUuid, ws)
          }

          this.sessionManager.removePendingUser(microserviceUuid, ws)
        }
      }, PENDING_USER_TIMEOUT)

      ws.on('close', (code, reason) => {
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
              actorId: actorId,
              path: req.url,
              resourceId: microserviceUuid,
              ipAddress: EventService.extractIPv4Address(req) || null,
              closeCode: code
            })
          } catch (err) {
            logger.error('Failed to create WS_DISCONNECT event (non-blocking):', err)
          }
        })

        for (const [execId, session] of this.sessionManager.sessions) {
          if (session.user === ws) {
            this.cleanupSession(execId, transaction)
          }
        }

        // Clear retry timer before removing user
        const retryTimer = this.sessionManager.getUserRetryTimer(microserviceUuid, ws)
        if (retryTimer) {
          clearInterval(retryTimer)
          this.sessionManager.clearUserRetryTimer(microserviceUuid, ws)
        }

        this.sessionManager.removePendingUser(microserviceUuid, ws)
        logger.info('User WebSocket disconnected:' + JSON.stringify({
          microserviceUuid,
          userState: ws.readyState
        }))
      })
    } catch (error) {
      logger.error('User connection validation failed:' + JSON.stringify({
        error: error.message,
        stack: error.stack
      }))
      // Handle error gracefully instead of throwing
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1008, error.message || 'Authentication failed')
        } catch (closeError) {
          logger.error('Error closing WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
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

  async setupMessageForwarding (execId, transaction) {
    const session = this.sessionManager.getSession(execId)
    if (!session) {
      logger.error('[RELAY] Failed to setup message forwarding: No session found for execId=' + execId)
      return
    }

    const { agent, user } = session
    logger.info('[RELAY] Setting up message forwarding for session:' + JSON.stringify({
      execId,
      microserviceUuid: session.microserviceUuid,
      agentConnected: !!agent,
      userConnected: !!user,
      agentState: agent ? agent.readyState : 'N/A',
      userState: user ? user.readyState : 'N/A'
    }))
    this.detachPendingKeepAliveHandler(user)
    this.detachPendingKeepAliveHandler(agent)
    try {
      // Pass cleanup callback so queue service can notify us when CLOSE is received
      await this.queueService.enableForSession(session, (execId) => {
        // Clear timeout if it exists (agent responded to CLOSE)
        const timeout = this.pendingCloseTimeouts.get(execId)
        if (timeout) {
          clearTimeout(timeout)
          this.pendingCloseTimeouts.delete(execId)
          logger.debug('[RELAY] Cleared pending CLOSE timeout - agent responded', { execId })
        }
        const currentTransaction = session.transaction
        this.cleanupSession(execId, currentTransaction)
      })
      session.queueBridgeEnabled = true
      logger.info('[RELAY] AMQP queue bridge enabled for exec session', {
        execId,
        microserviceUuid: session.microserviceUuid
      })
    } catch (error) {
      session.queueBridgeEnabled = false
      logger.warn('[RELAY] Failed to enable AMQP queue bridge, falling back to direct WebSocket relay', {
        execId,
        error: error.message
      })
    }

    // Send activation message to agent (works for both direct WebSocket and queue-based forwarding)
    const activationMsg = {
      type: MESSAGE_TYPES.ACTIVATION,
      data: Buffer.from(JSON.stringify({
        execId: execId,
        microserviceUuid: session.microserviceUuid,
        timestamp: Date.now()
      })),
      microserviceUuid: session.microserviceUuid,
      execId: execId,
      timestamp: Date.now()
    }

    // sendMessageToAgent handles queue-based forwarding when agent is null
    this.sendMessageToAgent(session.agent, activationMsg, execId, session.microserviceUuid)
      .then(success => {
        if (success) {
          logger.info('[RELAY] Session activation complete:' + JSON.stringify({
            execId,
            microserviceUuid: session.microserviceUuid,
            agentState: session.agent ? session.agent.readyState : 'N/A (cross-replica)',
            queueEnabled: this.queueService.shouldUseQueue(execId)
          }))
        } else {
          logger.error('[RELAY] Session activation failed:' + JSON.stringify({
            execId,
            microserviceUuid: session.microserviceUuid,
            agentState: session.agent ? session.agent.readyState : 'N/A',
            queueEnabled: this.queueService.shouldUseQueue(execId)
          }))
          // Only cleanup if we have a direct agent connection (not queue-based)
          if (session.agent) {
            this.cleanupSession(execId, transaction)
          }
        }
      })
      .catch(error => {
        logger.error('[RELAY] Session activation error:' + JSON.stringify({
          execId,
          microserviceUuid: session.microserviceUuid,
          error: error.message
        }))
        // Only cleanup if we have a direct agent connection (not queue-based)
        if (session.agent) {
          this.cleanupSession(execId, transaction)
        }
      })

    // Remove any previous message handlers to avoid duplicates
    if (user) {
      logger.debug('[RELAY] Removing previous user message handlers for execId=' + execId)
      user.removeAllListeners('message')
    }
    if (agent) {
      logger.debug('[RELAY] Removing previous agent message handlers for execId=' + execId)
      agent.removeAllListeners('message')
    }

    // Forward user -> agent (works for both direct WebSocket and queue-based forwarding)
    if (user) {
      logger.debug('[RELAY] Setting up user->agent message forwarding for execId=' + execId)
      user.on('message', async (data, isBinary) => {
        logger.debug('[RELAY] User message received:' + JSON.stringify({
          execId,
          isBinary,
          dataType: typeof data,
          dataLength: data.length,
          userState: user.readyState,
          agentState: agent ? agent.readyState : 'N/A (cross-replica)',
          queueEnabled: this.queueService.shouldUseQueue(execId)
        }))

        if (!isBinary) {
          // Handle text messages from user
          const text = data.toString()
          logger.debug('[RELAY] Received text message from user:' + JSON.stringify({
            execId,
            text,
            length: text.length,
            userState: user.readyState,
            agentState: session.agent ? session.agent.readyState : 'N/A (cross-replica)',
            queueEnabled: this.queueService.shouldUseQueue(execId)
          }))

          // Convert text to binary message in agent's expected format
          const msg = {
            type: MESSAGE_TYPES.STDIN,
            data: Buffer.from(text + '\n'), // Add newline for command execution
            microserviceUuid: session.microserviceUuid,
            execId: execId,
            timestamp: Date.now()
          }

          // sendMessageToAgent handles queue-based forwarding when agent is null
          await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)
          return
        }

        const buffer = Buffer.from(data)
        try {
          const msg = this.decodeMessage(buffer)
          // Ensure message has all required fields
          if (!msg.microserviceUuid) msg.microserviceUuid = session.microserviceUuid
          if (!msg.execId) msg.execId = execId
          if (!msg.timestamp) msg.timestamp = Date.now()

          if (msg.type === MESSAGE_TYPES.CLOSE) {
            logger.info(`[RELAY] User sent CLOSE for execId=${execId}`)

            const queueEnabled = this.queueService.shouldUseQueue(execId)

            // Forward CLOSE to agent first
            await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)

            if (queueEnabled) {
              // Cross-replica scenario: Don't close socket immediately
              // Wait for agent's CLOSE response via queue
              // The queue service will handle closing the socket in _handleCloseMessage
              // when it receives the agent's CLOSE response
              logger.debug('[RELAY] Cross-replica CLOSE: waiting for agent response via queue', {
                execId,
                microserviceUuid: session.microserviceUuid
              })

              // Set timeout in case agent doesn't respond
              const timeout = setTimeout(() => {
                const currentSession = this.sessionManager.getSession(execId)
                if (currentSession && currentSession.user && currentSession.user.readyState === WebSocket.OPEN) {
                  logger.warn('[RELAY] Agent did not respond to CLOSE within timeout, closing user socket', {
                    execId,
                    microserviceUuid: session.microserviceUuid,
                    timeout: this.config.closeResponseTimeout
                  })
                  try {
                    currentSession.user.close(1000, 'Session closed (timeout)')
                    const currentTransaction = currentSession.transaction
                    this.cleanupSession(execId, currentTransaction)
                  } catch (error) {
                    logger.error('[RELAY] Failed to close user socket on timeout', {
                      execId,
                      error: error.message
                    })
                  }
                }
                this.pendingCloseTimeouts.delete(execId)
              }, this.config.closeResponseTimeout)

              this.pendingCloseTimeouts.set(execId, timeout)
              // Don't cleanup yet - queue service will call cleanup callback when agent responds
              return
            } else {
              // Same replica: Close immediately (existing behavior)
              // Close user WebSocket with code 1000 so client's onclose handler shows "Successfully closed"
              // The client expects code 1000 (normal closure) to display the success message
              if (user && user.readyState === WebSocket.OPEN) {
                try {
                  user.close(1000, 'Session closed')
                  logger.debug('[RELAY] Closed user WebSocket with code 1000:' + JSON.stringify({
                    execId,
                    microserviceUuid: session.microserviceUuid
                  }))
                } catch (error) {
                  logger.warn('[RELAY] Failed to close user WebSocket:' + JSON.stringify({
                    execId,
                    error: error.message
                  }))
                }
              }

              // Get current transaction from the session and cleanup
              const currentTransaction = session.transaction
              this.cleanupSession(execId, currentTransaction)
              return
            }
          }

          if (msg.type === MESSAGE_TYPES.CONTROL) {
            // Handle keep-alive messages from user
            const controlData = msg.data.toString()
            if (controlData === 'keepalive') {
              // Send keep-alive response back to user
              const keepAliveResponse = {
                type: MESSAGE_TYPES.CONTROL,
                data: Buffer.from('keepalive'),
                microserviceUuid: session.microserviceUuid,
                execId: execId,
                timestamp: Date.now()
              }
              const encoded = this.encodeMessage(keepAliveResponse)
              user.send(encoded, {
                binary: true,
                compress: false,
                mask: false,
                fin: true
              })
              logger.debug('[RELAY] Sent keep-alive response to user:' + JSON.stringify({
                execId,
                microserviceUuid: session.microserviceUuid
              }))
              return // Don't forward keep-alive to agent
            }
          }

          // sendMessageToAgent handles queue-based forwarding when agent is null
          await this.sendMessageToAgent(session.agent, msg, execId, session.microserviceUuid)
        } catch (error) {
          logger.error('[RELAY] Failed to process binary message:' + JSON.stringify({
            execId,
            error: error.message,
            stack: error.stack,
            bufferLength: buffer.length,
            userState: user.readyState,
            agentState: session.agent ? session.agent.readyState : 'N/A (cross-replica)'
          }))
        }
      })
    }

    // Forward agent -> user (works for both direct WebSocket and queue-based forwarding)
    if (agent) {
      logger.debug('[RELAY] Setting up agent->user message forwarding for execId=' + execId)
      agent.on('message', async (data, isBinary) => {
        logger.debug('[RELAY] Agent message received:' + JSON.stringify({
          execId,
          isBinary,
          dataType: typeof data,
          dataLength: data.length,
          userState: session.user ? session.user.readyState : 'N/A (cross-replica)',
          agentState: agent.readyState,
          queueEnabled: this.queueService.shouldUseQueue(execId)
        }))

        try {
          const buffer = Buffer.from(data)
          const msg = this.decodeMessage(buffer)
          logger.debug('[RELAY] Decoded agent message:' + JSON.stringify({
            execId,
            type: msg.type,
            hasData: !!msg.data,
            messageSize: buffer.length
          }))

          if (msg.type === MESSAGE_TYPES.CLOSE) {
            logger.info(`[RELAY] Agent sent CLOSE for execId=${execId}`)

            const queueEnabled = this.queueService.shouldUseQueue(execId)

            // In cross-replica scenarios, publish CLOSE to queue so user's replica can handle it
            if (queueEnabled) {
              try {
                // Pass message type so queue receiver can detect CLOSE without decoding
                await this.queueService.publishToUser(execId, buffer, { messageType: MESSAGE_TYPES.CLOSE })
                logger.debug('[RELAY] Forwarded agent CLOSE message to user via queue:' + JSON.stringify({
                  execId,
                  type: msg.type
                }))
              } catch (error) {
                logger.error('[RELAY] Failed to enqueue CLOSE message for user', {
                  execId,
                  error: error.message
                })
              }
            } else if (session.user && session.user.readyState === WebSocket.OPEN) {
              // Direct connection - close user WebSocket immediately
              session.user.close(1000, 'Agent closed connection')
            }

            // Get current transaction from the session
            const currentTransaction = session.transaction
            this.cleanupSession(execId, currentTransaction)
            return
          }

          const queueEnabled = this.queueService.shouldUseQueue(execId)
          if (queueEnabled) {
            try {
              await this.queueService.publishToUser(execId, buffer)
              logger.debug('[RELAY] Forwarded agent message to user via queue:' + JSON.stringify({
                execId,
                type: msg.type
              }))
            } catch (error) {
              logger.error('[RELAY] Failed to enqueue message for user', {
                execId,
                error: error.message
              })
            }
          } else if (session.user && session.user.readyState === WebSocket.OPEN) {
            if (msg.type === MESSAGE_TYPES.STDOUT || msg.type === MESSAGE_TYPES.STDERR) {
              if (msg.data && msg.data.length > 0) {
                // Create MessagePack message for user
                const userMsg = {
                  type: msg.type,
                  data: msg.data,
                  microserviceUuid: session.microserviceUuid,
                  execId: execId,
                  timestamp: Date.now()
                }
                // Encode and send as binary
                const encoded = this.encodeMessage(userMsg)
                session.user.send(encoded, {
                  binary: true,
                  compress: false,
                  mask: false,
                  fin: true
                })

                logger.debug('[RELAY] Forwarded agent message to user:' + JSON.stringify({
                  execId,
                  type: msg.type,
                  encodedLength: encoded.length,
                  messageType: msg.type
                }))
              }
            } else if (msg.type === MESSAGE_TYPES.CONTROL) {
              session.user.send(data, {
                binary: true,
                compress: false,
                mask: false,
                fin: true
              })
            }
          } else {
            logger.debug('[RELAY] User not available (cross-replica), message should be delivered via queue:' + JSON.stringify({
              execId,
              userState: session.user ? session.user.readyState : 'N/A',
              messageType: msg.type,
              queueEnabled
            }))
          }
        } catch (error) {
          logger.error('[RELAY] Failed to process agent message:', error)
        }
      })
    }

    logger.info('[RELAY] Message forwarding setup complete for session:' + JSON.stringify({
      execId,
      microserviceUuid: session.microserviceUuid,
      agentConnected: !!agent,
      userConnected: !!user,
      agentState: agent ? agent.readyState : 'N/A',
      userState: user ? user.readyState : 'N/A'
    }))
  }

  async validateAgentConnection (token, microserviceUuid, transaction) {
    try {
      // Use AuthDecorator to validate the token and get the fog
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

      return fog
    } catch (error) {
      logger.error('Agent validation error:' + JSON.stringify({
        error: error.message,
        stack: error.stack,
        microserviceUuid
      }))
      throw error // Propagate the original error
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
        microserviceUuid: microserviceUuid
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
  static getInstance () {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer()
    }
    return WebSocketServer.instance
  }

  // Clean up session and close sockets
  cleanupSession (execId, transaction) {
    const session = this.sessionManager.getSession(execId)
    if (!session) return

    // Clear any pending CLOSE timeout
    const timeout = this.pendingCloseTimeouts.get(execId)
    if (timeout) {
      clearTimeout(timeout)
      this.pendingCloseTimeouts.delete(execId)
      logger.debug('[RELAY] Cleared pending CLOSE timeout during cleanup', { execId })
    }

    // Send CLOSE message to agent if it's still connected
    if (session.agent && session.agent.readyState === WebSocket.OPEN) {
      const closeMsg = {
        type: MESSAGE_TYPES.CLOSE,
        execId: execId,
        microserviceUuid: session.microserviceUuid,
        timestamp: Date.now(),
        data: Buffer.from('Session closed')
      }

      try {
        const encoded = this.encodeMessage(closeMsg)
        session.agent.send(encoded, {
          binary: true,
          compress: false,
          mask: false,
          fin: true
        })
        logger.info('[RELAY] Sent CLOSE message to agent for execId=' + execId)
      } catch (error) {
        logger.error('[RELAY] Failed to send CLOSE message to agent:' + JSON.stringify({
          execId,
          error: error.message,
          stack: error.stack
        }))
      }
    }

    // Close the connections (only if not already closed)
    // Note: User connection may already be closed if user initiated the close
    if (session.user && session.user.readyState === WebSocket.OPEN) {
      session.user.close(1000, 'Session closed')
    }
    if (session.agent && session.agent.readyState === WebSocket.OPEN) {
      session.agent.close(1000, 'Session closed')
    }

    this.sessionManager.removeSession(execId, transaction)
    logger.info('[RELAY] Session cleaned up for execId=' + execId)
    this.queueService.cleanup(execId)
      .catch(error => {
        logger.warn('[RELAY] Failed to cleanup queue bridge during session cleanup', {
          execId,
          error: error.message
        })
      })
  }

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
      const isQueueEnabled = this.queueService.shouldUseQueue(execId)
      const messageType = typeof message.type === 'number' ? message.type : null

      if (isQueueEnabled) {
        await this.queueService.publishToAgent(execId, encoded, { messageType })
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

  attachPendingKeepAliveHandler (ws) {
    if (!ws || ws._pendingKeepAliveHandler) {
      return
    }
    ws._pendingKeepAliveHandler = (data, isBinary) => {
      if (!isBinary) return
      let msg
      try {
        msg = this.decodeMessage(Buffer.from(data))
      } catch (error) {
        return
      }
      if (msg.type === MESSAGE_TYPES.CONTROL) {
        const controlData = msg.data ? msg.data.toString() : ''
        if (controlData === 'keepalive') {
          this._sendKeepAliveResponse(ws, msg.execId || 'pending', msg.microserviceUuid || null)
        }
      }
    }
    ws.on('message', ws._pendingKeepAliveHandler)
    ws.on('ping', () => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.pong()
        } catch (error) {
          logger.debug('[RELAY] Failed to send pong on pending connection', { error: error.message })
        }
      }
    })
  }

  detachPendingKeepAliveHandler (ws) {
    if (ws && ws._pendingKeepAliveHandler) {
      ws.removeListener('message', ws._pendingKeepAliveHandler)
      ws._pendingKeepAliveHandler = null
    }
  }

  _sendKeepAliveResponse (ws, execId, microserviceUuid) {
    try {
      const keepAliveResponse = {
        type: MESSAGE_TYPES.CONTROL,
        data: Buffer.from('keepalive'),
        microserviceUuid,
        execId,
        timestamp: Date.now()
      }
      const encoded = this.encodeMessage(keepAliveResponse)
      ws.send(encoded, {
        binary: true,
        compress: false,
        mask: false,
        fin: true
      })
    } catch (error) {
      logger.debug('[RELAY] Failed to send keepalive response', { error: error.message })
    }
  }

  // Helper method to check if auth is configured
  isAuthConfigured () {
    const requiredConfigs = [
      'auth.realm',
      'auth.realmKey',
      'auth.url',
      'auth.client.id',
      'auth.client.secret'
    ]
    return requiredConfigs.every(configKey => {
      const value = config.get(configKey)
      return value !== undefined && value !== null && value !== ''
    })
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
          microserviceUuid: microserviceUuid
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

      // Parse and validate tail config
      const tailLines = parseInt(url.searchParams.get('tail'))
      const tailConfig = {
        lines: (tailLines && tailLines >= 1 && tailLines <= 10000) ? tailLines : 100, // Default: 100, Range: 1-10000
        follow: url.searchParams.get('follow') !== 'false', // default: true
        since: url.searchParams.get('since') || null, // ISO 8601 format
        until: url.searchParams.get('until') || null // ISO 8601 format
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

      // 3. Generate unique sessionId for this user session
      const sessionId = AppHelper.generateUUID()
      const logSessionId = fogUuid ? `logs-${fogUuid}` : `logs-${microserviceUuid}`

      // 4. Create log session in database (no HTTP POST needed!)
      if (microserviceUuid) {
        await MicroserviceLogStatusManager.create({
          microserviceUuid: microserviceUuid,
          logSessionId: logSessionId,
          sessionId: sessionId, // Unique per user session
          status: 'PENDING',
          tailConfig: JSON.stringify(tailConfig),
          agentConnected: false,
          userConnected: true
        }, transaction)
      } else if (fogUuid) {
        await FogLogStatusManager.create({
          iofogUuid: fogUuid,
          logSessionId: logSessionId,
          sessionId: sessionId, // Unique per user session
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
      this.logSessionManager.createLogSession(
        sessionId,
        microserviceUuid,
        fogUuid,
        null, // Agent not connected yet
        ws, // User connected
        tailConfig,
        transaction
      )

      // 7. Send sessionId to user (MessagePack encoded)
      const sessionInfoMsg = {
        type: MESSAGE_TYPES.LOG_START,
        data: Buffer.from(JSON.stringify({
          sessionId: sessionId,
          tailConfig: tailConfig
        })),
        sessionId: sessionId,
        timestamp: Date.now()
      }
      ws.send(this.encodeMessage(sessionInfoMsg), { binary: true })

      // 8. Send waiting message to user (agent not connected yet)
      try {
        const waitingMsg = {
          type: MESSAGE_TYPES.LOG_LINE,
          data: Buffer.from('Waiting for agent connection. Log streaming will begin once the agent connects.\n'),
          sessionId: sessionId,
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
            actorId: actorId,
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
        const session = this.logSessionManager.getLogSession(sessionId)
        if (session) {
          session.user = null // Mark user as disconnected
          session.lastActivity = Date.now()

          // Update database
          if (microserviceUuid) {
            await MicroserviceLogStatusManager.update(
              { sessionId: sessionId },
              { userConnected: false },
              transaction
            )
          } else if (fogUuid) {
            await FogLogStatusManager.update(
              { sessionId: sessionId },
              { userConnected: false },
              transaction
            )
          }

          // If agent also disconnected, remove session
          if (!session.agent) {
            await this.logSessionManager.removeLogSession(sessionId, transaction)
          } else {
            // Trigger change tracking (agent will see user disconnected on next poll)
            const fogForTracking = await FogManager.findOne({
              uuid: fogUuid || (await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)).iofogUuid
            }, transaction)
            await ChangeTrackingService.update(
              fogForTracking.uuid,
              fogUuid ? ChangeTrackingService.events.fogLogs : ChangeTrackingService.events.microserviceLogs,
              transaction
            )
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
              actorId: actorId,
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
          { sessionId: sessionId },
          transaction
        )
      } else if (iofogUuid) {
        logStatus = await FogLogStatusManager.findOne(
          { sessionId: sessionId },
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
          { sessionId: sessionId },
          { agentConnected: true, status: 'ACTIVE' },
          transaction
        )
      } else if (iofogUuid) {
        await FogLogStatusManager.update(
          { sessionId: sessionId },
          { agentConnected: true, status: 'ACTIVE' },
          transaction
        )
      }

      // 5. Get or create in-memory session
      let session = this.logSessionManager.getLogSession(sessionId)
      if (!session) {
        // Session might be on different replica, create it
        session = this.logSessionManager.createLogSession(
          sessionId,
          logStatus.microserviceUuid,
          logStatus.iofogUuid,
          ws, // Agent
          null, // User (might be on different replica)
          tailConfig,
          transaction
        )
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
          sessionId: sessionId,
          tailConfig: tailConfig
        })),
        sessionId: sessionId,
        timestamp: Date.now()
      }
      ws.send(this.encodeMessage(configMsg), { binary: true })

      // 7. Notify user that agent has connected and streaming has started
      if (session.user && session.user.readyState === WebSocket.OPEN) {
        try {
          const agentConnectedMsg = {
            type: MESSAGE_TYPES.LOG_START,
            data: Buffer.from(JSON.stringify({
              sessionId: sessionId,
              message: 'Agent connected. Log streaming started.\n'
            })),
            sessionId: sessionId,
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
            actorId: actorId,
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
          session.agent = null // Mark agent as disconnected
          session.lastActivity = Date.now()

          // Update database
          if (microserviceUuid) {
            await MicroserviceLogStatusManager.update(
              { sessionId: sessionId },
              { agentConnected: false },
              transaction
            )
          } else if (iofogUuid) {
            await FogLogStatusManager.update(
              { sessionId: sessionId },
              { agentConnected: false },
              transaction
            )
          }

          // If user also disconnected, remove session
          if (!session.user) {
            await this.logSessionManager.removeLogSession(sessionId, transaction)
          } else {
            // Trigger change tracking (agent will see it disconnected on next poll)
            const fog = await FogManager.findOne({
              uuid: iofogUuid || logStatus.iofogUuid || (await MicroserviceManager.findOne({ uuid: logStatus.microserviceUuid }, transaction)).iofogUuid
            }, transaction)
            await ChangeTrackingService.update(
              fog.uuid,
              iofogUuid ? ChangeTrackingService.events.fogLogs : ChangeTrackingService.events.microserviceLogs,
              transaction
            )
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
              actorId: actorId,
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
    await this.queueService.enableForLogSession(session, (sessionId) => {
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

  async forwardLogToUser (sessionId, buffer, transaction) {
    const session = this.logSessionManager.getLogSession(sessionId)
    if (!session) {
      logger.warn('forwardLogToUser: Session not found:' + JSON.stringify({ sessionId }))
      return
    }

    // Buffer is already MessagePack encoded from agent
    // Following exec session pattern: Use queue for ALL scenarios (single and multi-replica)
    // One-to-one forwarding (agent → user) via queue
    const useQueue = this.queueService.shouldUseQueueForLogs(sessionId)
    logger.debug('forwardLogToUser:' + JSON.stringify({
      sessionId,
      useQueue,
      hasUser: !!session.user,
      userState: session.user ? session.user.readyState : 'N/A',
      bufferLength: buffer.length
    }))

    if (useQueue) {
      // Publish MessagePack encoded buffer to user queue
      await this.queueService.publishLogToUser(sessionId, buffer)
    } else {
      // Fallback: Direct WebSocket (only if queue not enabled)
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
    await this.logSessionManager.removeLogSession(sessionId, transaction)
    await this.queueService.cleanupLogSession(sessionId)
  }
}

module.exports = WebSocketServer

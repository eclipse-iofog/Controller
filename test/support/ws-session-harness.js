const { EventEmitter } = require('events')
const WebSocket = require('ws')
const msgpack = require('@msgpack/msgpack')
const { v4: uuidv4 } = require('uuid')

const MESSAGE_TYPES = {
  STDIN: 0,
  STDOUT: 1,
  STDERR: 2,
  CONTROL: 3,
  CLOSE: 4,
  ACTIVATION: 5,
  LOG_LINE: 6,
  LOG_START: 7,
  LOG_STOP: 8,
  LOG_ERROR: 9
}

const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  POLICY_VIOLATION: 1008,
  TRY_AGAIN_LATER: 1013
}

function delay (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createMockWebSocket () {
  const ws = new EventEmitter()
  ws.readyState = WebSocket.OPEN
  ws.OPEN = WebSocket.OPEN
  ws.CLOSED = WebSocket.CLOSED
  ws.binaryType = 'arraybuffer'
  ws._sentMessages = []

  ws.send = function (data, opts) {
    ws._sentMessages.push({ data: Buffer.from(data), opts })
    ws.emit('_sent', { data: Buffer.from(data), opts })
  }

  ws.close = function (code, reason) {
    ws.readyState = WebSocket.CLOSED
    process.nextTick(() => ws.emit('close', code, reason))
  }

  ws.pong = () => {}
  ws.removeListener = EventEmitter.prototype.removeListener.bind(ws)
  ws.on = EventEmitter.prototype.on.bind(ws)
  ws.once = EventEmitter.prototype.once.bind(ws)
  ws.removeAllListeners = EventEmitter.prototype.removeAllListeners.bind(ws)

  return ws
}

function createMockRequest (url, remoteAddress = '127.0.0.1') {
  return {
    url,
    headers: { host: 'localhost:51121' },
    socket: { remoteAddress }
  }
}

function encodeExecMessage (fields) {
  return msgpack.encode(fields)
}

function decodeExecMessage (buffer) {
  return msgpack.decode(buffer)
}

function buildAgentInitialMessage (execId, microserviceUuid) {
  return encodeExecMessage({ execId, microserviceUuid })
}

function buildExecFrame (type, execId, microserviceUuid, data) {
  return encodeExecMessage({
    type,
    execId,
    microserviceUuid,
    data: Buffer.isBuffer(data) ? data : Buffer.from(data),
    timestamp: Date.now()
  })
}

function mergeExecBridgeSession (existing, incoming) {
  if (!existing) {
    return incoming
  }
  return {
    ...existing,
    ...incoming,
    execId: incoming.execId || existing.execId,
    sessionId: incoming.sessionId || existing.sessionId,
    microserviceUuid: incoming.microserviceUuid || existing.microserviceUuid,
    user: incoming.user || existing.user,
    agent: incoming.agent || existing.agent
  }
}

function mergeLogBridgeSession (existing, incoming) {
  if (!existing) {
    return incoming
  }
  return {
    ...existing,
    ...incoming,
    sessionId: incoming.sessionId || existing.sessionId,
    microserviceUuid: incoming.microserviceUuid || existing.microserviceUuid,
    fogUuid: incoming.fogUuid || existing.fogUuid,
    user: incoming.user || existing.user,
    agent: incoming.agent || existing.agent,
    tailConfig: incoming.tailConfig || existing.tailConfig
  }
}

/**
 * In-memory relay stub for cross-replica exec/log tests.
 * @param {'amqp'|'nats'} [transport='amqp']
 */
function createMockRelayTransport (transport = 'amqp') {
  const execBridges = new Map()
  const logBridges = new Map()

  return {
    execBridges,
    logBridges,

    getTransport () {
      return transport
    },

    async isAvailable () {
      return true
    },

    async enableForSession (session, cleanupCallback) {
      const execId = session.execId
      if (!execId) return false
      const existing = execBridges.get(execId)
      if (existing) {
        existing.session = mergeExecBridgeSession(existing.session, session)
        if (cleanupCallback) {
          existing.cleanupCallback = cleanupCallback
        }
      } else {
        execBridges.set(execId, { session, cleanupCallback })
      }
      return true
    },

    shouldUseRelay (execId) {
      return execBridges.has(execId)
    },

    setExecUserDeliveryHook (execId, hook) {
      const bridge = execBridges.get(execId)
      if (bridge) {
        bridge.onUserRelayDelivery = hook
      }
    },

    setExecAgentDeliveryHook (execId, hook) {
      const bridge = execBridges.get(execId)
      if (bridge) {
        bridge.onAgentRelayDelivery = hook
      }
    },

    setLogUserDeliveryHook (sessionId, hook) {
      const bridge = logBridges.get(sessionId)
      if (bridge) {
        bridge.onUserRelayDelivery = hook
      }
    },

    async publishToAgent (execId, buffer) {
      const bridge = execBridges.get(execId)
      if (bridge && bridge.session.agent && bridge.session.agent.readyState === WebSocket.OPEN) {
        bridge.session.agent.send(buffer, { binary: true })
        if (bridge.onAgentRelayDelivery) {
          bridge.onAgentRelayDelivery(buffer)
        }
      }
    },

    async publishToUser (execId, buffer) {
      const bridge = execBridges.get(execId)
      if (bridge && bridge.session.user && bridge.session.user.readyState === WebSocket.OPEN) {
        bridge.session.user.send(buffer, { binary: true })
        if (bridge.onUserRelayDelivery) {
          bridge.onUserRelayDelivery(buffer)
        }
      }
    },

    async cleanup (execId) {
      execBridges.delete(execId)
    },

    async enableForLogSession (session, cleanupCallback) {
      const sessionId = session.sessionId
      const existing = logBridges.get(sessionId)
      if (existing) {
        existing.session = mergeLogBridgeSession(existing.session, session)
        if (cleanupCallback) {
          existing.cleanupCallback = cleanupCallback
        }
      } else {
        logBridges.set(sessionId, { session, cleanupCallback })
      }
      return true
    },

    shouldUseRelayForLogs (sessionId) {
      return logBridges.has(sessionId)
    },

    async publishLogToUser (sessionId, buffer) {
      const bridge = logBridges.get(sessionId)
      if (bridge && bridge.session.user && bridge.session.user.readyState === WebSocket.OPEN) {
        bridge.session.user.send(buffer, { binary: true })
        if (bridge.onUserRelayDelivery) {
          bridge.onUserRelayDelivery(buffer)
        }
      }
    },

    async cleanupLogSession (sessionId) {
      logBridges.delete(sessionId)
    },

    async shutdown () {},

    onRecovery () {}
  }
}

function createMockNatsRelayTransport () {
  return createMockRelayTransport('nats')
}

/** @deprecated use createMockRelayTransport */
function createMockQueueService () {
  return createMockRelayTransport()
}

function resetWebSocketServerSingleton (WebSocketServerClass) {
  if (WebSocketServerClass.instance) {
    const instance = WebSocketServerClass.instance
    instance.execSessionManager.stopCleanupInterval()
    instance.logSessionManager.stopCleanupInterval()
  }
  WebSocketServerClass.instance = null
}

function buildFakeJwt (claims = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: 'test-user-id',
    preferred_username: 'tester',
    ...claims
  })).toString('base64url')
  return `Bearer ${header}.${payload}.signature`
}

function newTestIds () {
  return {
    microserviceUuid: uuidv4(),
    fogUuid: uuidv4(),
    execId: uuidv4(),
    sessionId: uuidv4()
  }
}

function lastSentBinary (ws) {
  const last = ws._sentMessages[ws._sentMessages.length - 1]
  return last ? last.data : null
}

function waitForSent (ws, minCount = 1, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    if (ws._sentMessages.length >= minCount) {
      resolve(ws._sentMessages)
      return
    }
    const timer = setTimeout(() => {
      ws.removeListener('_sent', onSent)
      reject(new Error(`Timed out waiting for WS send (got ${ws._sentMessages.length}, wanted ${minCount})`))
    }, timeoutMs)
    const onSent = () => {
      if (ws._sentMessages.length >= minCount) {
        clearTimeout(timer)
        ws.removeListener('_sent', onSent)
        resolve(ws._sentMessages)
      }
    }
    ws.on('_sent', onSent)
  })
}

async function waitUntil (predicate, timeoutMs = 2000, intervalMs = 10) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) {
      return
    }
    await delay(intervalMs)
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for condition`)
}

module.exports = {
  MESSAGE_TYPES,
  WS_CLOSE_CODES,
  delay,
  createMockWebSocket,
  createMockRequest,
  encodeExecMessage,
  decodeExecMessage,
  buildAgentInitialMessage,
  buildExecFrame,
  createMockRelayTransport,
  createMockNatsRelayTransport,
  createMockQueueService,
  resetWebSocketServerSingleton,
  buildFakeJwt,
  newTestIds,
  lastSentBinary,
  waitForSent,
  waitUntil
}

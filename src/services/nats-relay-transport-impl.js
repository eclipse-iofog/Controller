const WebSocket = require('ws')
const { headers: natsHeaders } = require('@nats-io/transport-node')
const msgpack = require('@msgpack/msgpack')
const config = require('../config')
const logger = require('../logger')
const NatsRelayConnectionManager = require('./nats-relay-connection-manager')

const SUBJECT_PREFIX = 'controller.relay.v1'
const LOG_BACKPRESSURE_BUFFER_BYTES = 256 * 1024
const LOG_MESSAGE_TYPES = { LOG_ERROR: 9, LOG_LINE: 6 }

const MESSAGE_TYPES = {
  CLOSE: 4
}

const HEADER_MESSAGE_TYPE = 'messageType'
const HEADER_CLOSE_ACK = 'closeAck'

function execAgentSubject (sessionId) {
  return `${SUBJECT_PREFIX}.exec.${sessionId}.agent`
}

function execUserSubject (sessionId) {
  return `${SUBJECT_PREFIX}.exec.${sessionId}.user`
}

function logUserSubject (sessionId) {
  return `${SUBJECT_PREFIX}.log.${sessionId}.user`
}

function decodeLogMessageType (buffer) {
  try {
    const msg = msgpack.decode(buffer)
    return typeof msg.type === 'number' ? msg.type : null
  } catch (error) {
    return null
  }
}

function getBufferFromData (data) {
  if (!data) return Buffer.alloc(0)
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  return Buffer.from(data)
}

class NatsRelayTransportImpl {
  constructor (connectionManager = NatsRelayConnectionManager, configOverride = null) {
    this._connectionManager = connectionManager
    this._config = configOverride || config
    this.maxPendingBytes = this._config.get('server.webSocket.relay.nats.maxPendingBytes', 33554432)
    this.maxPendingMessages = this._config.get('server.webSocket.relay.nats.maxPendingMessages', 8192)
    this.publishTimeoutMs = this._config.get('server.webSocket.relay.nats.publishTimeoutMs', 5000)
    this.execBridges = new Map()
    this.logBridges = new Map()
    this.recoveryCallbacks = []
    this.rebinding = new Set()

    this._connectionManager.onReconnect(() => {
      return this._handleReconnect().catch((error) => {
        logger.error('[NATS][RELAY] Reconnect handling failed', { error: error.message })
      })
    })
  }

  async isAvailable () {
    return this._connectionManager.isAvailable()
  }

  onRecovery (cb) {
    if (typeof cb === 'function') {
      this.recoveryCallbacks.push(cb)
    }
  }

  async enableForSession (session, cleanupCallback) {
    const execId = session.execId
    if (!execId) {
      logger.warn('[NATS][RELAY] Missing execId for session, skipping bridge enablement')
      return false
    }

    const bridge = this.execBridges.get(execId) || {
      execId,
      session: null,
      subscriptions: {},
      sockets: {},
      cleanupCallback: null
    }

    bridge.session = session
    if (cleanupCallback) {
      bridge.cleanupCallback = cleanupCallback
    }

    const nc = await this._connectionManager.getConnection()

    if (session.user) {
      await this._ensureExecSubscription(bridge, 'user', session.user, nc)
    }
    if (session.agent) {
      await this._ensureExecSubscription(bridge, 'agent', session.agent, nc)
    }

    this.execBridges.set(execId, bridge)
    return true
  }

  shouldUseRelay (execId) {
    return this.execBridges.has(execId)
  }

  async publishToAgent (execId, buffer, options = {}) {
    await this._publishExec(execId, execAgentSubject(execId), buffer, options)
  }

  async publishToUser (execId, buffer, options = {}) {
    await this._publishExec(execId, execUserSubject(execId), buffer, options)
  }

  async cleanup (execId) {
    const bridge = this.execBridges.get(execId)
    if (!bridge) return
    this._closeExecBridge(bridge)
    this.execBridges.delete(execId)
  }

  async enableForLogSession (session, cleanupCallback) {
    const sessionId = session.sessionId
    if (!sessionId) {
      logger.warn('[NATS][RELAY] Missing sessionId for log session, skipping bridge enablement')
      return false
    }

    const bridge = this.logBridges.get(sessionId) || {
      sessionId,
      session: null,
      subscription: null,
      cleanupCallback: null,
      backpressureNotified: false,
      pendingBytes: 0,
      pendingMessages: 0
    }

    bridge.session = session
    if (cleanupCallback) {
      bridge.cleanupCallback = cleanupCallback
    }

    if (session.user) {
      const nc = await this._connectionManager.getConnection()
      await this._ensureLogUserSubscription(bridge, session.user, nc)
    }

    this.logBridges.set(sessionId, bridge)
    return true
  }

  shouldUseRelayForLogs (sessionId) {
    return this.logBridges.has(sessionId)
  }

  async publishLogToUser (sessionId, buffer) {
    const bridge = this.logBridges.get(sessionId)
    if (!bridge) {
      throw new Error(`Log bridge missing for sessionId=${sessionId}`)
    }

    const messageType = decodeLogMessageType(buffer)
    const isLogLine = messageType === LOG_MESSAGE_TYPES.LOG_LINE

    try {
      await this._publish(logUserSubject(sessionId), buffer, {}, sessionId)
    } catch (error) {
      if (isLogLine) {
        this._dropLogLineForPublishBackpressure(bridge, sessionId)
        return
      }
      logger.error('[NATS][RELAY] Failed to publish log message', {
        sessionId,
        error: error.message
      })
      throw error
    }
  }

  async cleanupLogSession (sessionId) {
    const bridge = this.logBridges.get(sessionId)
    if (!bridge) return

    if (bridge.subscription) {
      try {
        await bridge.subscription.drain()
      } catch (error) {
        logger.debug('[NATS][RELAY] Failed to drain log subscription during cleanup', {
          sessionId,
          error: error.message
        })
      }
      bridge.subscription = null
    }

    if (bridge.cleanupCallback) {
      bridge.cleanupCallback = null
    }

    this.logBridges.delete(sessionId)
  }

  async shutdown () {
    for (const execId of this.execBridges.keys()) {
      await this.cleanup(execId)
    }
    for (const sessionId of this.logBridges.keys()) {
      await this.cleanupLogSession(sessionId)
    }
    await this._connectionManager.shutdown()
  }

  async _handleReconnect () {
    for (const execId of this.execBridges.keys()) {
      await this.rebindSessionBridges(execId)
    }
    for (const sessionId of this.logBridges.keys()) {
      await this.rebindLogSessionBridges(sessionId)
    }
  }

  async rebindSessionBridges (execId) {
    if (this.rebinding.has(execId)) return
    this.rebinding.add(execId)

    try {
      const bridge = this.execBridges.get(execId)
      if (!bridge || !bridge.session) return

      logger.info('[NATS][RELAY] Rebinding exec session subscriptions after reconnect', { execId })

      this._closeExecBridge(bridge)
      bridge.subscriptions = {}
      bridge.sockets = {}

      const nc = await this._connectionManager.getConnection()
      const session = bridge.session
      if (session.user) {
        await this._ensureExecSubscription(bridge, 'user', session.user, nc)
      }
      if (session.agent) {
        await this._ensureExecSubscription(bridge, 'agent', session.agent, nc)
      }

      for (const cb of this.recoveryCallbacks) {
        try {
          cb(execId, { kind: 'exec' })
        } catch (error) {
          logger.error('[NATS][RELAY] Exec recovery callback failed', {
            execId,
            error: error.message
          })
        }
      }
    } finally {
      this.rebinding.delete(execId)
    }
  }

  async rebindLogSessionBridges (sessionId) {
    const key = `log:${sessionId}`
    if (this.rebinding.has(key)) return
    this.rebinding.add(key)

    try {
      const bridge = this.logBridges.get(sessionId)
      if (!bridge || !bridge.session) return

      logger.info('[NATS][RELAY] Rebinding log session subscription after reconnect', { sessionId })

      if (bridge.subscription) {
        try {
          await bridge.subscription.drain()
        } catch (error) {
          logger.debug('[NATS][RELAY] Failed to drain log subscription during rebind', {
            sessionId,
            error: error.message
          })
        }
        bridge.subscription = null
      }

      const session = bridge.session
      if (session.user) {
        const nc = await this._connectionManager.getConnection()
        await this._ensureLogUserSubscription(bridge, session.user, nc)
      }

      for (const cb of this.recoveryCallbacks) {
        try {
          cb(sessionId, { kind: 'log' })
        } catch (error) {
          logger.error('[NATS][RELAY] Log recovery callback failed', {
            sessionId,
            error: error.message
          })
        }
      }
    } finally {
      this.rebinding.delete(key)
    }
  }

  _closeExecBridge (bridge) {
    for (const side of Object.keys(bridge.subscriptions || {})) {
      const sub = bridge.subscriptions[side]
      if (!sub) continue
      try {
        sub.unsubscribe()
      } catch (error) {
        logger.debug('[NATS][RELAY] Failed to unsubscribe exec side during cleanup', {
          execId: bridge.execId,
          side,
          error: error.message
        })
      }
    }
    bridge.subscriptions = {}
  }

  async _ensureExecSubscription (bridge, side, socket, nc) {
    if (!socket) return

    bridge.sockets[side] = socket
    if (bridge.subscriptions[side]) {
      return
    }

    const subject = side === 'agent' ? execAgentSubject(bridge.execId) : execUserSubject(bridge.execId)
    logger.info('[NATS][RELAY] Subscribing exec relay subject', {
      execId: bridge.execId,
      side,
      subject
    })

    const sub = nc.subscribe(subject, {
      callback: (err, msg) => {
        if (err) {
          logger.error('[NATS][RELAY] Exec subscription error', {
            execId: bridge.execId,
            side,
            error: err.message
          })
          return
        }
        this._handleExecMessage(bridge, side, msg).catch((error) => {
          logger.error('[NATS][RELAY] Failed to handle exec relay message', {
            execId: bridge.execId,
            side,
            error: error.message
          })
        })
      }
    })

    bridge.subscriptions[side] = sub
  }

  async _handleExecMessage (bridge, side, msg) {
    const currentBridge = this.execBridges.get(bridge.execId)
    if (!currentBridge) return

    const ws = currentBridge.sockets[side]
    const body = getBufferFromData(msg.data)
    const msgTypeHeader = msg.headers ? msg.headers.get(HEADER_MESSAGE_TYPE) : null
    const msgType = msgTypeHeader != null && msgTypeHeader !== '' ? Number(msgTypeHeader) : null

    if (msgType === MESSAGE_TYPES.CLOSE) {
      await this._handleCloseMessage({
        bridge: currentBridge,
        session: currentBridge.session,
        side,
        ws,
        msg,
        body
      })
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(body, { binary: true, compress: false, mask: false, fin: true })
      logger.debug('[NATS][RELAY] Delivered exec message to socket', {
        execId: bridge.execId,
        side,
        messageSize: body.length
      })
    } else {
      logger.debug('[NATS][RELAY] No socket available for exec delivery', {
        execId: bridge.execId,
        side,
        hasSocket: !!ws,
        socketState: ws ? ws.readyState : 'N/A'
      })
    }
  }

  async _handleCloseMessage ({ bridge, session, side, ws, msg, body }) {
    const execId = session.execId
    const closeInitiator = side === 'user' ? 'agent' : 'user'
    const closeAck = Boolean(msg.headers && msg.headers.get(HEADER_CLOSE_ACK) === 'true')

    logger.info('[NATS][RELAY] Received CLOSE message via relay', {
      execId,
      side,
      closeInitiator,
      closeAck
    })

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const reason = closeInitiator === 'agent' ? 'Agent closed connection' : 'User closed connection'
        ws.close(1000, reason)
      } catch (error) {
        logger.warn('[NATS][RELAY] Failed to close WebSocket after CLOSE message', {
          execId,
          side,
          error: error.message
        })
      }
    }

    if (!closeAck && this.execBridges.has(execId)) {
      const ackSide = side === 'user' ? 'agent' : 'user'
      try {
        const hdrs = natsHeaders()
        hdrs.set(HEADER_MESSAGE_TYPE, String(MESSAGE_TYPES.CLOSE))
        hdrs.set(HEADER_CLOSE_ACK, 'true')
        const subject = ackSide === 'agent' ? execAgentSubject(execId) : execUserSubject(execId)
        await this._publish(subject, body, { headers: hdrs }, execId)
      } catch (error) {
        logger.warn('[NATS][RELAY] Failed to send CLOSE acknowledgement', {
          execId,
          ackSide,
          error: error.message
        })
      }
    }

    if (bridge && bridge.cleanupCallback) {
      try {
        await bridge.cleanupCallback(execId)
      } catch (error) {
        logger.error('[NATS][RELAY] Error in cleanup callback during CLOSE handling', {
          execId,
          error: error.message
        })
      }
    }
  }

  async _ensureLogUserSubscription (bridge, userWs, nc) {
    bridge.session.user = userWs
    if (bridge.subscription) {
      return
    }

    const subject = logUserSubject(bridge.sessionId)
    logger.info('[NATS][RELAY] Subscribing log relay subject', {
      sessionId: bridge.sessionId,
      subject
    })

    bridge.pendingBytes = 0
    bridge.pendingMessages = 0

    const sub = nc.subscribe(subject, {
      callback: (err, msg) => {
        if (err) {
          logger.error('[NATS][RELAY] Log subscription error', {
            sessionId: bridge.sessionId,
            error: err.message
          })
          return
        }
        this._handleLogMessage(bridge, msg).catch((error) => {
          logger.error('[NATS][RELAY] Failed to handle log relay message', {
            sessionId: bridge.sessionId,
            error: error.message
          })
        })
      }
    })

    bridge.subscription = sub
  }

  async _handleLogMessage (bridge, msg) {
    const currentBridge = this.logBridges.get(bridge.sessionId)
    if (!currentBridge) return

    const ws = currentBridge.session && currentBridge.session.user
    const body = getBufferFromData(msg.data)
    const messageType = decodeLogMessageType(body)
    const isLogLine = messageType === LOG_MESSAGE_TYPES.LOG_LINE

    currentBridge.pendingBytes += body.length
    currentBridge.pendingMessages += 1

    const overPendingLimits =
      currentBridge.pendingBytes > this.maxPendingBytes ||
      currentBridge.pendingMessages > this.maxPendingMessages

    if (isLogLine && overPendingLimits) {
      currentBridge.pendingBytes = Math.max(0, currentBridge.pendingBytes - body.length)
      currentBridge.pendingMessages = Math.max(0, currentBridge.pendingMessages - 1)
      this._dropLogLineForReceiveBackpressure(currentBridge, bridge.sessionId)
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      if (isLogLine && ws.bufferedAmount > LOG_BACKPRESSURE_BUFFER_BYTES) {
        currentBridge.pendingBytes = Math.max(0, currentBridge.pendingBytes - body.length)
        currentBridge.pendingMessages = Math.max(0, currentBridge.pendingMessages - 1)
        this._dropLogLineForReceiveBackpressure(currentBridge, bridge.sessionId)
        return
      }

      ws.send(body, { binary: true })
      currentBridge.pendingBytes = Math.max(0, currentBridge.pendingBytes - body.length)
      currentBridge.pendingMessages = Math.max(0, currentBridge.pendingMessages - 1)
    } else {
      currentBridge.pendingBytes = Math.max(0, currentBridge.pendingBytes - body.length)
      currentBridge.pendingMessages = Math.max(0, currentBridge.pendingMessages - 1)
    }
  }

  _dropLogLineForReceiveBackpressure (bridge, sessionId) {
    if (!bridge.backpressureNotified) {
      bridge.backpressureNotified = true
      logger.warn('[NATS][RELAY] Dropping log line due to subscription backpressure', { sessionId })
      this._notifyLogBackpressure(bridge, sessionId)
    }
  }

  _dropLogLineForPublishBackpressure (bridge, sessionId) {
    if (!bridge.backpressureNotified) {
      bridge.backpressureNotified = true
      logger.warn('[NATS][RELAY] Dropping log line due to publish-side backpressure', { sessionId })
      this._notifyLogBackpressure(bridge, sessionId)
    }
  }

  _notifyLogBackpressure (bridge, sessionId) {
    const user = bridge.session && bridge.session.user
    if (user && user.readyState === WebSocket.OPEN) {
      try {
        const errorBody = msgpack.encode({
          type: LOG_MESSAGE_TYPES.LOG_ERROR,
          data: Buffer.from('Log stream backpressure: dropping lines until client catches up\n'),
          sessionId,
          timestamp: Date.now()
        })
        user.send(errorBody, { binary: true })
      } catch (error) {
        logger.debug('[NATS][RELAY] Failed to notify user of log backpressure', {
          sessionId,
          error: error.message
        })
      }
    }
  }

  async _publishExec (execId, subject, buffer, options = {}) {
    const hdrs = natsHeaders()
    const hasMessageType = Object.prototype.hasOwnProperty.call(options, 'messageType')
    const messageType = hasMessageType ? options.messageType : null
    if (messageType !== null && messageType !== undefined) {
      hdrs.set(HEADER_MESSAGE_TYPE, String(messageType))
    }

    const applicationProperties = (options && options.applicationProperties) || {}
    if (applicationProperties.closeAck) {
      hdrs.set(HEADER_CLOSE_ACK, 'true')
    }

    await this._publish(subject, buffer, { headers: hdrs }, execId)
  }

  async _publish (subject, buffer, opts = {}, sessionKey = null) {
    const nc = await this._connectionManager.getConnection()
    nc.publish(subject, buffer, opts)

    const flushPromise = nc.flush()
    const timeoutMs = this.publishTimeoutMs
    let timer = null
    try {
      await Promise.race([
        flushPromise,
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`NATS publish not flushed within ${timeoutMs}ms`))
          }, timeoutMs)
        })
      ])
    } catch (error) {
      logger.error('[NATS][RELAY] Failed to publish message', {
        subject,
        sessionKey,
        error: error.message
      })
      throw error
    } finally {
      if (timer) clearTimeout(timer)
    }

    logger.debug('[NATS][RELAY] Published relay message', {
      subject,
      sessionKey,
      messageSize: buffer.length
    })
  }
}

const singleton = new NatsRelayTransportImpl()

module.exports = singleton
module.exports.NatsRelayTransportImpl = NatsRelayTransportImpl
module.exports.execAgentSubject = execAgentSubject
module.exports.execUserSubject = execUserSubject
module.exports.logUserSubject = logUserSubject

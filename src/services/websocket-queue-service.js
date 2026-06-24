const WebSocket = require('ws')
const logger = require('../logger')
const RouterConnectionService = require('./router-connection-service')
const { recordAmqpPublishError } = require('../websocket/ws-metrics')
const msgpack = require('@msgpack/msgpack')

// Plan 16-C: drop LOG_LINE when user WS buffer exceeds threshold (see forwardLogToUser).
const LOG_BACKPRESSURE_BUFFER_BYTES = 256 * 1024
const LOG_MESSAGE_TYPES = { LOG_ERROR: 9 }

const MESSAGE_TYPES = {
  STDIN: 0,
  STDOUT: 1,
  STDERR: 2,
  CONTROL: 3,
  CLOSE: 4,
  ACTIVATION: 5
}

const MESSAGE_QUEUE_PREFIX = {
  agent: 'agent',
  user: 'user'
}

function buildQueueName (prefix, execId) {
  return `${prefix}-${execId}`
}

function getBufferFromBody (body) {
  if (!body) return Buffer.alloc(0)
  if (Buffer.isBuffer(body)) return body
  if (body.type === 'Buffer' && Array.isArray(body.data)) {
    return Buffer.from(body.data)
  }
  if (typeof body === 'string') {
    return Buffer.from(body, 'utf8')
  }
  return Buffer.from(body)
}

class WebSocketQueueService {
  constructor () {
    this.execBridges = new Map()
    this.logBridges = new Map() // New: for log sessions
  }

  async enableForSession (session, cleanupCallback) {
    const execId = session.execId
    if (!execId) {
      logger.warn('[AMQP][QUEUE] Missing execId for session, skipping queue bridge enablement')
      return false
    }

    const bridge = this.execBridges.get(execId) || {
      execId,
      senders: {},
      receivers: {},
      cleanupCallback: null
    }

    // Store cleanup callback for CLOSE message handling
    if (cleanupCallback) {
      bridge.cleanupCallback = cleanupCallback
    }

    if (session.user) {
      await this._ensureReceiver(bridge, 'user', session.user, session)
    }
    if (session.agent) {
      await this._ensureReceiver(bridge, 'agent', session.agent, session)
    }
    this.execBridges.set(execId, bridge)
    return true
  }

  shouldUseQueue (execId) {
    return this.execBridges.has(execId)
  }

  async publishToAgent (execId, buffer, options = {}) {
    await this._send(execId, 'agent', buffer, options)
  }

  async publishToUser (execId, buffer, options = {}) {
    await this._send(execId, 'user', buffer, options)
  }

  async cleanup (execId) {
    const bridge = this.execBridges.get(execId)
    if (!bridge) return

    this._closeBridgeLinks(bridge, execId)
    this.execBridges.delete(execId)
  }

  _closeBridgeLinks (bridge, sessionKey) {
    const closeLink = (linkWrapper) => {
      if (!linkWrapper) return
      try {
        if (linkWrapper.receiver) {
          linkWrapper.receiver.removeAllListeners()
          linkWrapper.receiver.close()
        } else if (linkWrapper.sender) {
          linkWrapper.sender.removeAllListeners()
          linkWrapper.sender.close()
        }
      } catch (error) {
        logger.debug('[AMQP][QUEUE] Failed to close link during cleanup', {
          sessionKey,
          error: error.message
        })
      }
    }

    closeLink(bridge.receivers?.agent)
    closeLink(bridge.receivers?.user)
    closeLink(bridge.senders?.agent)
    closeLink(bridge.senders?.user)
  }

  _invalidateExecSender (bridge, side) {
    if (bridge.senders[side]) {
      bridge.senders[side] = null
    }
  }

  _invalidateExecReceiver (bridge, side) {
    if (bridge.receivers[side]) {
      bridge.receivers[side] = null
    }
  }

  _attachSenderLifecycle (bridge, side, sender, execId) {
    sender.on('sender_close', () => {
      logger.warn('[AMQP][QUEUE] Exec sender closed', { execId, side })
      this._invalidateExecSender(bridge, side)
    })
    sender.on('error', (context) => {
      logger.error('[AMQP][QUEUE] Exec sender error', {
        execId,
        side,
        error: context.error ? context.error.message : 'unknown'
      })
      recordAmqpPublishError({ sessionType: 'exec', side })
      this._invalidateExecSender(bridge, side)
    })
  }

  _attachReceiverLifecycle (bridge, side, receiver, execId) {
    receiver.on('receiver_close', () => {
      logger.info('[AMQP][QUEUE] Receiver closed', { execId, side })
      this._invalidateExecReceiver(bridge, side)
    })
    receiver.on('error', (context) => {
      logger.error('[AMQP][QUEUE] Exec receiver error', {
        execId,
        side,
        error: context.error ? context.error.message : 'unknown'
      })
      recordAmqpPublishError({ sessionType: 'exec', side })
      this._invalidateExecReceiver(bridge, side)
    })
  }

  detachSocket (execId, side) {
    const bridge = this.execBridges.get(execId)
    if (!bridge || !bridge.receivers[side]) return
    bridge.receivers[side].socket = null
  }

  async _send (execId, side, buffer, options = {}) {
    const bridge = await this._ensureSender(execId, side)
    if (!bridge) {
      throw new Error('Queue bridge missing for execId=' + execId)
    }
    try {
      const message = {
        body: buffer,
        content_type: 'application/octet-stream'
      }

      const applicationProperties = { ...((options && options.applicationProperties) || {}) }
      const hasMessageType = options && Object.prototype.hasOwnProperty.call(options, 'messageType')
      const messageType = hasMessageType ? options.messageType : null
      if (messageType !== null) {
        applicationProperties.messageType = messageType
      }
      if (Object.keys(applicationProperties).length > 0) {
        message.application_properties = applicationProperties
      }

      bridge.sender.send(message)
      logger.debug('[AMQP][QUEUE] Published message to queue', {
        execId,
        side,
        messageSize: buffer.length,
        messageType: messageType !== null ? messageType : 'normal'
      })
    } catch (error) {
      recordAmqpPublishError({ sessionType: 'exec', side })
      logger.error('[AMQP][QUEUE] Failed to publish message', { execId, side, error: error.message })
      const execBridge = this.execBridges.get(execId)
      if (execBridge) {
        this._invalidateExecSender(execBridge, side)
      }
      throw error
    }
  }

  async _ensureSender (execId, side) {
    const bridge = this.execBridges.get(execId)
    if (!bridge) return null
    if (bridge.senders[side] && bridge.senders[side].sender) {
      return bridge.senders[side]
    }
    bridge.senders[side] = null

    const queueName = buildQueueName(
      side === 'agent' ? MESSAGE_QUEUE_PREFIX.agent : MESSAGE_QUEUE_PREFIX.user,
      execId
    )
    const connection = await RouterConnectionService.getConnection()
    const sender = await new Promise((resolve, reject) => {
      const link = connection.open_sender({
        target: {
          address: queueName,
          durable: 0,
          expiry_policy: 'link-detach'
        },
        autosettle: true
      })

      link.once('sender_open', () => resolve(link))
      link.once('sender_close', (context) => reject(context.error || new Error('Sender closed before open')))
      link.once('error', reject)
    })

    this._attachSenderLifecycle(bridge, side, sender, execId)

    bridge.senders[side] = { sender }
    return bridge.senders[side]
  }

  async _ensureReceiver (bridge, side, socket, session) {
    if (!socket) return
    if (bridge.receivers[side]) {
      // Update socket reference if receiver already exists
      bridge.receivers[side].socket = socket
      logger.debug('[AMQP][QUEUE] Updated socket reference for existing receiver', {
        execId: session.execId,
        side,
        socketState: socket.readyState
      })
      return
    }

    const queueName = buildQueueName(
      side === 'agent' ? MESSAGE_QUEUE_PREFIX.agent : MESSAGE_QUEUE_PREFIX.user,
      session.execId
    )
    logger.info('[AMQP][QUEUE] Setting up receiver for queue', {
      execId: session.execId,
      side,
      queueName
    })
    const connection = await RouterConnectionService.getConnection()

    const receiver = await new Promise((resolve, reject) => {
      const link = connection.open_receiver({
        source: {
          address: queueName,
          durable: 0,
          expiry_policy: 'link-detach'
        },
        credit_window: 50
      })
      link.once('receiver_open', () => {
        logger.info('[AMQP][QUEUE] Receiver opened successfully', {
          execId: session.execId,
          side,
          queueName
        })
        resolve(link)
      })
      link.once('receiver_close', (context) => reject(context.error || new Error('Receiver closed before open')))
      link.once('error', reject)
    })

    this._attachReceiverLifecycle(bridge, side, receiver, session.execId)

    receiver.on('message', async (context) => {
      try {
        // Always get the latest socket reference from the bridge
        const currentBridge = this.execBridges.get(session.execId)
        const ws = currentBridge && currentBridge.receivers[side] ? currentBridge.receivers[side].socket : null
        const body = getBufferFromBody(context.message.body)
        const msgType = context.message.application_properties
          ? context.message.application_properties.messageType
          : null

        // Handle CLOSE messages (works for both user and agent sides)
        if (msgType === MESSAGE_TYPES.CLOSE) {
          await this._handleCloseMessage({
            bridge: currentBridge,
            session,
            side,
            ws,
            context,
            body
          })
          return
        }

        // Forward message to socket (normal message or non-CLOSE message)
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(body, {
              binary: true,
              compress: false,
              mask: false,
              fin: true
            })
            context.delivery.accept()
            logger.debug('[AMQP][QUEUE] Delivered message to socket', {
              execId: session.execId,
              side,
              messageSize: body.length
            })
          } catch (error) {
            logger.error('[AMQP][QUEUE] Failed to deliver message to socket', {
              execId: session.execId,
              side,
              error: error.message
            })
            context.delivery.release()
          }
        } else {
          logger.debug('[AMQP][QUEUE] No socket available for message delivery', {
            execId: session.execId,
            side,
            hasSocket: !!ws,
            socketState: ws ? ws.readyState : 'N/A',
            hasBridge: !!currentBridge,
            hasReceiver: currentBridge && !!currentBridge.receivers[side]
          })
          context.delivery.release()
        }
      } catch (error) {
        logger.error('[AMQP][QUEUE] Error handling queued message', {
          execId: session.execId,
          side,
          error: error.message
        })
        try {
          context.delivery.release()
        } catch (releaseError) {
          logger.warn('[AMQP][QUEUE] Failed to release delivery after error', {
            execId: session.execId,
            error: releaseError.message
          })
        }
      }
    })

    bridge.receivers[side] = { receiver, socket }
    logger.info('[AMQP][QUEUE] Receiver setup complete', {
      execId: session.execId,
      side,
      queueName,
      socketState: socket.readyState
    })
  }

  async _handleCloseMessage ({ bridge, session, side, ws, context, body }) {
    const execId = session.execId
    const closeInitiator = side === 'user' ? 'agent' : 'user'
    const closeAck = Boolean(
      context.message.application_properties &&
      context.message.application_properties.closeAck
    )
    logger.info('[AMQP][QUEUE] Received CLOSE message via queue', {
      execId,
      side,
      closeInitiator,
      closeAck
    })

    // Attempt to close the socket gracefully (if present)
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const reason = closeInitiator === 'agent' ? 'Agent closed connection' : 'User closed connection'
        ws.close(1000, reason)
        logger.debug('[AMQP][QUEUE] Closed WebSocket with code 1000 after CLOSE message', {
          execId,
          side
        })
      } catch (error) {
        logger.warn('[AMQP][QUEUE] Failed to close WebSocket after CLOSE message', {
          execId,
          side,
          error: error.message
        })
      }
    } else {
      logger.debug('[AMQP][QUEUE] No active socket while handling CLOSE message', {
        execId,
        side,
        hasSocket: !!ws,
        socketState: ws ? ws.readyState : 'N/A'
      })
    }

    context.delivery.accept()

    if (!closeAck && this.execBridges.has(execId)) {
      const ackSide = side === 'user' ? 'agent' : 'user'
      try {
        await this._send(execId, ackSide, body, {
          messageType: MESSAGE_TYPES.CLOSE,
          applicationProperties: { closeAck: true }
        })
        logger.debug('[AMQP][QUEUE] Sent CLOSE acknowledgement', {
          execId,
          ackSide
        })
      } catch (error) {
        logger.warn('[AMQP][QUEUE] Failed to send CLOSE acknowledgement', {
          execId,
          ackSide,
          error: error.message
        })
      }
    }

    // Invoke cleanup callback to remove session/queue resources
    if (bridge && bridge.cleanupCallback) {
      try {
        await bridge.cleanupCallback(execId)
      } catch (error) {
        logger.error('[AMQP][QUEUE] Error in cleanup callback during CLOSE handling', {
          execId,
          error: error.message
        })
      }
    }
  }

  // ========== Log Session Queue Methods ==========

  // Enable queue bridge for log session (unidirectional: agent → user, one-to-one)
  // Following exec session pattern: Use queues for ALL scenarios
  // Each sessionId has its own queues (one-to-one, like exec sessions)
  async enableForLogSession (session, cleanupCallback) {
    const sessionId = session.sessionId
    if (!sessionId) {
      logger.warn('[AMQP][QUEUE] Missing sessionId for log session, skipping queue bridge enablement')
      return false
    }

    const bridge = this.logBridges.get(sessionId) || {
      sessionId,
      agentSender: null,
      agentReceiver: null,
      userReceiver: null, // Single user receiver (one-to-one)
      userSender: null, // User queue sender
      cleanupCallback: null
    }

    if (cleanupCallback) {
      bridge.cleanupCallback = cleanupCallback
    }

    // Agent side: single receiver (agent receives from queue)
    if (session.agent) {
      await this._ensureLogAgentReceiver(bridge, session.agent, session)
    }

    // User side: single receiver (one-to-one, like exec sessions)
    if (session.user) {
      await this._ensureLogUserReceiver(bridge, session.user, session)
    }

    this.logBridges.set(sessionId, bridge)
    return true
  }

  shouldUseQueueForLogs (sessionId) {
    return this.logBridges.has(sessionId)
  }

  // Forward to user via queue (one-to-one, like exec sessions)
  // Note: Exec sessions use queues for BOTH single and multi-replica
  // We follow the same pattern for consistency
  // Buffer is already MessagePack encoded from agent
  async publishLogToUser (sessionId, buffer, options = {}) {
    const bridge = this.logBridges.get(sessionId)
    if (!bridge) {
      throw new Error(`Log bridge missing for sessionId=${sessionId}`)
    }

    // Ensure user queue sender exists
    if (!bridge.userSender) {
      const userQueueName = `logs-user-${sessionId}`
      const connection = await RouterConnectionService.getConnection()
      const sender = await new Promise((resolve, reject) => {
        const link = connection.open_sender({
          target: {
            address: userQueueName,
            durable: 0,
            expiry_policy: 'link-detach'
          },
          autosettle: true
        })

        link.once('sender_open', () => resolve(link))
        link.once('sender_close', reject)
        link.once('error', reject)
      })
      bridge.userSender = { sender }
    }

    // Buffer is already MessagePack encoded, send as binary
    const message = {
      body: buffer, // MessagePack encoded buffer
      content_type: 'application/octet-stream',
      application_properties: options.applicationProperties || {}
    }

    try {
      bridge.userSender.sender.send(message)
      logger.debug('[AMQP][QUEUE] Published log message to user queue', {
        sessionId,
        messageSize: buffer.length
      })
    } catch (error) {
      recordAmqpPublishError({ sessionType: 'log', side: 'user' })
      logger.error('[AMQP][QUEUE] Failed to publish log message to user queue', {
        sessionId,
        error: error.message
      })
      bridge.userSender = null
      throw error
    }
  }

  // Setup receiver for agent queue (one-to-one per sessionId)
  async _ensureLogAgentReceiver (bridge, agentWs, session) {
    if (bridge.agentReceiver) {
      bridge.agentReceiver.socket = agentWs
      return
    }

    // Queue name per sessionId (one-to-one)
    const queueName = `logs-agent-${session.sessionId}`
    const connection = await RouterConnectionService.getConnection()

    const receiver = await new Promise((resolve, reject) => {
      const link = connection.open_receiver({
        source: {
          address: queueName,
          durable: 0,
          expiry_policy: 'link-detach'
        },
        credit_window: 50
      })

      link.once('receiver_open', () => resolve(link))
      link.once('receiver_close', reject)
      link.once('error', reject)
    })

    receiver.on('message', async (context) => {
      const currentBridge = this.logBridges.get(session.sessionId)
      const ws = currentBridge && currentBridge.agentReceiver ? currentBridge.agentReceiver.socket : null
      const body = getBufferFromBody(context.message.body)

      // Body is already MessagePack encoded from agent
      // Forward directly to agent WebSocket (binary)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(body, { binary: true })
        context.delivery.accept()
      } else {
        context.delivery.release()
      }
    })

    bridge.agentReceiver = { receiver, socket: agentWs }
  }

  // Setup sender for agent queue (one-to-one per sessionId)
  async _ensureLogAgentSender (sessionId) {
    const bridge = this.logBridges.get(sessionId)
    if (!bridge) return null
    if (bridge.agentSender) return bridge.agentSender

    // Queue name per sessionId (one-to-one)
    const queueName = `logs-agent-${sessionId}`
    const connection = await RouterConnectionService.getConnection()

    const sender = await new Promise((resolve, reject) => {
      const link = connection.open_sender({
        target: {
          address: queueName,
          durable: 0,
          expiry_policy: 'link-detach'
        },
        autosettle: true
      })

      link.once('sender_open', () => resolve(link))
      link.once('sender_close', reject)
      link.once('error', reject)
    })

    bridge.agentSender = { sender }
    return bridge.agentSender
  }

  // Setup receiver for user queue (one-to-one, like exec session pattern)
  async _ensureLogUserReceiver (bridge, userWs, session) {
    if (bridge.userReceiver) {
      bridge.userReceiver.socket = userWs
      return
    }

    // Queue name per sessionId (one-to-one)
    const queueName = `logs-user-${session.sessionId}`
    const connection = await RouterConnectionService.getConnection()

    const receiver = await new Promise((resolve, reject) => {
      const link = connection.open_receiver({
        source: {
          address: queueName,
          durable: 0,
          expiry_policy: 'link-detach'
        },
        credit_window: 50
      })

      link.once('receiver_open', () => resolve(link))
      link.once('receiver_close', reject)
      link.once('error', reject)
    })

    receiver.on('message', async (context) => {
      const currentBridge = this.logBridges.get(session.sessionId)
      const ws = currentBridge && currentBridge.userReceiver ? currentBridge.userReceiver.socket : null
      const body = getBufferFromBody(context.message.body)

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (ws.bufferedAmount > LOG_BACKPRESSURE_BUFFER_BYTES) {
          if (!currentBridge.backpressureNotified) {
            currentBridge.backpressureNotified = true
            try {
              const errorBody = msgpack.encode({
                type: LOG_MESSAGE_TYPES.LOG_ERROR,
                data: Buffer.from('Log stream backpressure: dropping lines until client catches up\n'),
                sessionId: session.sessionId,
                timestamp: Date.now()
              })
              ws.send(errorBody, { binary: true })
            } catch (error) {
              logger.debug('[AMQP][QUEUE] Failed to notify user of log backpressure', {
                sessionId: session.sessionId,
                error: error.message
              })
            }
          }
          context.delivery.release()
          return
        }
        ws.send(body, { binary: true })
        context.delivery.accept()
      } else {
        context.delivery.release()
      }
    })

    bridge.userReceiver = { receiver, socket: userWs }
  }

  // Cleanup log session (one-to-one)
  async cleanupLogSession (sessionId) {
    const bridge = this.logBridges.get(sessionId)
    if (!bridge) return

    const closeLink = (linkWrapper) => {
      if (!linkWrapper) return
      try {
        if (linkWrapper.receiver) {
          linkWrapper.receiver.removeAllListeners()
          linkWrapper.receiver.close()
        } else if (linkWrapper.sender) {
          linkWrapper.sender.removeAllListeners()
          linkWrapper.sender.close()
        }
      } catch (error) {
        logger.debug('[AMQP][QUEUE] Failed to close log link during cleanup', { sessionId, error: error.message })
      }
    }

    closeLink(bridge.agentReceiver)
    closeLink(bridge.agentSender)
    closeLink(bridge.userReceiver)
    closeLink(bridge.userSender)

    if (bridge.cleanupCallback) {
      bridge.cleanupCallback = null
    }

    this.logBridges.delete(sessionId)
  }
}

module.exports = new WebSocketQueueService()

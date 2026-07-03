const WsRelayTransport = require('./ws-relay-transport')
const WebSocketQueueService = require('./websocket-queue-service')
const RouterConnectionManager = require('./router-connection-manager')

class AmqpRelayTransport extends WsRelayTransport {
  constructor (queueService = WebSocketQueueService) {
    super()
    this._queueService = queueService
    this._recoveryCallbacks = []

    this._queueService.onRecovery((sessionId, meta) => {
      for (const cb of this._recoveryCallbacks) {
        try {
          cb(sessionId, meta)
        } catch (error) {
          // Queue service already logs; swallow to protect other callbacks.
        }
      }
    })
  }

  getTransport () {
    return 'amqp'
  }

  async isAvailable () {
    return RouterConnectionManager.isRouterAvailable()
  }

  async enableForSession (session, cleanupCb) {
    return this._queueService.enableForSession(session, cleanupCb)
  }

  async enableForLogSession (session, cleanupCb) {
    return this._queueService.enableForLogSession(session, cleanupCb)
  }

  async publishToAgent (execId, buffer, opts) {
    return this._queueService.publishToAgent(execId, buffer, opts)
  }

  async publishToUser (execId, buffer, opts) {
    return this._queueService.publishToUser(execId, buffer, opts)
  }

  async publishLogToUser (sessionId, buffer) {
    return this._queueService.publishLogToUser(sessionId, buffer)
  }

  shouldUseRelay (execId) {
    return this._queueService.shouldUseQueue(execId)
  }

  setExecUserDeliveryHook (execId, hook) {
    if (typeof this._queueService.setExecUserDeliveryHook === 'function') {
      this._queueService.setExecUserDeliveryHook(execId, hook)
    }
  }

  setExecAgentDeliveryHook (execId, hook) {
    if (typeof this._queueService.setExecAgentDeliveryHook === 'function') {
      this._queueService.setExecAgentDeliveryHook(execId, hook)
    }
  }

  setLogUserDeliveryHook (sessionId, hook) {
    if (typeof this._queueService.setLogUserDeliveryHook === 'function') {
      this._queueService.setLogUserDeliveryHook(sessionId, hook)
    }
  }

  shouldUseRelayForLogs (sessionId) {
    return this._queueService.shouldUseQueueForLogs(sessionId)
  }

  async cleanup (execId) {
    return this._queueService.cleanup(execId)
  }

  async cleanupLogSession (sessionId) {
    return this._queueService.cleanupLogSession(sessionId)
  }

  async shutdown () {
    return this._queueService.shutdown()
  }

  onRecovery (cb) {
    if (typeof cb === 'function') {
      this._recoveryCallbacks.push(cb)
    }
  }
}

module.exports = AmqpRelayTransport

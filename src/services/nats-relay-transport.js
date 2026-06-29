const WsRelayTransport = require('./ws-relay-transport')
const NatsRelayTransportImpl = require('./nats-relay-transport-impl')

class NatsRelayTransport extends WsRelayTransport {
  constructor (transportImpl = NatsRelayTransportImpl) {
    super()
    this._impl = transportImpl
    this._recoveryCallbacks = []

    this._impl.onRecovery((sessionId, meta) => {
      for (const cb of this._recoveryCallbacks) {
        try {
          cb(sessionId, meta)
        } catch (error) {
          // Impl already logs; protect other callbacks.
        }
      }
    })
  }

  getTransport () {
    return 'nats'
  }

  async isAvailable () {
    return this._impl.isAvailable()
  }

  async enableForSession (session, cleanupCb) {
    return this._impl.enableForSession(session, cleanupCb)
  }

  async enableForLogSession (session, cleanupCb) {
    return this._impl.enableForLogSession(session, cleanupCb)
  }

  async publishToAgent (execId, buffer, opts) {
    return this._impl.publishToAgent(execId, buffer, opts)
  }

  async publishToUser (execId, buffer, opts) {
    return this._impl.publishToUser(execId, buffer, opts)
  }

  async publishLogToUser (sessionId, buffer) {
    return this._impl.publishLogToUser(sessionId, buffer)
  }

  shouldUseRelay (execId) {
    return this._impl.shouldUseRelay(execId)
  }

  shouldUseRelayForLogs (sessionId) {
    return this._impl.shouldUseRelayForLogs(sessionId)
  }

  async cleanup (execId) {
    return this._impl.cleanup(execId)
  }

  async cleanupLogSession (sessionId) {
    return this._impl.cleanupLogSession(sessionId)
  }

  async shutdown () {
    return this._impl.shutdown()
  }

  onRecovery (cb) {
    if (typeof cb === 'function') {
      this._recoveryCallbacks.push(cb)
    }
  }
}

module.exports = NatsRelayTransport

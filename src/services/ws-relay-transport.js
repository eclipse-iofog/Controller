/**
 * Cross-replica exec/log relay transport interface (Plan 18).
 * Implementations: AmqpRelayTransport, NatsRelayTransport (18-D).
 */
class WsRelayTransport {
  /**
   * @returns {'amqp' | 'nats'}
   */
  getTransport () {
    throw new Error('WsRelayTransport.getTransport() not implemented')
  }

  /**
   * Lazy health check for session fail-fast.
   * @returns {Promise<boolean>}
   */
  async isAvailable () {
    throw new Error('WsRelayTransport.isAvailable() not implemented')
  }

  /**
   * @param {Object} session
   * @param {Function} [cleanupCb]
   * @returns {Promise<boolean>}
   */
  async enableForSession (session, cleanupCb) {
    throw new Error('WsRelayTransport.enableForSession() not implemented')
  }

  /**
   * @param {Object} session
   * @param {Function} [cleanupCb]
   * @returns {Promise<boolean>}
   */
  async enableForLogSession (session, cleanupCb) {
    throw new Error('WsRelayTransport.enableForLogSession() not implemented')
  }

  /**
   * @param {string} execId
   * @param {Buffer} buffer
   * @param {Object} [opts]
   */
  async publishToAgent (execId, buffer, opts) {
    throw new Error('WsRelayTransport.publishToAgent() not implemented')
  }

  /**
   * @param {string} execId
   * @param {Buffer} buffer
   * @param {Object} [opts]
   */
  async publishToUser (execId, buffer, opts) {
    throw new Error('WsRelayTransport.publishToUser() not implemented')
  }

  /**
   * @param {string} sessionId
   * @param {Buffer} buffer
   */
  async publishLogToUser (sessionId, buffer) {
    throw new Error('WsRelayTransport.publishLogToUser() not implemented')
  }

  /**
   * @param {string} execId
   * @returns {boolean}
   */
  shouldUseRelay (execId) {
    throw new Error('WsRelayTransport.shouldUseRelay() not implemented')
  }

  /**
   * @param {string} sessionId
   * @returns {boolean}
   */
  shouldUseRelayForLogs (sessionId) {
    throw new Error('WsRelayTransport.shouldUseRelayForLogs() not implemented')
  }

  /**
   * @param {string} execId
   */
  async cleanup (execId) {
    throw new Error('WsRelayTransport.cleanup() not implemented')
  }

  /**
   * @param {string} sessionId
   */
  async cleanupLogSession (sessionId) {
    throw new Error('WsRelayTransport.cleanupLogSession() not implemented')
  }

  /**
   * Drain on process shutdown.
   */
  async shutdown () {
    // Default no-op; implementations may override.
  }

  /**
   * Optional callback registration for bridge rebind after reconnect (18-B / 18-D).
   * @param {Function} _cb
   */
  onRecovery (_cb) {
    // Default no-op.
  }
}

module.exports = WsRelayTransport

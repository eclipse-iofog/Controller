const config = require('../config')
const logger = require('../logger')
const AmqpRelayTransport = require('./amqp-relay-transport')
const NatsRelayTransport = require('./nats-relay-transport')

let transportInstance = null
let resolvedTransportName = null

/**
 * Resolve singleton WsRelayTransport from nats.enabled (fixed at first call).
 * @param {Object} [configOverride] - Optional config for tests.
 * @returns {import('./ws-relay-transport')}
 */
function resolveTransport (configOverride) {
  const cfg = configOverride || config
  const useNats = cfg.getBoolean('nats.enabled', false)
  const transportName = useNats ? 'nats' : 'amqp'

  if (!transportInstance || resolvedTransportName !== transportName) {
    logger.info(`[RELAY] transport=${transportName}`)
    transportInstance = useNats
      ? new NatsRelayTransport()
      : new AmqpRelayTransport()
    resolvedTransportName = transportName
  }

  return transportInstance
}

function resetTransportForTests () {
  transportInstance = null
  resolvedTransportName = null
}

module.exports = {
  resolveTransport,
  resetTransportForTests
}

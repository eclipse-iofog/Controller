const Constants = require('./constants')
const Errors = require('./errors')

const DEFAULT_NATS_SERVER_PORT = 4222

function resolveNatsServerUrl ({ hostNetworkMode = false, localNats, hub }) {
  if (localNats) {
    const port = localNats.serverPort || DEFAULT_NATS_SERVER_PORT
    if (hostNetworkMode) {
      return `nats://localhost:${port}`
    }
    return `nats://${Constants.NATS_BRIDGE_DNS_SAN}:${port}`
  }

  if (!hub || !hub.host) {
    throw new Errors.ValidationError(
      'NATS hub not found. Cannot resolve NATS_SERVER_URL for a microservice without a local NATS instance.'
    )
  }

  const port = hub.serverPort || DEFAULT_NATS_SERVER_PORT
  return `nats://${hub.host}:${port}`
}

module.exports = {
  DEFAULT_NATS_SERVER_PORT,
  resolveNatsServerUrl
}

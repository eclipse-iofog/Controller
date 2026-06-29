const { metrics } = require('@opentelemetry/api')

const METER_NAME = 'iofog-controller-ws'
const METER_VERSION = '1.0.0'

let meter = null
let execSessionsActive = null
let logSessionsActive = null
let pendingPairings = null
let pairingDurationMs = null
let amqpPublishErrors = null
let routerPoolConnections = null
let routerPoolUnsettled = null
let amqpSessionSaturated = null

function getMeter () {
  if (!meter) {
    meter = metrics.getMeter(METER_NAME, METER_VERSION)
  }
  return meter
}

function initWsMetrics (routerConnectionManager) {
  const m = getMeter()

  execSessionsActive = m.createUpDownCounter('ws_exec_sessions_active', {
    description: 'Active exec WebSocket sessions on this replica'
  })
  logSessionsActive = m.createUpDownCounter('ws_log_sessions_active', {
    description: 'Active log WebSocket sessions on this replica'
  })
  pendingPairings = m.createUpDownCounter('ws_pending_pairings', {
    description: 'Exec sessions awaiting user or agent pairing'
  })
  pairingDurationMs = m.createHistogram('ws_pairing_duration_ms', {
    description: 'Time from pending to active exec session pairing',
    unit: 'ms'
  })
  amqpPublishErrors = m.createCounter('ws_amqp_publish_errors', {
    description: 'AMQP publish failures for exec/log relay'
  })
  amqpSessionSaturated = m.createCounter('ws_amqp_session_saturated', {
    description: 'AMQP relay saturation events (overflow / publish backpressure)'
  })

  if (routerConnectionManager) {
    routerPoolConnections = m.createObservableGauge('ws_router_pool_connections', {
      description: 'Healthy router AMQP pool connections on this replica'
    })
    routerPoolConnections.addCallback((result) => {
      const healthy = typeof routerConnectionManager.getHealthyPoolCount === 'function'
        ? routerConnectionManager.getHealthyPoolCount()
        : (routerConnectionManager.isConnected() ? 1 : 0)
      result.observe(healthy)
    })

    routerPoolUnsettled = m.createObservableGauge('ws_router_pool_unsettled', {
      description: 'Total unsettled AMQP deliveries across router pool slots'
    })
    routerPoolUnsettled.addCallback((result) => {
      const unsettled = typeof routerConnectionManager.getTotalUnsettled === 'function'
        ? routerConnectionManager.getTotalUnsettled()
        : 0
      result.observe(unsettled)
    })
  }
}

function recordExecSessionActive (delta) {
  execSessionsActive?.add(delta)
}

function recordLogSessionActive (delta) {
  logSessionsActive?.add(delta)
}

function recordPendingPairing (delta) {
  pendingPairings?.add(delta)
}

function recordPairingDurationMs (durationMs) {
  if (durationMs >= 0) {
    pairingDurationMs?.record(durationMs)
  }
}

function recordAmqpPublishError (attributes = {}) {
  amqpPublishErrors?.add(1, attributes)
}

function recordAmqpSessionSaturation () {
  amqpSessionSaturated?.add(1)
}

module.exports = {
  initWsMetrics,
  recordExecSessionActive,
  recordLogSessionActive,
  recordPendingPairing,
  recordPairingDurationMs,
  recordAmqpPublishError,
  recordAmqpSessionSaturation
}

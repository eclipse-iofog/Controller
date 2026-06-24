const { metrics } = require('@opentelemetry/api')

const METER_NAME = 'iofog-controller-ws'
const METER_VERSION = '1.0.0'

let meter = null
let execSessionsActive = null
let logSessionsActive = null
let pendingPairings = null
let pairingDurationMs = null
let amqpPublishErrors = null
let routerConnected = null

function getMeter () {
  if (!meter) {
    meter = metrics.getMeter(METER_NAME, METER_VERSION)
  }
  return meter
}

function initWsMetrics (routerConnectionService) {
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

  if (routerConnectionService) {
    routerConnected = m.createObservableGauge('ws_router_connected', {
      description: 'Router AMQP connection availability (1=connected, 0=disconnected)'
    })
    routerConnected.addCallback((result) => {
      const connected = routerConnectionService.isConnected() ? 1 : 0
      result.observe(connected)
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

module.exports = {
  initWsMetrics,
  recordExecSessionActive,
  recordLogSessionActive,
  recordPendingPairing,
  recordPairingDurationMs,
  recordAmqpPublishError
}

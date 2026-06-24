const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http')
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const config = require('./index')
const logger = require('../logger')

const metricsEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces')
  .replace(/\/v1\/traces\/?$/, '/v1/metrics')

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: metricsEndpoint,
    headers: {}
  }),
  exportIntervalMillis: parseInt(process.env.OTEL_METRICS_INTERVAL || config.get('otel.metrics.interval') || '60000', 10)
})

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'iofog-controller',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {}
  }),
  metricReader,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
})

function isTelemetryEnabled () {
  return config.getBoolean('otel.enabled', false)
}

// Start the SDK
async function startTelemetry () {
  if (!isTelemetryEnabled()) {
    logger.info('Telemetry is disabled via ENABLE_TELEMETRY environment variable')
    return
  }

  try {
    await sdk.start()
    const RouterConnectionService = require('../services/router-connection-service')
    const { initWsMetrics } = require('../websocket/ws-metrics')
    initWsMetrics(RouterConnectionService)
    logger.info('OpenTelemetry initialized successfully')
  } catch (error) {
    logger.error('Error initializing OpenTelemetry:', error)
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGTERM', () => {
  if (!isTelemetryEnabled()) return

  try {
    sdk.shutdown()
  } catch (error) {
    logger.error('Error terminating OpenTelemetry:', error)
  } finally {
    process.exit(0)
  }
})

module.exports = {
  sdk,
  startTelemetry
}

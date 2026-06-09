const { NodeSDK } = require('@opentelemetry/sdk-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const {
  Resource,
  envDetectorSync,
  hostDetectorSync,
  processDetectorSync
} = require('@opentelemetry/resources')
const logger = require('../logger')

// Workaround for async attributes
function awaitAttributes (detector) {
  return {
    async detect (config) {
      const resource = detector.detect(config)
      if (resource.waitForAsyncAttributes) {
        await resource.waitForAsyncAttributes()
      }
      return resource
    }
  }
}

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'pot-controller',
  resource: new Resource({}),
  resourceDetectors: [
    awaitAttributes(envDetectorSync),
    awaitAttributes(processDetectorSync),
    awaitAttributes(hostDetectorSync)
  ],
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {}
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
})

// Start the SDK
async function startTelemetry () {
  const isTelemetryEnabled = process.env.ENABLE_TELEMETRY === 'true'
  if (!isTelemetryEnabled) {
    logger.info('Telemetry is disabled via ENABLE_TELEMETRY environment variable')
    return
  }

  try {
    await sdk.start()
    logger.info('OpenTelemetry initialized successfully')
  } catch (error) {
    logger.error('Error initializing OpenTelemetry:', error)
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGTERM', () => {
  if (process.env.ENABLE_TELEMETRY !== 'true') return

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

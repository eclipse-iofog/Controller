const { Validator } = require('jsonschema')
const Errors = require('../helpers/errors')

const FOG_PLATFORM_SPEC_MAX_BYTES = 16 * 1024

const FOG_PLATFORM_REASONS = [
  'spec-changed',
  'delete',
  'periodic-sweep',
  'manual-retry',
  'service-changed'
]

const SERVICE_PLATFORM_REASONS = [
  'spec-changed',
  'delete',
  'periodic-sweep',
  'manual-retry'
]

const FOG_PLATFORM_PHASES = [
  'Pending',
  'Progressing',
  'Ready',
  'Failed',
  'Deleting'
]

const fogPlatformSpec = {
  id: '/fogPlatformSpec',
  type: 'object',
  additionalProperties: false,
  properties: {
    routerMode: { type: 'string', enum: ['none', 'edge', 'interior'] },
    natsMode: { type: 'string', enum: ['none', 'leaf', 'server'] },
    host: { type: 'string' },
    messagingPort: { type: 'integer', minimum: 1, maximum: 65535 },
    interRouterPort: { type: 'integer', minimum: 1, maximum: 65535 },
    edgeRouterPort: { type: 'integer', minimum: 1, maximum: 65535 },
    upstreamRouters: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    upstreamNatsServers: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    natsServerPort: { type: 'integer', minimum: 1, maximum: 65535 },
    natsLeafPort: { type: 'integer', minimum: 1, maximum: 65535 },
    natsClusterPort: { type: 'integer', minimum: 1, maximum: 65535 },
    natsMqttPort: { type: 'integer', minimum: 1, maximum: 65535 },
    natsHttpPort: { type: 'integer', minimum: 1, maximum: 65535 },
    jsStorageSize: { type: 'string', maxLength: 32 },
    jsMemoryStoreSize: { type: 'string', maxLength: 32 },
    networkRouter: { type: ['string', 'null'] },
    containerEngine: { type: 'string', enum: ['edgelet', 'docker', 'podman'] },
    bluetoothEnabled: { type: 'boolean' },
    abstractedHardwareEnabled: { type: 'boolean' },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string' }
        },
        required: ['value']
      }
    }
  }
}

const validator = new Validator()
validator.addSchema(fogPlatformSpec, fogPlatformSpec.id)

function assertMaxBytes (json, label) {
  if (Buffer.byteLength(json, 'utf8') > FOG_PLATFORM_SPEC_MAX_BYTES) {
    throw new Errors.ValidationError(`${label} exceeds maximum size of ${FOG_PLATFORM_SPEC_MAX_BYTES} bytes`)
  }
}

function parseJsonText (text, label) {
  if (text == null || text === '') {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Errors.ValidationError(`Invalid ${label} JSON`)
  }
}

function serializeJson (object, label) {
  const json = JSON.stringify(object)
  assertMaxBytes(json, label)
  return json
}

async function validateFogPlatformSpec (object) {
  const response = validator.validate(object || {}, fogPlatformSpec)
  if (!response.valid) {
    const error = response.errors[0]
    const property = (error.property || '').replace('instance.', '')
    throw new Errors.ValidationError(
      property ? `Invalid fog platform spec field '${property}'` : 'Invalid fog platform spec'
    )
  }
  return object
}

function parseSpecJson (specJson) {
  return parseJsonText(specJson, 'fog platform spec')
}

function serializeSpecJson (object) {
  return serializeJson(object, 'Fog platform spec')
}

function parseSpecSnapshot (specSnapshot) {
  return parseJsonText(specSnapshot, 'service platform spec snapshot')
}

function serializeSpecSnapshot (object) {
  if (object == null) {
    return null
  }
  return serializeJson(object, 'Service platform spec snapshot')
}

function parseConditionsJson (conditionsJson) {
  const parsed = parseJsonText(conditionsJson, 'fog platform conditions')
  if (parsed == null) {
    return []
  }
  if (!Array.isArray(parsed)) {
    throw new Errors.ValidationError('Invalid fog platform conditions JSON')
  }
  return parsed
}

function serializeConditionsJson (conditions) {
  if (conditions == null) {
    return null
  }
  return serializeJson(conditions, 'Fog platform conditions')
}

const FOG_PLATFORM_SPEC_SCALAR_FIELDS = [
  'routerMode',
  'natsMode',
  'host',
  'messagingPort',
  'interRouterPort',
  'edgeRouterPort',
  'natsServerPort',
  'natsLeafPort',
  'natsClusterPort',
  'natsMqttPort',
  'natsHttpPort',
  'jsStorageSize',
  'jsMemoryStoreSize',
  'networkRouter',
  'containerEngine',
  'bluetoothEnabled',
  'abstractedHardwareEnabled'
]

const FOG_PLATFORM_SPEC_ARRAY_FIELDS = [
  'upstreamRouters',
  'upstreamNatsServers',
  'tags'
]

function normalizeSpecTags (tags) {
  if (!Array.isArray(tags)) {
    return tags
  }
  return tags.map((tag) => (typeof tag === 'string' ? { value: tag } : tag))
}

function buildPlatformSpecFromFogData (fogData, options = {}) {
  const spec = {}
  for (const field of FOG_PLATFORM_SPEC_SCALAR_FIELDS) {
    if (fogData[field] !== undefined) {
      spec[field] = fogData[field]
    }
  }
  for (const field of FOG_PLATFORM_SPEC_ARRAY_FIELDS) {
    if (fogData[field] !== undefined) {
      spec[field] = field === 'tags' ? normalizeSpecTags(fogData[field]) : fogData[field]
    }
  }
  if (options.applyCreateDefaults) {
    if (spec.routerMode === undefined) {
      spec.routerMode = 'edge'
    }
    if (spec.natsMode === undefined) {
      spec.natsMode = 'leaf'
    }
  }
  return spec
}

function mergePlatformSpecPatch (existingSpec, patchFogData) {
  const merged = { ...(existingSpec || {}) }
  for (const field of FOG_PLATFORM_SPEC_SCALAR_FIELDS) {
    if (patchFogData[field] !== undefined) {
      merged[field] = patchFogData[field]
    }
  }
  for (const field of FOG_PLATFORM_SPEC_ARRAY_FIELDS) {
    if (patchFogData[field] !== undefined) {
      merged[field] = field === 'tags' ? normalizeSpecTags(patchFogData[field]) : patchFogData[field]
    }
  }
  return merged
}

module.exports = {
  mainSchemas: [],
  innerSchemas: [fogPlatformSpec],
  FOG_PLATFORM_SPEC_MAX_BYTES,
  FOG_PLATFORM_REASONS,
  SERVICE_PLATFORM_REASONS,
  FOG_PLATFORM_PHASES,
  fogPlatformSpec,
  validateFogPlatformSpec,
  parseSpecJson,
  serializeSpecJson,
  parseSpecSnapshot,
  serializeSpecSnapshot,
  parseConditionsJson,
  serializeConditionsJson,
  FOG_PLATFORM_SPEC_SCALAR_FIELDS,
  FOG_PLATFORM_SPEC_ARRAY_FIELDS,
  buildPlatformSpecFromFogData,
  mergePlatformSpecPatch
}

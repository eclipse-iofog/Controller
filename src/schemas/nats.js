'use strict'

const natsHubCreate = {
  'id': '/natsHubCreate',
  'type': 'object',
  'properties': {
    'host': { 'type': 'string' },
    'serverPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'clusterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'leafPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'mqttPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'httpPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'jsStorageSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 },
    'jsMemoryStoreSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 }
  },
  'required': ['host'],
  'additionalProperties': true
}

const natsAccountEnsure = {
  'id': '/natsAccountEnsure',
  'type': 'object',
  'properties': {
    'natsRule': { 'type': 'string', 'minLength': 1, 'maxLength': 255 }
  },
  'required': [],
  'additionalProperties': true
}

const natsUserCreate = {
  'id': '/natsUserCreate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string' },
    'expiresIn': { 'type': 'string', 'pattern': '^[0-9]+[hdm]$', 'maxLength': 8 },
    'natsRule': { 'type': 'string', 'minLength': 1, 'maxLength': 255 }
  },
  'required': ['name'],
  'additionalProperties': false
}

const natsImportSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    type: { type: 'string', enum: ['stream', 'service'] },
    account: { type: 'string' },
    token: { type: 'string' },
    to: { type: 'string' },
    local_subject: { type: 'string' },
    share: { type: 'boolean' }
  },
  additionalProperties: true
}

const natsExportSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    type: { type: 'string', enum: ['stream', 'service'] },
    description: { type: 'string' },
    info_url: { type: 'string' },
    token_req: { type: 'boolean' },
    response_type: { type: 'string', enum: ['Singleton', 'Stream', 'Chunked'] },
    account_token_position: { type: 'integer' }
  },
  additionalProperties: true
}

// Byte-size limits: integer or string with k/m/g/t suffix (e.g. -1, 1024, "1k", "100m", "1g", "1t")
const byteSizeLimitSchema = {
  oneOf: [
    { type: 'integer', minimum: -1 },
    { type: 'string', pattern: '^(-1|[0-9]+[kmgtKMGT]?)$' }
  ]
}

const natsAccountRulePayload = {
  'id': '/natsAccountRulePayload',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1, 'maxLength': 255 },
    'description': { 'type': 'string' },
    'infoUrl': { 'type': 'string' },
    'maxConnections': { 'type': 'integer', 'minimum': -1 },
    'maxLeafNodeConnections': { 'type': 'integer', 'minimum': -1 },
    'maxData': byteSizeLimitSchema,
    'maxExports': { 'type': 'integer', 'minimum': -1 },
    'maxImports': { 'type': 'integer', 'minimum': -1 },
    'maxMsgPayload': byteSizeLimitSchema,
    'maxSubscriptions': { 'type': 'integer', 'minimum': -1 },
    'exportsAllowWildcards': { 'type': 'boolean' },
    'disallowBearer': { 'type': 'boolean' },
    'responsePermissions': {
      'type': 'object',
      'properties': {
        'maxMsgs': { 'type': 'integer', 'minimum': 0 },
        'expires': { 'type': 'integer', 'minimum': 0 }
      },
      'additionalProperties': false
    },
    'respMax': { 'type': 'integer', 'minimum': 0 },
    'respTtl': { 'type': 'integer', 'minimum': 0 },
    'imports': { type: 'array', items: natsImportSchema },
    'exports': { type: 'array', items: natsExportSchema },
    'memStorage': byteSizeLimitSchema,
    'diskStorage': byteSizeLimitSchema,
    'streams': { 'type': 'integer', 'minimum': -1 },
    'consumer': { 'type': 'integer', 'minimum': -1 },
    'maxAckPending': { 'type': 'integer', 'minimum': -1 },
    'memMaxStreamBytes': byteSizeLimitSchema,
    'diskMaxStreamBytes': byteSizeLimitSchema,
    'maxBytesRequired': { 'type': 'boolean' },
    'tieredLimits': { 'type': 'object', 'additionalProperties': true },
    'pubAllow': { 'type': 'array', 'items': { 'type': 'string' } },
    'pubDeny': { 'type': 'array', 'items': { 'type': 'string' } },
    'subAllow': { 'type': 'array', 'items': { 'type': 'string' } },
    'subDeny': { 'type': 'array', 'items': { 'type': 'string' } }
  },
  'required': [],
  'additionalProperties': false
}

const natsUserRulePayload = {
  'id': '/natsUserRulePayload',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1, 'maxLength': 255 },
    'description': { 'type': 'string' },
    'maxSubscriptions': { 'type': 'integer', 'minimum': -1 },
    'maxPayload': byteSizeLimitSchema,
    'maxData': byteSizeLimitSchema,
    'bearerToken': { 'type': 'boolean' },
    'proxyRequired': { 'type': 'boolean' },
    'allowedConnectionTypes': {
      'type': 'array',
      'items': {
        'type': 'string',
        'enum': ['STANDARD', 'WEBSOCKET', 'LEAFNODE', 'LEAFNODE_WS', 'MQTT', 'MQTT_WS', 'IN_PROCESS']
      }
    },
    'src': { 'type': 'array', 'items': { 'type': 'string' } },
    'times': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': { 'start': { 'type': 'string' }, 'end': { 'type': 'string' } },
        'additionalProperties': false
      }
    },
    'timesLocation': { 'type': 'string' },
    'respMax': { 'type': 'integer', 'minimum': 0 },
    'respTtl': { 'type': 'integer', 'minimum': 0 },
    'pubAllow': { 'type': 'array', 'items': { 'type': 'string' } },
    'pubDeny': { 'type': 'array', 'items': { 'type': 'string' } },
    'subAllow': { 'type': 'array', 'items': { 'type': 'string' } },
    'subDeny': { 'type': 'array', 'items': { 'type': 'string' } },
    'tags': { 'type': 'array', 'items': { 'type': 'string' } }
  },
  'required': [],
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [natsHubCreate, natsAccountEnsure, natsUserCreate, natsAccountRulePayload, natsUserRulePayload]
}

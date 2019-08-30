const microserviceCreate = {
  'id': '/microserviceCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1
    },
    'config': { 'type': 'string' },
    'catalogItemId': {
      'type': 'integer',
      'minimum': 4
    },
    'images': {
      'type': 'array',
      'maxItems': 2,
      'items': { '$ref': '/image' }
    },
    'flowId': { 'type': 'integer' },
    'iofogUuid': { 'type': 'string' },
    'rootHostAccess': { 'type': 'boolean' },
    'logSize': { 'type': 'integer' },
    'imageSnapshot': { 'type': 'string' },
    'volumeMappings': {
      'type': 'array',
      'items': { '$ref': '/volumeMappings' } },
    'ports': {
      'type': 'array',
      'items': { '$ref': '/ports' } },
    'routes': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'env': {
      'type': 'array',
      'items': { '$ref': '/env' } },
    'cmd': {
      'type': 'array',
      'items': { 'type': 'string' } }
  },
  'required': ['name', 'flowId'],
  'additionalProperties': true
}

const microserviceUpdate = {
  'id': '/microserviceUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1
    },
    'config': { 'type': 'string' },
    'rebuild': { 'type': 'boolean' },
    'iofogUuid': { 'type': 'string' },
    'rootHostAccess': { 'type': 'boolean' },
    'logSize': { 'type': 'integer', 'minimum': 0 },
    'volumeMappings': {
      'type': 'array',
      'items': { '$ref': '/volumeMappings' }
    },
    'images': {
      'type': 'array',
      'maxItems': 2,
      'items': { '$ref': '/image' }
    },
    'env': {
      'type': 'array',
      'items': { '$ref': '/env' } },
    'cmd': {
      'type': 'array',
      'items': { 'type': 'string' } }
  },
  'additionalProperties': true
}

const microserviceDelete = {
  'id': '/microserviceDelete',
  'type': 'object',
  'properties': {
    'withCleanup': {
      'type': 'boolean'
    },
    'additionalProperties': true
  }
}

const env = {
  'id': '/env',
  'type': 'object',
  'properties': {
    'key': { 'type': 'string' },
    'value': { 'type': 'string' }
  },
  'required': ['key', 'value'],
  'additionalProperties': true
}

const ports = {
  'id': '/ports',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'publicMode': { 'type': 'boolean' }
  },
  'required': ['internal', 'external'],
  'additionalProperties': true
}

const portsCreate = {
  'id': '/portsCreate',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'publicMode': { 'type': 'boolean' }
  },
  'required': ['internal', 'external'],
  'additionalProperties': true
}

const volumeMappings = {
  'id': '/volumeMappings',
  'type': 'object',
  'properties': {
    'hostDestination': { 'type': 'string' },
    'containerDestination': { 'type': 'string' },
    'accessMode': { 'type': 'string' }
  },
  'required': ['hostDestination', 'containerDestination', 'accessMode'],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [microserviceCreate, microserviceUpdate, env, ports, portsCreate, microserviceDelete, volumeMappings],
  innerSchemas: [volumeMappings, ports, env]
}

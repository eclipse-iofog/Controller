const microserviceCreate = {
  'id': '/microserviceCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
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
    'registryId': {
      'type': 'integer'
    },
    'application': { 'type': 'string' },
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
    'extraHosts': {
      'type': 'array',
      'items': { '$ref': '/extraHosts' } },
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
  'required': ['name', 'application'],
  'additionalProperties': true
}

const microserviceUpdate = {
  'id': '/microserviceUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
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
      'minItems': 1,
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

const extraHosts = {
  'id': '/extraHosts',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string' },
    'address': { 'type': 'string' }
  },
  'required': ['name', 'address'],
  'additionalProperties': true
}

const ports = {
  'id': '/ports',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'publicPort': { 'type': 'integer' },
    'host': { 'type': 'string' },
    'protocol': { 'enum': ['http', 'tcp'] }
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
    'publicPort': { 'type': 'integer' },
    'host': { 'type': 'string' },
    'protocol': { 'enum': ['http', 'tcp'] }
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
    'accessMode': { 'type': 'string' },
    'type': { 'enum': ['volume', 'bind'] }
  },
  'required': ['hostDestination', 'containerDestination', 'accessMode'],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [microserviceCreate, microserviceUpdate, env, ports, extraHosts, portsCreate, microserviceDelete, volumeMappings],
  innerSchemas: [volumeMappings, ports, env, extraHosts, microserviceCreate]
}

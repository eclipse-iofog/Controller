const { nameRegex } = require('./utils/utils')

const microserviceCreate = {
  'id': '/microserviceCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
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
    'application': {
      'anyOf': [
        { 'type': 'string' },
        { 'type': 'number' }
      ]
    },
    'iofogUuid': { 'type': 'string' },
    'agentName': { 'type': 'string' },
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
  'required': ['name'],
  'additionalProperties': true
}

const microserviceUpdate = {
  'id': '/microserviceUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
    },
    'config': { 'type': 'string' },
    'rebuild': { 'type': 'boolean' },
    'iofogUuid': { 'type': 'string' },
    'agentName': { 'type': 'string' },
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
    'ports': {
      'type': 'array',
      'items': { '$ref': '/ports' } },
    'extraHosts': {
      'type': 'array',
      'items': { '$ref': '/extraHosts' } },
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
    'public': { '$ref': '/publicPort' },
    'protocol': { 'enum': ['tcp', 'udp'] }
  },
  'required': ['internal', 'external'],
  'additionalProperties': true
}

const publicPort = {
  'id': '/publicPort',
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    schemes: { type: 'array', items: { type: 'string' } },
    protocol: { 'enum': ['tcp', 'http'] },
    router: { '$ref': '/publicPortRouter' }
  },
  required: ['schemes', 'protocol']
}

const publicPortRouter = {
  'id': '/publicPortRouter',
  type: 'object',
  properties: {
    host: { type: 'string' },
    port: { type: 'number' }
  },
  required: []
}

const portsCreate = {
  'id': '/portsCreate',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'protocol': { 'enum': ['tcp', 'udp'] },
    'public': { '$ref': '/publicPort' }
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
  mainSchemas: [microserviceCreate, microserviceUpdate, env, ports, publicPort, publicPortRouter, extraHosts, portsCreate, microserviceDelete, volumeMappings],
  innerSchemas: [volumeMappings, ports, publicPort, publicPortRouter, env, extraHosts, microserviceCreate]
}

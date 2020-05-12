const applicationCreate = {
  'id': '/applicationCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'routes': {
      'type': 'array',
      'items': { '$ref': '/routingCreate' }
    },
    'microservices': {
      'type': 'array',
      'items': { '$ref': '/microserviceCreate' }
    },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
    'isSystem': { 'type': 'boolean' }
  },
  'required': ['name'],
  'additionalProperties': true
}

const applicationUpdate = {
  'id': '/applicationUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': '^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$'
    },
    'microservices': {
      'type': 'array',
      'items': { '$ref': '/microserviceCreate' }
    },
    'routes': {
      'type': 'array',
      'items': { '$ref': '/routingCreate' }
    },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
    'isSystem': { 'type': 'boolean' }
  },
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [applicationCreate, applicationUpdate],
  innerSchemas: []
}

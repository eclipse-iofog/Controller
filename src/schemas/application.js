const { nameRegex } = require('./utils/utils')

const applicationCreate = {
  'id': '/applicationCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'microservices': {
      'type': 'array',
      'items': { '$ref': '/microserviceCreate' }
    },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
    'isSystem': { 'type': 'boolean' },
    'natsConfig': { '$ref': '/applicationNatsConfig' }
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
      'pattern': nameRegex
    },
    'microservices': {
      'type': 'array',
      'items': { '$ref': '/microserviceCreate' }
    },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
    'isSystem': { 'type': 'boolean' },
    'natsConfig': { '$ref': '/applicationNatsConfig' }
  },
  'additionalProperties': true
}

const applicationPatch = {
  'id': '/applicationPatch',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'description': { 'type': 'string' },
    'isActivated': { 'type': 'boolean' },
    'isSystem': { 'type': 'boolean' },
    'natsConfig': { '$ref': '/applicationNatsConfig' }
  },
  'additionalProperties': true
}

const applicationNatsConfig = {
  'id': '/applicationNatsConfig',
  'type': 'object',
  'properties': {
    'natsAccess': { 'type': 'boolean' },
    'natsRule': { 'type': 'string', 'minLength': 1, 'maxLength': 255 }
  },
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [applicationCreate, applicationUpdate, applicationPatch],
  innerSchemas: [applicationCreate, applicationNatsConfig]
}

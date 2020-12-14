const { nameRegex } = require('./utils/utils')

const applicationTemplateCreate = {
  'id': '/applicationTemplateCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'description': { 'type': 'string' },
    'applicationJSON': { '$ref': '/applicationCreate' },
    'variables': {
      'type': 'array',
      'items': { '$ref': '/applicationTemplateVariable' }
    }
  },
  'required': ['name'],
  'additionalProperties': true
}

const applicationTemplateVariable = {
  id: '/applicationTemplateVariable',
  type: 'object',
  properties: {
    'key': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'description': { 'type': 'string' }
  },
  required: ['key']
}

const applicationTemplateUpdate = {
  'id': '/applicationTemplateUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'description': { 'type': 'string' },
    'applicationJSON': { '$ref': '/applicationCreate' },
    'variables': {
      'type': 'array',
      'items': { '$ref': '/applicationTemplateVariable' }
    }
  },
  'additionalProperties': true
}

const applicationTemplatePatch = {
  'id': '/applicationTemplatePatch',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'minLength': 1,
      'pattern': nameRegex
    },
    'description': { 'type': 'string' }
  },
  'additionalProperties': true
}

const applicationTemplateDeploy = {
  'id': '/applicationTemplateDeploy',
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
    'variables': {
      'type': 'array',
      'items': {
        type: 'object',
        key: { type: 'string' },
        value: { type: 'string' }
      }
    }
  },
  'required': ['name'],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [applicationTemplateCreate, applicationTemplateVariable, applicationTemplateUpdate, applicationTemplatePatch, applicationTemplateDeploy],
  innerSchemas: [applicationTemplateVariable]
}

const { nameRegex, serviceNameRegex } = require('./utils/utils')

const microserviceTemplateVariable = {
  id: '/microserviceTemplateVariable',
  type: 'object',
  properties: {
    key: {
      type: 'string',
      minLength: 1,
      pattern: nameRegex
    },
    description: { type: 'string' }
  },
  additionalProperties: true,
  required: ['key']
}

const microserviceTemplateCreate = {
  id: '/microserviceTemplateCreate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    },
    description: { type: 'string' },
    variables: {
      type: 'array',
      items: { $ref: '/microserviceTemplateVariable' }
    },
    microservice: {
      type: 'object'
    }
  },
  required: ['name', 'microservice'],
  additionalProperties: false
}

const microserviceTemplateUpdate = {
  id: '/microserviceTemplateUpdate',
  type: 'object',
  properties: {
    description: { type: 'string' },
    variables: {
      type: 'array',
      items: { $ref: '/microserviceTemplateVariable' }
    },
    microservice: {
      type: 'object'
    }
  },
  additionalProperties: false
}

const microserviceTemplateDeploy = {
  id: '/microserviceTemplateDeploy',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    },
    variables: {
      oneOf: [
        {
          type: 'object'
        },
        {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: {}
            },
            required: ['key']
          }
        }
      ]
    }
  },
  required: ['name'],
  additionalProperties: true
}

module.exports = {
  mainSchemas: [
    microserviceTemplateCreate,
    microserviceTemplateVariable,
    microserviceTemplateUpdate,
    microserviceTemplateDeploy
  ],
  innerSchemas: [microserviceTemplateVariable]
}

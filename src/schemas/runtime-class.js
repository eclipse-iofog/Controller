const { serviceNameRegex, nameRegex } = require('./utils/utils')

const runtimeClassCreate = {
  id: '/runtimeClassCreate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    },
    handler: {
      type: 'string',
      pattern: nameRegex,
      minLength: 1,
      maxLength: 253
    }
  },
  required: ['name', 'handler'],
  additionalProperties: false
}

const runtimeClassUpdate = {
  id: '/runtimeClassUpdate',
  type: 'object',
  properties: {
    handler: {
      type: 'string',
      pattern: nameRegex,
      minLength: 1,
      maxLength: 253
    }
  },
  additionalProperties: false
}

const runtimeClassLink = {
  id: '/runtimeClassLink',
  type: 'object',
  properties: {
    fogUuids: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    }
  },
  required: ['fogUuids'],
  additionalProperties: false
}

const runtimeClassUnlink = {
  id: '/runtimeClassUnlink',
  type: 'object',
  properties: {
    fogUuids: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    }
  },
  required: ['fogUuids'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [runtimeClassCreate, runtimeClassUpdate, runtimeClassLink, runtimeClassUnlink],
  innerSchemas: [runtimeClassCreate, runtimeClassUpdate]
}

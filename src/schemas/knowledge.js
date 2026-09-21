const { serviceNameRegex } = require('./utils/utils')

const knowledgeCreate = {
  id: '/knowledgeCreate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    },
    repo: {
      type: 'string',
      minLength: 1
    },
    revision: {
      type: 'string'
    },
    registryId: {
      type: 'integer',
      minimum: 1
    },
    files: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    format: {
      type: ['string', 'null']
    }
  },
  required: ['name', 'repo', 'registryId'],
  additionalProperties: false
}

const knowledgeUpdate = {
  id: '/knowledgeUpdate',
  type: 'object',
  properties: {
    repo: {
      type: 'string',
      minLength: 1
    },
    revision: {
      type: 'string'
    },
    registryId: {
      type: 'integer',
      minimum: 1
    },
    files: {
      type: 'array',
      items: { type: 'string', minLength: 1 }
    },
    format: {
      type: ['string', 'null']
    }
  },
  additionalProperties: false
}

const knowledgeLink = {
  id: '/knowledgeLink',
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

const knowledgeUnlink = {
  id: '/knowledgeUnlink',
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
  mainSchemas: [knowledgeCreate, knowledgeUpdate, knowledgeLink, knowledgeUnlink],
  innerSchemas: [knowledgeCreate, knowledgeUpdate]
}

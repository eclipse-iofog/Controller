const secretCreate = {
  id: '/secretCreate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    type: { type: 'string', enum: ['Opaque', 'tls'] },
    data: { type: 'object' }
  },
  required: ['name', 'type', 'data'],
  additionalProperties: false
}

const secretUpdate = {
  id: '/secretUpdate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    type: { type: 'string', enum: ['Opaque', 'tls'] },
    data: { type: 'object' }
  },
  required: ['data'],
  additionalProperties: false
}

const secretResponse = {
  id: '/secretResponse',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['Opaque', 'tls'] },
    data: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'type', 'data', 'created_at', 'updated_at'],
  additionalProperties: false
}

const secretListResponse = {
  id: '/secretListResponse',
  type: 'object',
  properties: {
    secrets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['Opaque', 'tls'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'type', 'created_at', 'updated_at'],
        additionalProperties: false
      }
    }
  },
  required: ['secrets'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [secretCreate, secretUpdate, secretResponse, secretListResponse],
  innerSchemas: []
}

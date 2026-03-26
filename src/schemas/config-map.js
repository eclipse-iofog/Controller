const configMapCreate = {
  id: '/configMapCreate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    immutable: { type: 'boolean' },
    useVault: { type: 'boolean' },
    data: { type: 'object' }
  },
  required: ['name', 'data'],
  additionalProperties: false
}

const configMapUpdate = {
  id: '/configMapUpdate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    immutable: { type: 'boolean' },
    useVault: { type: 'boolean' },
    data: { type: 'object' }
  },
  required: ['data'],
  additionalProperties: false
}

const configMapResponse = {
  id: '/configMapResponse',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    immutable: { type: 'boolean' },
    useVault: { type: 'boolean' },
    data: { type: 'object' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'data', 'created_at', 'updated_at'],
  additionalProperties: false
}

const configMapListResponse = {
  id: '/configMapListResponse',
  type: 'object',
  properties: {
    configMaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          immutable: { type: 'boolean' },
          useVault: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'created_at', 'updated_at'],
        additionalProperties: false
      }
    }
  },
  required: ['configMaps'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [configMapCreate, configMapUpdate, configMapResponse, configMapListResponse],
  innerSchemas: []
}

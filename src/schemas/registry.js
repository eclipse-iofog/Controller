const emailPattern = '^$|^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}' +
  '\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'

const registryCreate = {
  id: '/registryCreate',
  type: 'object',
  properties: {
    url: { type: 'string', minLength: 1 },
    isPublic: { type: 'boolean' },
    username: { type: 'string' },
    password: { type: 'string' },
    email: {
      type: 'string',
      pattern: emailPattern
    },
    type: { type: 'string', enum: ['oci', 'hf'] },
    ca: { type: 'string' },
    insecure: { type: 'boolean' }
  },
  required: ['url', 'isPublic'],
  additionalProperties: true
}

const registryDelete = {
  id: '/registryDelete',
  type: 'object',
  properties: {
    id: { type: 'integer' }
  },
  required: ['id'],
  additionalProperties: true
}

const registryUpdate = {
  id: '/registryUpdate',
  type: 'object',
  properties: {
    url: { type: 'string', minLength: 1 },
    isPublic: { type: 'boolean' },
    username: { type: 'string' },
    password: { type: 'string' },
    email: {
      type: 'string',
      pattern: emailPattern
    },
    type: { type: 'string', enum: ['oci', 'hf'] },
    ca: { type: 'string' },
    insecure: { type: 'boolean' }
  },
  additionalProperties: true
}

module.exports = {
  mainSchemas: [registryCreate, registryDelete, registryUpdate]
}

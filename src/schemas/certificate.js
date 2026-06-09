const caCreate = {
  id: '/caCreate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    subject: { type: 'string', minLength: 1 },
    expiration: { type: 'integer', minimum: 0 },
    type: {
      type: 'string',
      enum: ['k8s-secret', 'direct', 'self-signed']
    },
    secretName: { type: 'string' }
  },
  required: ['type', 'name'],
  additionalProperties: false,
  allOf: [
    {
      if: { properties: { type: { const: 'self-signed' } } },
      then: { required: ['name', 'subject', 'expiration'] }
    },
    {
      if: {
        properties: {
          type: {
            enum: ['k8s-secret', 'direct']
          }
        }
      },
      then: { required: ['secretName'] }
    }
  ]
}

const certificateCreate = {
  id: '/certificateCreate',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    subject: { type: 'string', minLength: 1 },
    hosts: { type: 'string', minLength: 1 },
    expiration: { type: 'integer', minimum: 0 },
    ca: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['k8s-secret', 'direct', 'self-signed'] },
        secretName: { type: 'string' }
        // cert: { type: 'string' },
        // key: { type: 'string' }
      },
      required: ['type']
    }
  },
  required: ['name', 'subject', 'hosts'],
  additionalProperties: false
}

const caResponse = {
  id: '/caResponse',
  type: 'object',
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    type: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['name', 'subject', 'type', 'created_at', 'updated_at'],
  additionalProperties: false
}

const certificateResponse = {
  id: '/certificateResponse',
  type: 'object',
  properties: {
    name: { type: 'string' },
    subject: { type: 'string' },
    hosts: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' }
  },
  required: ['name', 'subject', 'hosts', 'created_at', 'updated_at'],
  additionalProperties: false
}

const caListResponse = {
  id: '/caListResponse',
  type: 'object',
  properties: {
    cas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subject: { type: 'string' },
          type: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['name', 'subject', 'type', 'created_at', 'updated_at'],
        additionalProperties: false
      }
    }
  },
  required: ['cas'],
  additionalProperties: false
}

const certificateListResponse = {
  id: '/certificateListResponse',
  type: 'object',
  properties: {
    certificates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          subject: { type: 'string' },
          hosts: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        },
        required: ['name', 'subject', 'hosts', 'created_at', 'updated_at'],
        additionalProperties: false
      }
    }
  },
  required: ['certificates'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [
    caCreate,
    certificateCreate,
    caResponse,
    certificateResponse,
    caListResponse,
    certificateListResponse
  ],
  innerSchemas: []
}

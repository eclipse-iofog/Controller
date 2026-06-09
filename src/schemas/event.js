const eventListQuery = {
  id: '/eventListQuery',
  type: 'object',
  properties: {
    startTime: {
      anyOf: [
        { type: 'number' },
        { type: 'string' }
      ]
    },
    endTime: {
      anyOf: [
        { type: 'number' },
        { type: 'string' }
      ]
    },
    endpointType: { type: 'string', minLength: 1 },
    resourceType: { type: 'string', minLength: 1 },
    status: { type: 'string', minLength: 1 },
    method: {
      anyOf: [
        { type: 'string', minLength: 1 },
        {
          type: 'array',
          items: { type: 'string', minLength: 1 }
        }
      ]
    },
    actorId: { type: 'string', minLength: 1 },
    eventType: { type: 'string', minLength: 1 },
    limit: {
      anyOf: [
        { type: 'number', minimum: 1 },
        { type: 'string', pattern: '^\\d+$' }
      ]
    },
    offset: {
      anyOf: [
        { type: 'number', minimum: 0 },
        { type: 'string', pattern: '^\\d+$' }
      ]
    }
  },
  additionalProperties: false
}

const eventDeleteRequest = {
  id: '/eventDeleteRequest',
  type: 'object',
  properties: {
    days: {
      type: 'number',
      minimum: 0,
      maximum: 365
    }
  },
  required: ['days'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [eventListQuery, eventDeleteRequest],
  innerSchemas: []
}

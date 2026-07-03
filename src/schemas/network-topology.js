const networkTopologyListQuery = {
  id: '/networkTopologyListQuery',
  type: 'object',
  properties: {
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
    },
    role: {
      type: 'string',
      enum: ['default', 'edge', 'interior', 'hub', 'leaf', 'server']
    },
    deploymentTarget: {
      type: 'string',
      enum: ['kubernetes', 'remote', 'edgelet']
    },
    search: { type: 'string', minLength: 1 }
  },
  additionalProperties: false
}

const networkTopologySubgraphQuery = {
  id: '/networkTopologySubgraphQuery',
  type: 'object',
  properties: {
    center: { type: 'string', minLength: 1 },
    depth: {
      anyOf: [
        { type: 'number', minimum: 1, maximum: 2 },
        { type: 'string', pattern: '^[12]$' }
      ]
    },
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
  required: ['center'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [networkTopologyListQuery, networkTopologySubgraphQuery],
  innerSchemas: []
}

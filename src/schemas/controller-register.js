const controllerRegister = {
  id: '/controllerRegister',
  type: 'object',
  properties: {
    uuid: { type: 'string' },
    name: { type: 'string', enum: ['controller'] },
    images: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { $ref: '/image' }
    },
    registryId: { type: 'integer' },
    ports: {
      type: 'array',
      items: { $ref: '/ports' }
    },
    volumeMappings: {
      type: 'array',
      items: { $ref: '/volumeMappings' }
    },
    env: {
      type: 'array',
      items: { $ref: '/env' }
    },
    config: { type: 'string' },
    hostNetworkMode: { type: 'boolean' },
    runtime: { type: 'string' },
    schedule: {
      type: 'integer',
      enum: [0]
    }
  },
  required: ['uuid', 'images', 'registryId'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [controllerRegister],
  innerSchemas: []
}

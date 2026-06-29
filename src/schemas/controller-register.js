const { microserviceContainerSpecProperties } = require('./microservice-container-spec')

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
    schedule: {
      type: 'integer',
      enum: [0]
    },
    ...microserviceContainerSpecProperties
  },
  required: ['uuid', 'images', 'registryId'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [controllerRegister],
  innerSchemas: []
}

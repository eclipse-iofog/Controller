const clusterControllerUpdate = {
  id: '/clusterControllerUpdate',
  type: 'object',
  properties: {
    host: {
      type: 'string'
    }
  },
  additionalProperties: false
}

module.exports = {
  mainSchemas: [clusterControllerUpdate],
  innerSchemas: []
}

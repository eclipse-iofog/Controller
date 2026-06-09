const { serviceNameRegex } = require('./utils/utils')

const serviceCreate = {
  id: '/serviceCreate',
  type: 'object',
  required: ['name', 'type', 'resource', 'targetPort'],
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex
    },
    type: {
      type: 'string',
      enum: ['microservice', 'k8s', 'agent', 'external']
    },
    resource: {
      type: 'string',
      required: true
    },
    targetPort: {
      type: 'integer'
    },
    defaultBridge: {
      type: 'string'
    },
    servicePort: {
      type: 'integer'
    },
    k8sType: {
      type: 'string',
      enum: ['LoadBalancer', 'ClusterIP', 'NodePort']
    },
    tags: {
      type: 'array',
      items: { '$ref': '/serviceTag' }
    }
  }
  // allOf: [
  //   {
  //     if: {
  //       properties: { type: { const: 'k8s' } }
  //     },
  //     then: {
  //       required: ['servicePort', 'k8sType']
  //     }
  //   }
  // ]
}

const serviceUpdate = {
  id: '/serviceUpdate',
  type: 'object',
  required: ['name'],
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex
    },
    type: {
      type: 'string',
      enum: ['microservice', 'k8s', 'agent', 'external']
    },
    resource: {
      type: 'string'
    },
    targetPort: {
      type: 'integer'
    },
    defaultBridge: {
      type: 'string'
    },
    servicePort: {
      type: 'integer'
    },
    k8sType: {
      type: 'string',
      enum: ['LoadBalancer', 'ClusterIP', 'NodePort']
    },
    tags: {
      type: 'array',
      items: { '$ref': '/serviceTag' }
    }
  }
  // allOf: [
  //   {
  //     if: {
  //       properties: { type: { const: 'k8s' } }
  //     },
  //     then: {
  //       required: ['servicePort', 'k8sType']
  //     }
  //   }
  // ]
}

const serviceTag = {
  id: '/serviceTag',
  type: 'string'
}

module.exports = {
  mainSchemas: [
    serviceCreate,
    serviceUpdate,
    serviceTag
  ],
  innerSchemas: [serviceTag]
}

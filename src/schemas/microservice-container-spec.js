const microserviceContainerSpecProperties = {
  config: { type: 'string' },
  annotations: { type: 'string' },
  hostNetworkMode: { type: 'boolean' },
  isPrivileged: { type: 'boolean' },
  logSize: { type: 'integer', minimum: 0 },
  runtime: { type: 'string' },
  pidMode: { type: 'string' },
  ipcMode: { type: 'string' },
  runAsUser: { type: 'string' },
  platform: { type: 'string' },
  cpuSetCpus: { type: 'string' },
  memoryLimit: { type: 'integer' },
  ports: {
    type: 'array',
    items: { $ref: '/ports' }
  },
  volumeMappings: {
    type: 'array',
    items: { $ref: '/volumeMappings' }
  },
  extraHosts: {
    type: 'array',
    items: { $ref: '/extraHosts' }
  },
  env: {
    type: 'array',
    items: { $ref: '/env' }
  },
  cmd: {
    type: 'array',
    items: { type: 'string' }
  },
  cdiDevices: {
    type: 'array',
    items: { type: 'string' }
  },
  capAdd: {
    type: 'array',
    items: { type: 'string' }
  },
  capDrop: {
    type: 'array',
    items: { type: 'string' }
  },
  healthCheck: {
    type: 'object',
    properties: { $ref: '/microserviceHealthCheck' }
  }
}

module.exports = {
  mainSchemas: [],
  microserviceContainerSpecProperties
}

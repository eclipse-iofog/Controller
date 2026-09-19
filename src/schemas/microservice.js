const { nameRegex, serviceNameRegex } = require('./utils/utils')

const microserviceCreate = {
  id: '/microserviceCreate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: nameRegex
    },
    config: { type: 'string' },
    annotations: { type: 'string' },
    catalogItemId: {
      type: 'integer',
      minimum: 4
    },
    images: {
      type: 'array',
      maxItems: 4,
      items: { $ref: '/image' }
    },
    registryId: {
      type: 'integer'
    },
    application: { type: 'string' },
    iofogUuid: { type: 'string' },
    agentName: { type: 'string' },
    hostNetworkMode: { type: 'boolean' },
    isPrivileged: { type: 'boolean' },
    schedule: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    logSize: { type: 'integer' },
    volumeMappings: {
      type: 'array',
      items: { $ref: '/volumeMappings' }
    },
    ports: {
      type: 'array',
      items: { $ref: '/ports' }
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
    runAsUser: { type: 'string' },
    runAsGroup: { type: 'string' },
    readOnlyRootFilesystem: { type: 'boolean' },
    platform: { type: 'string' },
    runtime: { type: 'string' },
    cpuSetCpus: { type: 'string' },
    memoryLimit: { type: 'integer' },
    memoryReservation: { type: 'integer', minimum: 1 },
    memorySwap: { type: 'integer' },
    shmSize: { type: 'integer', minimum: 1 },
    cpus: { type: 'number' },
    workingDir: { type: 'string' },
    entrypoint: {
      type: 'array',
      items: { type: 'string' }
    },
    commands: {
      type: 'array',
      items: { type: 'string' }
    },
    sysctls: {
      type: 'object',
      additionalProperties: false,
      properties: {
        'kernel.shm_rmid_forced': { type: 'string' },
        'net.ipv4.ip_local_port_range': { type: 'string' },
        'net.ipv4.tcp_syncookies': { type: 'string' },
        'net.ipv4.ping_group_range': { type: 'string' },
        'net.ipv4.ip_unprivileged_port_start': { type: 'string' },
        'net.ipv4.ip_local_reserved_ports': { type: 'string' },
        'net.ipv4.tcp_keepalive_time': { type: 'string' },
        'net.ipv4.tcp_fin_timeout': { type: 'string' },
        'net.ipv4.tcp_keepalive_intvl': { type: 'string' },
        'net.ipv4.tcp_keepalive_probes': { type: 'string' },
        'net.ipv4.tcp_rmem': { type: 'string' },
        'net.ipv4.tcp_wmem': { type: 'string' },
        'net.ipv4.tcp_slow_start_after_idle': { type: 'string' },
        'net.ipv4.tcp_notsent_lowat': { type: 'string' }
      }
    },
    ulimits: {
      type: 'object',
      additionalProperties: false,
      properties: {
        core: { $ref: '/containerUlimit' },
        cpu: { $ref: '/containerUlimit' },
        data: { $ref: '/containerUlimit' },
        fsize: { $ref: '/containerUlimit' },
        locks: { $ref: '/containerUlimit' },
        memlock: { $ref: '/containerUlimit' },
        msgqueue: { $ref: '/containerUlimit' },
        nice: { $ref: '/containerUlimit' },
        nofile: { $ref: '/containerUlimit' },
        nproc: { $ref: '/containerUlimit' },
        rss: { $ref: '/containerUlimit' },
        rtprio: { $ref: '/containerUlimit' },
        rttime: { $ref: '/containerUlimit' },
        sigpending: { $ref: '/containerUlimit' },
        stack: { $ref: '/containerUlimit' }
      }
    },
    devices: {
      type: 'array',
      items: { $ref: '/containerDevice' }
    },
    tmpfs: {
      type: 'array',
      items: { $ref: '/containerTmpfs' }
    },
    models: { $ref: '/microserviceCatalog' },
    natsConfig: { $ref: '/microserviceNatsConfig' },
    healthCheck: {
      type: 'object',
      properties: { $ref: '/microserviceHealthCheck' }
    },
    serviceAccount: {
      type: 'object',
      properties: {
        roleRef: {
          type: 'object',
          properties: {
            kind: { type: 'string' },
            name: { type: 'string' },
            apiGroup: { type: 'string' }
          },
          required: ['kind', 'name']
        }
      },
      additionalProperties: false
    }
  },
  required: ['name'],
  additionalProperties: true
}

const microserviceUpdate = {
  id: '/microserviceUpdate',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: nameRegex
    },
    config: { type: 'string' },
    annotations: { type: 'string' },
    rebuild: { type: 'boolean' },
    iofogUuid: { type: 'string' },
    agentName: { type: 'string' },
    hostNetworkMode: { type: 'boolean' },
    isPrivileged: { type: 'boolean' },
    logSize: { type: 'integer', minimum: 0 },
    schedule: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    volumeMappings: {
      type: 'array',
      items: { $ref: '/volumeMappings' }
    },
    images: {
      type: 'array',
      maxItems: 4,
      minItems: 1,
      items: { $ref: '/image' }
    },
    ports: {
      type: 'array',
      items: { $ref: '/ports' }
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
    runAsUser: { type: 'string' },
    runAsGroup: { type: 'string' },
    readOnlyRootFilesystem: { type: 'boolean' },
    platform: { type: 'string' },
    runtime: { type: 'string' },
    cpuSetCpus: { type: 'string' },
    memoryLimit: { type: 'integer' },
    memoryReservation: { type: 'integer', minimum: 1 },
    memorySwap: { type: 'integer' },
    shmSize: { type: 'integer', minimum: 1 },
    cpus: { type: 'number' },
    workingDir: { type: 'string' },
    entrypoint: {
      type: 'array',
      items: { type: 'string' }
    },
    commands: {
      type: 'array',
      items: { type: 'string' }
    },
    sysctls: {
      type: 'object',
      additionalProperties: false,
      properties: {
        'kernel.shm_rmid_forced': { type: 'string' },
        'net.ipv4.ip_local_port_range': { type: 'string' },
        'net.ipv4.tcp_syncookies': { type: 'string' },
        'net.ipv4.ping_group_range': { type: 'string' },
        'net.ipv4.ip_unprivileged_port_start': { type: 'string' },
        'net.ipv4.ip_local_reserved_ports': { type: 'string' },
        'net.ipv4.tcp_keepalive_time': { type: 'string' },
        'net.ipv4.tcp_fin_timeout': { type: 'string' },
        'net.ipv4.tcp_keepalive_intvl': { type: 'string' },
        'net.ipv4.tcp_keepalive_probes': { type: 'string' },
        'net.ipv4.tcp_rmem': { type: 'string' },
        'net.ipv4.tcp_wmem': { type: 'string' },
        'net.ipv4.tcp_slow_start_after_idle': { type: 'string' },
        'net.ipv4.tcp_notsent_lowat': { type: 'string' }
      }
    },
    ulimits: {
      type: 'object',
      additionalProperties: false,
      properties: {
        core: { $ref: '/containerUlimit' },
        cpu: { $ref: '/containerUlimit' },
        data: { $ref: '/containerUlimit' },
        fsize: { $ref: '/containerUlimit' },
        locks: { $ref: '/containerUlimit' },
        memlock: { $ref: '/containerUlimit' },
        msgqueue: { $ref: '/containerUlimit' },
        nice: { $ref: '/containerUlimit' },
        nofile: { $ref: '/containerUlimit' },
        nproc: { $ref: '/containerUlimit' },
        rss: { $ref: '/containerUlimit' },
        rtprio: { $ref: '/containerUlimit' },
        rttime: { $ref: '/containerUlimit' },
        sigpending: { $ref: '/containerUlimit' },
        stack: { $ref: '/containerUlimit' }
      }
    },
    devices: {
      type: 'array',
      items: { $ref: '/containerDevice' }
    },
    tmpfs: {
      type: 'array',
      items: { $ref: '/containerTmpfs' }
    },
    models: { $ref: '/microserviceCatalog' },
    natsConfig: { $ref: '/microserviceNatsConfig' },
    healthCheck: {
      type: 'object',
      properties: { $ref: '/microserviceHealthCheck' }
    },
    serviceAccount: {
      type: 'object',
      properties: {
        roleRef: {
          type: 'object',
          properties: {
            kind: { type: 'string' },
            name: { type: 'string' },
            apiGroup: { type: 'string' }
          },
          required: ['kind', 'name']
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: true
}

const microserviceDelete = {
  id: '/microserviceDelete',
  type: 'object',
  properties: {
    withCleanup: {
      type: 'boolean'
    },
    additionalProperties: true
  }
}

const env = {
  id: '/env',
  type: 'object',
  properties: {
    key: { type: 'string' },
    value: { type: 'string' },
    valueFromSecret: { type: 'string' },
    valueFromConfigMap: { type: 'string' }
  },
  required: ['key'],
  oneOf: [
    {
      required: ['value']
    },
    {
      required: ['valueFromSecret']
    },
    {
      required: ['valueFromConfigMap']
    }
  ],
  additionalProperties: true
}

const extraHosts = {
  id: '/extraHosts',
  type: 'object',
  properties: {
    name: { type: 'string' },
    address: { type: 'string' }
  },
  required: ['name', 'address'],
  additionalProperties: true
}

const ports = {
  id: '/ports',
  type: 'object',
  properties: {
    internal: { type: 'integer' },
    external: { type: 'integer' },
    protocol: { enum: ['tcp', 'udp'] }
  },
  required: ['internal', 'external'],
  additionalProperties: true
}

const portsCreate = {
  id: '/portsCreate',
  type: 'object',
  properties: {
    internal: { type: 'integer' },
    external: { type: 'integer' },
    protocol: { enum: ['tcp', 'udp'] }
  },
  required: ['internal', 'external'],
  additionalProperties: true
}

const volumeMappings = {
  id: '/volumeMappings',
  type: 'object',
  properties: {
    hostDestination: { type: 'string' },
    containerDestination: { type: 'string' },
    accessMode: { type: 'string' },
    type: { enum: ['volume', 'bind', 'volumeMount', 'serviceAccount'] },
    scope: { type: 'string' }
  },
  required: ['hostDestination', 'containerDestination', 'accessMode'],
  additionalProperties: true
}

const microserviceHealthCheck = {

  id: '/microserviceHealthCheck',
  type: 'object',
  properties: {
    test: {
      type: 'array',
      items: { type: 'string' }
    },
    interval: { type: 'integer' },
    timeout: { type: 'integer' },
    startPeriod: { type: 'integer' },
    startInterval: { type: 'integer' },
    retries: { type: 'integer' }
  },
  required: ['test']
}

const microserviceNatsConfig = {
  id: '/microserviceNatsConfig',
  type: 'object',
  properties: {
    natsAccess: { type: 'boolean' },
    natsRule: { type: 'string', minLength: 1, maxLength: 255 }
  },
  additionalProperties: false
}

const microserviceCatalogItem = {
  id: '/microserviceCatalogItem',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: serviceNameRegex,
      minLength: 1,
      maxLength: 63
    }
  },
  required: ['name'],
  additionalProperties: false
}

const microserviceCatalog = {
  id: '/microserviceCatalog',
  type: 'object',
  properties: {
    bindPath: { type: 'string' },
    permissions: { enum: ['ro', 'rw'] },
    items: {
      type: 'array',
      items: { $ref: '/microserviceCatalogItem' }
    }
  },
  additionalProperties: false
}

const microserviceCatalogPatch = {
  id: '/microserviceCatalogPatch',
  type: 'object',
  properties: {
    bindPath: { type: 'string' },
    permissions: { enum: ['ro', 'rw'] },
    items: {
      type: 'array',
      items: { $ref: '/microserviceCatalogItem' }
    }
  },
  additionalProperties: false
}

const containerDevice = {
  id: '/containerDevice',
  type: 'object',
  properties: {
    hostPath: { type: 'string', pattern: '^/dev/' },
    containerPath: { type: 'string', minLength: 1 },
    permissions: { type: 'string', pattern: '^[rwm]+$' }
  },
  required: ['hostPath', 'containerPath'],
  additionalProperties: false
}

const containerTmpfs = {
  id: '/containerTmpfs',
  type: 'object',
  properties: {
    containerPath: { type: 'string', minLength: 1 },
    size: { type: 'integer', minimum: 1 },
    mode: { type: 'string' }
  },
  required: ['containerPath'],
  additionalProperties: false
}

const containerUlimit = {
  id: '/containerUlimit',
  type: 'object',
  properties: {
    soft: { type: 'integer' },
    hard: { type: 'integer' }
  },
  required: ['soft', 'hard'],
  additionalProperties: false
}

module.exports = {
  mainSchemas: [microserviceCreate, microserviceUpdate, env, ports, extraHosts, portsCreate, microserviceDelete, volumeMappings, microserviceHealthCheck, microserviceCatalogPatch],
  innerSchemas: [volumeMappings, ports, env, extraHosts, microserviceCreate, microserviceHealthCheck, microserviceNatsConfig, microserviceCatalog, microserviceCatalogItem, containerDevice, containerTmpfs, containerUlimit]
}

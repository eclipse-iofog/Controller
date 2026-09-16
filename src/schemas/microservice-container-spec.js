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
  runAsGroup: { type: 'string' },
  readOnlyRootFilesystem: { type: 'boolean' },
  platform: { type: 'string' },
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

const { nameRegex } = require('./utils/utils')

const microserviceCreate = {
  'id': '/microserviceCreate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
    },
    'config': { 'type': 'string' },
    'annotations': { 'type': 'string' },
    'catalogItemId': {
      'type': 'integer',
      'minimum': 4
    },
    'images': {
      'type': 'array',
      'maxItems': 2,
      'items': { '$ref': '/image' }
    },
    'registryId': {
      'type': 'integer'
    },
    'application': {
      'anyOf': [
        { 'type': 'string' },
        { 'type': 'number' }
      ]
    },
    'iofogUuid': { 'type': 'string' },
    'agentName': { 'type': 'string' },
    'hostNetworkMode': { 'type': 'boolean' },
    'isPrivileged': { 'type': 'boolean' },
    'schedule': {
      'type': 'integer',
      'minimum': 0,
      'maximum': 100
    },
    'logSize': { 'type': 'integer' },
    'imageSnapshot': { 'type': 'string' },
    'volumeMappings': {
      'type': 'array',
      'items': { '$ref': '/volumeMappings' } },
    'ports': {
      'type': 'array',
      'items': { '$ref': '/ports' } },
    'extraHosts': {
      'type': 'array',
      'items': { '$ref': '/extraHosts' } },
    'env': {
      'type': 'array',
      'items': { '$ref': '/env' } },
    'cmd': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'cdiDevices': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'capAdd': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'capDrop': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'runAsUser': { 'type': 'string' },
    'platform': { 'type': 'string' },
    'runtime': { 'type': 'string' },
    'cpuSetCpus': { 'type': 'string' },
    'memoryLimit': { 'type': 'integer' },
    'natsConfig': { '$ref': '/microserviceNatsConfig' },
    'healthCheck': {
      'type': 'object',
      'properties': { '$ref': '/microserviceHealthCheck' }
    },
    'serviceAccount': {
      'type': 'object',
      'properties': {
        'roleRef': {
          'type': 'object',
          'properties': {
            'kind': { 'type': 'string' },
            'name': { 'type': 'string' },
            'apiGroup': { 'type': 'string' }
          },
          'required': ['kind', 'name']
        }
      },
      'additionalProperties': false
    }
  },
  'required': ['name'],
  'additionalProperties': true
}

const microserviceUpdate = {
  'id': '/microserviceUpdate',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string',
      'pattern': nameRegex
    },
    'config': { 'type': 'string' },
    'annotations': { 'type': 'string' },
    'rebuild': { 'type': 'boolean' },
    'iofogUuid': { 'type': 'string' },
    'agentName': { 'type': 'string' },
    'hostNetworkMode': { 'type': 'boolean' },
    'isPrivileged': { 'type': 'boolean' },
    'logSize': { 'type': 'integer', 'minimum': 0 },
    'schedule': {
      'type': 'integer',
      'minimum': 0,
      'maximum': 100
    },
    'volumeMappings': {
      'type': 'array',
      'items': { '$ref': '/volumeMappings' }
    },
    'images': {
      'type': 'array',
      'maxItems': 2,
      'minItems': 1,
      'items': { '$ref': '/image' }
    },
    'ports': {
      'type': 'array',
      'items': { '$ref': '/ports' } },
    'extraHosts': {
      'type': 'array',
      'items': { '$ref': '/extraHosts' } },
    'env': {
      'type': 'array',
      'items': { '$ref': '/env' } },
    'cmd': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'cdiDevices': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'capAdd': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'capDrop': {
      'type': 'array',
      'items': { 'type': 'string' } },
    'runAsUser': { 'type': 'string' },
    'platform': { 'type': 'string' },
    'runtime': { 'type': 'string' },
    'cpuSetCpus': { 'type': 'string' },
    'memoryLimit': { 'type': 'integer' },
    'natsConfig': { '$ref': '/microserviceNatsConfig' },
    'healthCheck': {
      'type': 'object',
      'properties': { '$ref': '/microserviceHealthCheck' }
    },
    'serviceAccount': {
      'type': 'object',
      'properties': {
        'roleRef': {
          'type': 'object',
          'properties': {
            'kind': { 'type': 'string' },
            'name': { 'type': 'string' },
            'apiGroup': { 'type': 'string' }
          },
          'required': ['kind', 'name']
        }
      },
      'additionalProperties': false
    }
  },
  'additionalProperties': true
}

const microserviceDelete = {
  'id': '/microserviceDelete',
  'type': 'object',
  'properties': {
    'withCleanup': {
      'type': 'boolean'
    },
    'additionalProperties': true
  }
}

const env = {
  'id': '/env',
  'type': 'object',
  'properties': {
    'key': { 'type': 'string' },
    'value': { 'type': 'string' },
    'valueFromSecret': { 'type': 'string' },
    'valueFromConfigMap': { 'type': 'string' }
  },
  'required': ['key'],
  'oneOf': [
    {
      'required': ['value']
    },
    {
      'required': ['valueFromSecret']
    },
    {
      'required': ['valueFromConfigMap']
    }
  ],
  'additionalProperties': true
}

const extraHosts = {
  'id': '/extraHosts',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string' },
    'address': { 'type': 'string' }
  },
  'required': ['name', 'address'],
  'additionalProperties': true
}

const ports = {
  'id': '/ports',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'protocol': { 'enum': ['tcp', 'udp'] }
  },
  'required': ['internal', 'external'],
  'additionalProperties': true
}

const portsCreate = {
  'id': '/portsCreate',
  'type': 'object',
  'properties': {
    'internal': { 'type': 'integer' },
    'external': { 'type': 'integer' },
    'protocol': { 'enum': ['tcp', 'udp'] }
  },
  'required': ['internal', 'external'],
  'additionalProperties': true
}

const volumeMappings = {
  'id': '/volumeMappings',
  'type': 'object',
  'properties': {
    'hostDestination': { 'type': 'string' },
    'containerDestination': { 'type': 'string' },
    'accessMode': { 'type': 'string' },
    'type': { 'enum': ['volume', 'bind', 'volumeMount'] }
  },
  'required': ['hostDestination', 'containerDestination', 'accessMode'],
  'additionalProperties': true
}

const microserviceHealthCheck = {

  'id': '/microserviceHealthCheck',
  'type': 'object',
  'properties': {
    'test': {
      'type': 'array',
      'items': { 'type': 'string' }
    },
    'interval': { 'type': 'integer' },
    'timeout': { 'type': 'integer' },
    'startPeriod': { 'type': 'integer' },
    'startInterval': { 'type': 'integer' },
    'retries': { 'type': 'integer' }
  },
  'required': ['test']
}

const microserviceNatsConfig = {
  'id': '/microserviceNatsConfig',
  'type': 'object',
  'properties': {
    'natsAccess': { 'type': 'boolean' },
    'natsRule': { 'type': 'string', 'minLength': 1, 'maxLength': 255 }
  },
  'additionalProperties': false
}

module.exports = {
  mainSchemas: [microserviceCreate, microserviceUpdate, env, ports, extraHosts, portsCreate, microserviceDelete, volumeMappings, microserviceHealthCheck],
  innerSchemas: [volumeMappings, ports, env, extraHosts, microserviceCreate, microserviceHealthCheck, microserviceNatsConfig]
}

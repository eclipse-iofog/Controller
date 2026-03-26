/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const iofogCreate = {
  'id': '/iofogCreate',
  'type': 'object',
  'properties': {
    'name': { 'type': 'string', 'minLength': 1 },
    'location': { 'type': 'string' },
    'latitude': { 'type': 'number', 'minimum': -90, 'maximum': 90 },
    'longitude': { 'type': 'number', 'minimum': -180, 'maximum': 180 },
    'description': { 'type': 'string' },
    'networkInterface': { 'type': 'string' },
    'dockerUrl': { 'type': 'string' },
    'containerEngine': { 'type': 'string', 'enum': ['docker', 'podman'] },
    'deploymentType': { 'type': 'string', 'enum': ['native', 'container'] },
    'diskLimit': { 'type': 'integer', 'minimum': 0 },
    'diskDirectory': { 'type': 'string' },
    'memoryLimit': { 'type': 'integer', 'minimum': 0 },
    'cpuLimit': { 'type': 'integer', 'minimum': 0 },
    'logLimit': { 'type': 'integer', 'minimum': 0 },
    'logDirectory': { 'type': 'string' },
    'logFileCount': { 'type': 'integer', 'minimum': 0 },
    'statusFrequency': { 'type': 'integer', 'minimum': 0 },
    'changeFrequency': { 'type': 'integer', 'minimum': 0 },
    'deviceScanFrequency': { 'type': 'integer', 'minimum': 0 },
    'bluetoothEnabled': { 'type': 'boolean' },
    'watchdogEnabled': { 'type': 'boolean' },
    'abstractedHardwareEnabled': { 'type': 'boolean' },
    'fogType': { 'type': 'integer', 'minimum': 0, 'maximum': 2 },
    'dockerPruningFrequency': { 'type': 'integer', 'minimum': 0 },
    'availableDiskThreshold': { 'type': 'integer', 'minimum': 0 },
    'logLevel': { 'type': 'string' },
    'isSystem': { 'type': 'boolean' },
    'routerMode': { 'enum': ['none', 'edge', 'interior'], 'default': 'edge' },
    'messagingPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'interRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'edgeRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsMode': { 'enum': ['none', 'leaf', 'server'], 'default': 'leaf' },
    'natsServerPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsLeafPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsClusterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsMqttPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsHttpPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'jsStorageSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 },
    'jsMemoryStoreSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 },
    'upstreamNatsServers': {
      'type': 'array',
      'items': { 'type': 'string', 'minLength': 1 }
    },
    'host': { 'type': 'string' },
    'tags': {
      'type': 'array',
      'items': { '$ref': '/iofogTag' }
    },
    'upstreamRouters': {
      'type': 'array',
      'items': { 'type': 'string', 'minLength': 1 }
    },
    'networkRouter': { 'type': 'string' },
    'timeZone': { 'type': 'string' }
  },
  'anyOf': [
    {
      'properties': { 'routerMode': { 'const': 'interior' } },
      'required': ['interRouterPort', 'edgeRouterPort', 'host']
    },
    {
      'properties': { 'routerMode': { 'const': 'edge' } },
      'required': ['host']
    },
    {
      'properties': { 'routerMode': { 'const': 'none' } }
    }
  ],
  'additionalProperties': true,
  'required': ['name', 'fogType']
}

const iofogUpdate = {
  'id': '/iofogUpdate',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'name': { 'type': 'string', 'minLength': 1 },
    'location': { 'type': 'string' },
    'latitude': { 'type': 'number', 'minimum': -90, 'maximum': 90 },
    'longitude': { 'type': 'number', 'minimum': -180, 'maximum': 180 },
    'description': { 'type': 'string' },
    'networkInterface': { 'type': 'string' },
    'dockerUrl': { 'type': 'string' },
    'containerEngine': { 'type': 'string', 'enum': ['docker', 'podman'] },
    'deploymentType': { 'type': 'string', 'enum': ['native', 'container'] },
    'diskLimit': { 'type': 'integer', 'minimum': 0 },
    'diskDirectory': { 'type': 'string' },
    'memoryLimit': { 'type': 'integer', 'minimum': 0 },
    'cpuLimit': { 'type': 'integer', 'minimum': 0 },
    'logLimit': { 'type': 'integer', 'minimum': 0 },
    'logDirectory': { 'type': 'string' },
    'logFileCount': { 'type': 'integer', 'minimum': 0 },
    'statusFrequency': { 'type': 'integer', 'minimum': 0 },
    'changeFrequency': { 'type': 'integer', 'minimum': 0 },
    'deviceScanFrequency': { 'type': 'integer', 'minimum': 0 },
    'bluetoothEnabled': { 'type': 'boolean' },
    'watchdogEnabled': { 'type': 'boolean' },
    'abstractedHardwareEnabled': { 'type': 'boolean' },
    'fogType': { 'type': 'integer', 'minimum': 0, 'maximum': 2 },
    'dockerPruningFrequency': { 'type': 'integer', 'minimum': 0 },
    'availableDiskThreshold': { 'type': 'integer', 'minimum': 0 },
    'logLevel': { 'type': 'string' },
    'isSystem': { 'type': 'boolean' },
    'routerMode': { 'enum': ['none', 'edge', 'interior'] },
    'messagingPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'interRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'edgeRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsMode': { 'enum': ['none', 'leaf', 'server'] },
    'natsServerPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsLeafPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsClusterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsMqttPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'natsHttpPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'jsStorageSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 },
    'jsMemoryStoreSize': { 'type': 'string', 'pattern': '^[0-9]+\\s*([mM][bB]?|[gG][bB]?|[tT][bB]?)?$', 'maxLength': 32 },
    'upstreamNatsServers': {
      'type': 'array',
      'items': { 'type': 'string', 'minLength': 1 }
    },
    'host': { 'type': 'string' },
    'upstreamRouters': {
      'type': 'array',
      'items': { 'type': 'string', 'minLength': 1 }
    },
    'tags': {
      'type': 'array',
      'items': { '$ref': '/iofogTag' }
    },
    'networkRouter': { 'type': 'string', 'minLength': 1 },
    'timeZone': { 'type': 'string' }
  },
  'anyOf': [
    {
      'properties': { 'routerMode': { 'const': 'interior' } },
      'required': ['interRouterPort', 'edgeRouterPort', 'host']
    },
    {
      'properties': { 'routerMode': { 'const': 'edge' } }
    },
    {
      'properties': { 'routerMode': { 'const': 'none' } }
    }
  ],
  'additionalProperties': true,
  'required': ['uuid']
}

const iofogDelete = {
  'id': '/iofogDelete',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const iofogGet = {
  'id': '/iofogGet',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'name': { 'type': 'string' }
  },
  oneOf: [
    {
      required: ['uuid']
    },
    {
      required: ['name']
    }
  ],
  'additionalProperties': true
}

const iofogGenerateProvision = {
  'id': '/iofogGenerateProvision',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const iofogSetVersionCommand = {
  'id': '/iofogSetVersionCommand',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'versionCommand': { 'enum': ['upgrade', 'rollback'] }
  },
  'required': ['uuid', 'versionCommand'],
  'additionalProperties': true
}

const iofogReboot = {
  'id': '/iofogReboot',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const iofogFilters = {
  'id': '/iofogFilters',
  'type': 'array',
  'items': { '$ref': '/filter' },
  'required': [],
  'additionalProperties': true
}

const filter = {
  'id': '/filter',
  'type': 'object',
  'properties': {
    'key': { 'type': 'string' },
    'value': { 'type': 'string' },
    'condition': { 'enum': ['has', 'equals'] }
  },
  'required': ['key', 'value', 'condition'],
  'additionalProperties': true
}

const halGet = {
  'id': '/halGet',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const iofogPrune = {
  'id': '/iofogPrune',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const defaultRouterCreate = {
  'id': '/defaultRouterCreate',
  'type': 'object',
  'properties': {
    'messagingPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'interRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'edgeRouterPort': { 'type': 'integer', 'minimum': 1, 'maximum': 65535 },
    'host': { 'type': 'string' }
  },
  'required': ['host'],
  'additionalProperties': true
}

const iofogTag = {
  'id': '/iofogTag',
  'type': 'string'
}

const enableNodeExec = {
  'id': '/enableNodeExec',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' },
    'image': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

const disableNodeExec = {
  'id': '/disableNodeExec',
  'type': 'object',
  'properties': {
    'uuid': { 'type': 'string' }
  },
  'required': ['uuid'],
  'additionalProperties': true
}

module.exports = {
  mainSchemas: [iofogCreate, iofogUpdate, iofogDelete,
    iofogGet, iofogGenerateProvision, iofogSetVersionCommand,
    iofogReboot, iofogFilters, halGet, iofogPrune, defaultRouterCreate, iofogTag, enableNodeExec, disableNodeExec],
  innerSchemas: [filter, iofogTag]
}

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

const BaseCLIHandler = require('./base-cli-handler')
const constants = require('../helpers/constants')
const ErrorMessages = require('../helpers/error-messages')
const logger = require('../logger')
const MicroserviceService = require('../services/microservices-service')
const fs = require('fs')
const AppHelper = require('../helpers/app-helper')
const CliDataTypes = require('./cli-data-types')

const JSON_SCHEMA_ADD = AppHelper.stringifyCliJsonSchema(
  {
    name: 'string',
    config: 'string',
    annotations: 'string',
    catalogItemId: 0,
    images: [
      {
        containerImage: 'string',
        fogTypeId: 1
      }
    ],
    registryId: 1,
    application: 'string',
    iofogUuid: 'string',
    hostNetworkMode: true,
    isPrivileged: true,
    logSize: 0,
    volumeMappings: [
      {
        hostDestination: '/var/dest',
        containerDestination: '/var/dest',
        accessMode: 'rw',
        type: 'volume'
      }
    ],
    ports: [
      {
        internal: 0,
        external: 0,
        publicMode: true
      }
    ],
    env: [
      {
        key: 'string',
        value: 'string'
      }
    ],
    cmd: [
      'string'
    ],
    cdiDevices: [
      'string'
    ],
    capAdd: [
      'string'
    ],
    capDrop: [
      'string'
    ],
    runAsUser: 'string',
    platform: 'string',
    runtime: 'string'
  }
)

const JSON_SCHEMA_UPDATE = AppHelper.stringifyCliJsonSchema(
  {
    name: 'string',
    config: 'string',
    annotations: 'string',
    rebuild: true,
    iofogUuid: 'string',
    hostNetworkMode: true,
    isPrivileged: true,
    logSize: 0,
    catalogItemId: 0,
    images: [
      {
        containerImage: 'string',
        fogTypeId: 1
      }
    ],
    registryId: 1,
    volumeMappings: [
      {
        hostDestination: '/var/dest',
        containerDestination: '/var/dest',
        accessMode: 'rw',
        type: 'bind'
      }
    ],
    env: [
      {
        key: 'string',
        value: 'string'
      }
    ],
    cmd: [
      'string'
    ],
    cdiDevices: [
      'string'
    ],
    capAdd: [
      'string'
    ],
    capDrop: [
      'string'
    ],
    runAsUser: 'string',
    platform: 'string',
    runtime: 'string'
  }
)

class Microservice extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_MICROSERVICE
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        group: [constants.CMD]
      },
      {
        name: 'file',
        alias: 'f',
        type: String,
        description: 'Path to microservice settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'microservice-uuid',
        alias: 'i',
        type: String,
        description: 'Microservice UUID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PORT_MAPPING_CREATE,
          constants.CMD_PORT_MAPPING_REMOVE, constants.CMD_PORT_MAPPING_LIST, constants.CMD_VOLUME_MAPPING_CREATE,
          constants.CMD_VOLUME_MAPPING_REMOVE, constants.CMD_VOLUME_MAPPING_LIST]
      },
      {
        name: 'name',
        alias: 'n',
        type: String,
        description: 'Microservice name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'x86-image',
        alias: 'x',
        type: String,
        description: 'x86 docker image name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'arm-image',
        alias: 'a',
        type: String,
        description: 'ARM docker image name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'registry-id',
        alias: 'd',
        type: CliDataTypes.Integer,
        description: 'Microservice docker registry ID',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'catalog-id',
        alias: 'c',
        type: CliDataTypes.Integer,
        description: 'Catalog item ID',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'application-name',
        alias: 'F',
        type: String,
        description: 'Application name',
        group: [constants.CMD_ADD]
      },
      {
        name: 'iofog-uuid',
        alias: 'I',
        type: String,
        description: 'ioFog node UUID',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'config',
        alias: 'g',
        type: String,
        description: 'Microservice config',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'annotations',
        alias: 'A',
        type: String,
        description: 'Microservice annotations',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'volumes',
        alias: 'v',
        type: String,
        description: 'Microservice volume mapping(s)',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-size',
        alias: 'l',
        type: CliDataTypes.Integer,
        description: 'Log file size limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'host-network-mode',
        alias: 'hN',
        type: Boolean,
        description: 'Enable host network mode',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'is-privileged',
        alias: 'iP',
        type: Boolean,
        description: 'Enable privileged mode',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'ports',
        alias: 'p',
        type: String,
        description: 'Container ports',
        multiple: true,
        group: [constants.CMD_ADD]
      },
      {
        name: 'mapping',
        alias: 'P',
        type: String,
        description: 'Container port mapping',
        group: [constants.CMD_PORT_MAPPING_CREATE, constants.CMD_VOLUME_MAPPING_CREATE]
      },
      {
        name: 'internal-port',
        alias: 'b',
        type: CliDataTypes.Integer,
        description: 'Internal port',
        group: [constants.CMD_PORT_MAPPING_REMOVE]
      },
      {
        name: 'rebuild',
        alias: 'w',
        type: Boolean,
        description: 'Rebuild microservice image on fog agent',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'cleanup',
        alias: 'z',
        type: Boolean,
        description: 'Delete microservice with cleanup',
        group: [constants.CMD_REMOVE]
      },
      {
        name: 'mapping-id',
        alias: 'm',
        type: CliDataTypes.Integer,
        description: 'Volume mapping id',
        group: [constants.CMD_VOLUME_MAPPING_REMOVE]
      },
      {
        name: 'env',
        alias: 'e',
        type: String,
        description: 'Microservice environemnt variable(s)',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'cmd',
        alias: 'C',
        type: String,
        description: 'Microservice container command and argument(s)',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'cdiDevices',
        alias: 'D',
        type: String,
        description: 'Map CDI devices to microservice container',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'capAdd',
        alias: 'cA',
        type: String,
        description: 'A list of kernel capabilities to add to the container.',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'capDrop',
        alias: 'cD',
        type: String,
        description: 'A list of kernel capabilities to drop to the container.',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'user',
        alias: 'U',
        type: String,
        description: 'Run Microservice as a user)',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'platform',
        alias: 'L',
        type: String,
        description: 'Microservice image platform to be used',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'runtime',
        alias: 'y',
        type: String,
        description: 'Microservice container runtime definition',
        multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new microservice.',
      [constants.CMD_UPDATE]: 'Update existing microservice.',
      [constants.CMD_REMOVE]: 'Delete a microservice.',
      [constants.CMD_LIST]: 'List all microservices.',
      [constants.CMD_INFO]: 'Get microservice settings.',
      [constants.CMD_PORT_MAPPING_CREATE]: 'Create microservice port mapping.',
      [constants.CMD_PORT_MAPPING_REMOVE]: 'Remove microservice port mapping.',
      [constants.CMD_PORT_MAPPING_LIST]: 'List microservice port mapping.',
      [constants.CMD_VOLUME_MAPPING_CREATE]: 'Create microservice volume mapping.',
      [constants.CMD_VOLUME_MAPPING_REMOVE]: 'Remove microservice volume mapping.',
      [constants.CMD_VOLUME_MAPPING_LIST]: 'List microservice volume mapping.'
    }
  }

  async run (args) {
    try {
      const microserviceCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = microserviceCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(microserviceCommand, constants.CMD_ADD, _createMicroservice)
          break
        case constants.CMD_UPDATE:
          await _executeCase(microserviceCommand, constants.CMD_UPDATE, _updateMicroservice)
          break
        case constants.CMD_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_REMOVE, _removeMicroservice)
          break
        case constants.CMD_LIST:
          await _executeCase(microserviceCommand, constants.CMD_LIST, _listMicroservices)
          break
        case constants.CMD_INFO:
          await _executeCase(microserviceCommand, constants.CMD_INFO, _getMicroservice)
          break
        case constants.CMD_PORT_MAPPING_CREATE:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_CREATE, _createPortMapping)
          break
        case constants.CMD_PORT_MAPPING_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_REMOVE, _removePortMapping)
          break
        case constants.CMD_PORT_MAPPING_LIST:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_LIST, _listPortMappings)
          break
        case constants.CMD_VOLUME_MAPPING_CREATE:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_CREATE, _createVolumeMapping)
          break
        case constants.CMD_VOLUME_MAPPING_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_REMOVE, _removeVolumeMapping)
          break
        case constants.CMD_VOLUME_MAPPING_LIST:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_LIST, _listVolumeMappings)
          break
        case constants.CMD_HELP:
        default:
          return this.help()
      }
    } catch (error) {
      this.handleCLIError(error, args.argv)
    }
  }

  help () {
    super.help([], true, true, [
      {
        header: 'JSON ADD File Schema',
        content: [
          JSON_SCHEMA_ADD
        ],
        raw: true
      },
      {
        header: 'JSON UPDATE File Schema',
        content: [
          JSON_SCHEMA_UPDATE
        ],
        raw: true
      },
      {
        header: 'Examples',
        content: [
          {
            desc: '1. Single mapping',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src:rw'
          },
          {
            desc: '2. Multiple mappings',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src:rw ' +
            '/host_bin:/container_bin:r'
          },
          {
            desc: '3. Port mapping (80:8080:false - internal port : external port : public mode)',
            example: '$ iofog-controller microservice add [other required options] --ports 80:8080:false 443:5443:false'
          },
          {
            desc: '4. Create port mapping (80:8080:false - internal port : external port : public mode, ABC - microservice)',
            example: '$ iofog-controller microservice port-mapping-create --mapping 80:8080:false -i ABC'
          },
          {
            desc: '8. Delete port mapping (80 - internal port, ABC - microservice uuid)',
            example: '$ iofog-controller microservice port-mapping-remove --internal-port 80 -i ABC'
          },
          {
            desc: '9. Create volume mapping',
            example: '$ iofog-controller microservice volume-mapping-create --mapping /host_src:/container_src:rw -i ABC'
          },
          {
            desc: '10. Delete volume mapping',
            example: '$ iofog-controller microservice volume-mapping-remove -i ABC -a 1'
          }
        ]
      }
    ])
  }
}

async function _executeCase (commands, commandName, f) {
  try {
    const obj = commands[commandName]
    await f(obj)
  } catch (error) {
    logger.error(error.message)
  }
}

const _createPortMapping = async function (obj) {
  const mapping = parsePortMappingObject(obj.mapping, ErrorMessages.CLI.INVALID_PORT_MAPPING)
  logger.cliReq('microservice port-mapping-create', { args: mapping })
  await MicroserviceService.createPortMappingEndPoint(obj.microserviceUuid, mapping, true)
  logger.cliRes('Port mapping has been created successfully.')
}

const _createVolumeMapping = async function (obj) {
  const mapping = parseVolumeMappingObject(obj.mapping, ErrorMessages.CLI.INVALID_VOLUME_MAPPING)
  logger.cliReq('microservice volume-mapping-create', { args: mapping })
  const result = await MicroserviceService.createVolumeMappingEndPoint(obj.microserviceUuid, mapping, true)
  logger.cliRes(JSON.stringify({
    id: result.id
  }, null, 2))
}

const _removePortMapping = async function (obj) {
  try {
    logger.cliReq('microservice port-mapping-remove', { args: obj })
    await MicroserviceService.deletePortMappingEndPoint(obj.microserviceUuid, obj.internalPort, true)
    logger.cliRes('Port mapping has been removed successfully.')
  } catch (e) {
    logger.error(e.message)
  }
}

const _removeVolumeMapping = async function (obj) {
  try {
    logger.cliReq('microservice volume-mapping-remove', { args: obj })
    await MicroserviceService.deleteVolumeMappingEndPoint(obj.microserviceUuid, obj.mappingId, true)
    logger.cliRes('Volume mapping has been deleted successfully.')
  } catch (e) {
    logger.error(e.message)
  }
}

const _listPortMappings = async function (obj) {
  logger.cliReq('microservice port-mapping-list', { args: { microserviceUuid: obj.microserviceUuid } })
  const result = await MicroserviceService.listMicroservicePortMappingsEndPoint(obj.microserviceUuid, true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _listVolumeMappings = async function (obj) {
  logger.cliReq('microservice volume-mapping-list', { args: { microserviceUuid: obj.microserviceUuid } })
  const result = await MicroserviceService.listVolumeMappingsEndPoint(obj.microserviceUuid, true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _removeMicroservice = async function (obj) {
  const microserviceData = {
    withCleanup: obj.cleanup
  }

  logger.cliReq('microservice remove', { args: { microserviceUuid: obj.microserviceUuid, withCleanup: obj.cleanup } })
  await MicroserviceService.deleteMicroserviceEndPoint(obj.microserviceUuid, microserviceData, true)
  logger.cliRes('Microservice has been removed successfully.')
}

const _listMicroservices = async function () {
  logger.cliReq('microservice list')
  const result = await MicroserviceService.listMicroservicesEndPoint('', true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _getMicroservice = async function (obj) {
  logger.cliReq('microservice info', { args: { microserviceUuid: obj.microserviceUuid } })
  const result = await MicroserviceService.getMicroserviceEndPoint(obj.microserviceUuid, true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

const _createMicroservice = async function (obj) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createMicroserviceObject(obj)

  logger.cliReq('microservice add', { args: microservice })
  const result = await MicroserviceService.createMicroserviceEndPoint(microservice, true)
  const output = {
    uuid: result.uuid
  }
  if (result.publicLink) {
    output.publicLink = result.publicLink
  }

  logger.cliRes(JSON.stringify(output, null, 2))
}

const _updateMicroservice = async function (obj) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _updateMicroserviceObject(obj)

  logger.cliReq('microservice update', { args: microservice })
  await MicroserviceService.updateMicroserviceEndPoint(obj.microserviceUuid, microservice, true)
  logger.cliRes('Microservice has been updated successfully.')
}

const _updateMicroserviceObject = function (obj) {
  const envVars = obj.env || []
  const env = envVars.map((it) => {
    const split = it.split('=')
    if (!split || split.length < 2) {
      return
    }

    return {
      key: split[0],
      value: split.slice(1).join('=')
    }
  }).filter((it) => !!it)

  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    annotations: obj.annotations,
    iofogUuid: obj.iofogUuid,
    hostNetworkMode: obj.hostNetworkMode,
    isPrivileged: obj.isPrivileged,
    logSize: (obj.logSize || constants.MICROSERVICE_DEFAULT_LOG_SIZE) * 1,
    rebuild: obj.rebuild,
    cmd: obj.cmd,
    cdiDevices: obj.cdiDevices,
    capAdd: obj.capAdd,
    capDrop: obj.capDrop,
    runAsUser: obj.runAsUser,
    platform: obj.platform,
    runtime: obj.runtime,
    env,
    images: obj.images,
    catalogItemId: parseInt(obj.catalogItemId) || undefined,
    registryId: parseInt(obj.registryId) || undefined
  }

  const images = []

  if (obj.x86Image) {
    images.push(
      {
        containerImage: obj.x86Image,
        fogTypeId: 1
      }
    )
  }
  if (obj.armImage) {
    images.push(
      {
        containerImage: obj.armImage,
        fogTypeId: 2
      }
    )
  }

  if (images.length > 0) {
    microserviceObj.images = images
  }

  if (obj.volumes) {
    microserviceObj.volumeMappings = parseVolumeMappingArray(obj.volumes, 'Error during parsing of volume mapping option.')
  }

  return AppHelper.deleteUndefinedFields(microserviceObj)
}

const _createMicroserviceObject = function (obj) {
  const envVars = obj.env || []
  const env = envVars.map((it) => {
    const split = it.split('=')
    if (!split || split.length < 2) {
      return
    }

    return {
      key: split[0],
      value: split.slice(1).join('=')
    }
  }).filter((it) => !!it)

  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    annotations: obj.annotations,
    catalogItemId: parseInt(obj.catalogId) || undefined,
    application: obj.applicationName,
    registryId: parseInt(obj.registryId) || undefined,
    iofogUuid: obj.iofogUuid,
    hostNetworkMode: obj.hostNetworkMode,
    isPrivileged: obj.isPrivileged,
    logSize: (obj.logSize || constants.MICROSERVICE_DEFAULT_LOG_SIZE) * 1,
    cmd: obj.cmd,
    cdiDevices: obj.cdiDevices,
    capAdd: obj.capAdd,
    capDrop: obj.capDrop,
    runAsUser: obj.runAsUser,
    platform: obj.platform,
    runtime: obj.runtime,
    env,
    images: []
  }

  if (obj.x86Image) {
    microserviceObj.images.push(
      {
        containerImage: obj.x86Image,
        fogTypeId: 1
      }
    )
  }
  if (obj.armImage) {
    microserviceObj.images.push(
      {
        containerImage: obj.armImage,
        fogTypeId: 2
      }
    )
  }
  if (obj.volumes) {
    microserviceObj.volumeMappings = parseVolumeMappingArray(obj.volumes, ErrorMessages.CLI.INVALID_VOLUME_MAPPING)
  }
  if (obj.ports) {
    microserviceObj.ports = parsePortMappingArray(obj.ports, ErrorMessages.CLI.INVALID_PORT_MAPPING)
  }

  return AppHelper.deleteUndefinedFields(microserviceObj)
}

const parseVolumeMappingObject = function (obj, errMsg) {
  let result = {}
  try {
    const props = obj.split(':')
    const type = props[3] || constants.VOLUME_MAPPING_DEFAULT
    result = {
      hostDestination: props[0],
      containerDestination: props[1],
      accessMode: props[2],
      type
    }
  } catch (e) {
    logger.warn(errMsg)
  }
  return result
}

const parseVolumeMappingArray = function (arr, errMsg) {
  return arr.map((obj) => parseVolumeMappingObject(obj, errMsg))
}

const parsePortMappingObject = function (obj, errMsg) {
  let result = {}
  try {
    const props = obj.split(':')
    result = {
      internal: parseInt(props[0]),
      external: parseInt(props[1]),
      publicMode: props[2] === 'true'
    }
  } catch (e) {
    logger.warn(errMsg)
  }
  return result
}

const parsePortMappingArray = function (arr, errMsg) {
  return arr.map((obj) => parsePortMappingObject(obj, errMsg))
}

module.exports = new Microservice()

/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseCLIHandler = require('./base-cli-handler');
const constants = require('../helpers/constants');
const ErrorMessages = require('../helpers/error-messages');
const logger = require('../logger');
const MicroserviceService = require('../services/microservices-service');
const fs = require('fs');
const AppHelper = require('../helpers/app-helper');
const CliDecorator = require('../decorators/cli-decorator');

const JSON_SCHEMA_ADD = AppHelper.stringifyCliJsonSchema(
  {
    name: "string",
    config: "string",
    catalogItemId: 0,
    flowId: 0,
    iofogUuid: "string",
    rootHostAccess: true,
    logSize: 0,
    volumeMappings: [
      {
        hostDestination: "/var/dest",
        containerDestination: "/var/dest",
        accessMode: "rw"
      }
    ],
    ports: [
      {
        internal: 0,
        external: 0,
        publicMode: true
      }
    ],
    routes: [
      "string"
    ]
  }
);

const JSON_SCHEMA_UPDATE = AppHelper.stringifyCliJsonSchema(
  {
    name: "string",
    config: "string",
    rebuild: true,
    iofogUuid: "string",
    rootHostAccess: true,
    logSize: 0,
    volumeMappings: [
      {
        hostDestination: "/var/dest",
        containerDestination: "/var/dest",
        accessMode: "rw"
      }
    ]
  }
);

class Microservice extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_MICROSERVICE;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true,
        group: [constants.CMD]
      },
      {
        name: 'file', alias: 'f', type: String, description: 'Path to microservice settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'microservice-id', alias: 'i', type: String, description: 'Microservice ID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PORT_MAPPING_CREATE,
          constants.CMD_PORT_MAPPING_REMOVE, constants.CMD_PORT_MAPPING_LIST, constants.CMD_VOLUME_MAPPING_CREATE,
          constants.CMD_VOLUME_MAPPING_REMOVE, constants.CMD_VOLUME_MAPPING_LIST]
      },
      {
        name: 'name', alias: 'n', type: String, description: 'Microservice name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'catalog-id', alias: 'c', type: Number, description: 'Catalog item ID',
        group: [constants.CMD_ADD]
      },
      {
        name: 'flow-id', alias: 'F', type: Number, description: 'Application flow ID',
        group: [constants.CMD_ADD]
      },
      {
        name: 'iofog-id', alias: 'I', type: String, description: 'ioFog node ID',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'config', alias: 'g', type: String, description: 'Microservice config',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'volumes', alias: 'v', type: String, description: 'Microservice volume mapping(s)', multiple: true,
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-size', alias: 'l', type: Number, description: 'Log file size limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'root-enable', alias: 'r', type: Boolean, description: 'Enable root access',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'root-disable', alias: 'R', type: Boolean, description: 'Disable root access',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'ports', alias: 'p', type: String, description: 'Container ports', multiple: true,
        group: [constants.CMD_ADD]
      },
      {
        name: 'mapping', alias: 'P', type: String, description: 'Container port mapping',
        group: [constants.CMD_PORT_MAPPING_CREATE, constants.CMD_VOLUME_MAPPING_CREATE]
      },
      {
        name: 'routes', alias: 't', type: String,
        description: 'Microservice route(s) (receiving microservices)',
        multiple: true,
        group: [constants.CMD_ADD]
      },
      {
        name: 'route', alias: 'T', type: String, description: 'Microservice route (receiving microservices)',
        group: [constants.CMD_ROUTE_CREATE, constants.CMD_ROUTE_REMOVE]
      },
      {
        name: 'internal-port', alias: 'b', type: String, description: 'Internal port',
        group: [constants.CMD_PORT_MAPPING_REMOVE]
      },
      {
        name: 'rebuild', alias: 'w', type: Boolean, description: 'Rebuild microservice image on fog agent',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'cleanup', alias: 'z', type: Boolean, description: 'Delete microservice with cleanup',
        group: [constants.CMD_REMOVE]
      },
      {
        name: 'user-id', alias: 'u', type: Number, description: 'User\'s id',
        group: [constants.CMD_ADD]
      },
      {
        name: 'mapping-id', alias: 'a', type: Number, description: 'Volume mapping id',
        group: [constants.CMD_VOLUME_MAPPING_REMOVE]
      }
    ];
    this.commands = {
      [constants.CMD_ADD]: 'Add a new microservice.',
      [constants.CMD_UPDATE]: 'Update existing microservice.',
      [constants.CMD_REMOVE]: 'Delete a microservice.',
      [constants.CMD_LIST]: 'List all microservices.',
      [constants.CMD_INFO]: 'Get microservice settings.',
      [constants.CMD_ROUTE_CREATE]: 'Create microservice route.',
      [constants.CMD_ROUTE_REMOVE]: 'Remove microservice route.',
      [constants.CMD_PORT_MAPPING_CREATE]: 'Create microservice port mapping.',
      [constants.CMD_PORT_MAPPING_REMOVE]: 'Remove microservice port mapping.',
      [constants.CMD_PORT_MAPPING_LIST]: 'List microservice port mapping.',
      [constants.CMD_VOLUME_MAPPING_CREATE]: 'Create microservice volume mapping.',
      [constants.CMD_VOLUME_MAPPING_REMOVE]: 'Remove microservice volume mapping.',
      [constants.CMD_VOLUME_MAPPING_LIST]: 'List microservice volume mapping.',
    }
  }

  async run(args) {
    try {
      const microserviceCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv, partial: false});

      const command = microserviceCommand.command.command;

      AppHelper.validateParameters(command, this.commandDefinitions, args.argv);

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(microserviceCommand, constants.CMD_ADD, _createMicroservice, true);
          break;
        case constants.CMD_UPDATE:
          await _executeCase(microserviceCommand, constants.CMD_UPDATE, _updateMicroservice, false);
          break;
        case constants.CMD_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_REMOVE, _removeMicroservice, false);
          break;
        case constants.CMD_LIST:
          await _executeCase(microserviceCommand, constants.CMD_LIST, _listMicroservices, false);
          break;
        case constants.CMD_INFO:
          await _executeCase(microserviceCommand, constants.CMD_INFO, _getMicroservice, false);
          break;
        case constants.CMD_ROUTE_CREATE:
          await _executeCase(microserviceCommand, constants.CMD_ROUTE_CREATE, _createRoute, false);
          break;
        case constants.CMD_ROUTE_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_ROUTE_REMOVE, _removeRoute, false);
          break;
        case constants.CMD_PORT_MAPPING_CREATE:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_CREATE, _createPortMapping, false);
          break;
        case constants.CMD_PORT_MAPPING_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_REMOVE, _removePortMapping, false);
          break;
        case constants.CMD_PORT_MAPPING_LIST:
          await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING_LIST, _listPortMappings, false);
          break;
        case constants.CMD_VOLUME_MAPPING_CREATE:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_CREATE, _createVolumeMapping, false);
          break;
        case constants.CMD_VOLUME_MAPPING_REMOVE:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_REMOVE, _removeVolumeMapping, false);
          break;
        case constants.CMD_VOLUME_MAPPING_LIST:
          await _executeCase(microserviceCommand, constants.CMD_VOLUME_MAPPING_LIST, _listVolumeMappings, false);
          break;
        case constants.CMD_HELP:
        default:
          return this.help()
      }
    } catch (error) {
      AppHelper.handleCLIError(error);
    }
  }

  help() {
    super.help([constants.CMD_LIST], true, true, [
      {
        header: 'JSON ADD File Schema',
        content: [
          JSON_SCHEMA_ADD,
        ],
        raw: true,
      },
      {
        header: 'JSON UPDATE File Schema',
        content: [
          JSON_SCHEMA_UPDATE
        ],
        raw: true,
      },
      {
        header: 'Examples',
        content: [
          {
            desc: '1. Single mapping',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src:rw',
          },
          {
            desc: '2. Multiple mappings',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src:rw /host_bin:/container_bin:r',
          },
          {
            desc: '3. Port mapping (80:8080:false - internal port : external port : public mode)',
            example: '$ iofog-controller microservice add [other required options] --ports 80:8080:false 443:5443:false',
          },
          {
            desc: '4. Add routes (ABC:DEF - source microservice id : dest microservice id)',
            example: '$ iofog-controller microservice add [other required options] --routes ABC:DEF RFG:HJK'
          },
          {
            desc: '5. Add route (ABC:DEF - source microservice id : dest microservice id)',
            example: '$ iofog-controller microservice route-create --route ABC:DEF',
          },
          {
            desc: '6. Delete route (ABC:DEF - source microservice id : dest microservice id)',
            example: '$ iofog-controller microservice route-remove --route ABC:DEF',
          },
          {
            desc: '7. Create port mapping (80:8080:false - internal port : external port : public mode, ABC - microservice)',
            example: '$ iofog-controller microservice port-mapping-create --mapping 80:8080:false -i ABC'
          },
          {
            desc: '8. Delete port mapping (80 - internal port, ABC - microservice id)',
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
        ],
      },
    ])
  }
}

async function _executeCase(commands, commandName, f, isUserRequired) {
  try {
    const obj = commands[commandName];

    if (isUserRequired) {
      const decoratedFunction = CliDecorator.prepareUserById(f);
      await decoratedFunction(obj);
    } else {
      await f(obj);
    }
  } catch (error) {
    logger.error(error.message);
  }
}

const _createRoute = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  try {
    const arr = obj.route.split(':');
    const sourceMicroserviceId = arr[0];
    const destMicroserviceId = arr[1];
    await MicroserviceService.createRoute(sourceMicroserviceId, destMicroserviceId, user, true);
    logger.info(`Microservice route with source microservice ${sourceMicroserviceId} and dest microservice 
                ${destMicroserviceId} has been created successfully.`)
  } catch (e) {
    logger.error(ErrorMessages.CLI.INVALID_ROUTE);
  }
};

const _removeRoute = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  try {
    const arr = obj.route.split(':');
    const sourceMicroserviceId = arr[0];
    const destMicroserviceId = arr[1];
    await MicroserviceService.deleteRoute(sourceMicroserviceId, destMicroserviceId, user, true);
    logger.info(`Microservice route with source microservice ${obj.sourceMicroserviceId} and dest microservice 
                ${obj.destMicroserviceId} has been removed successfully.`);
  } catch (e) {
    logger.error(ErrorMessages.CLI.INVALID_ROUTE);
  }
};

const _createPortMapping = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  const mapping = parsePortMappingObject(obj.mapping, ErrorMessages.CLI.INVALID_PORT_MAPPING);
  await MicroserviceService.createPortMapping(obj.microserviceId, mapping, user, true);
  logger.info('Port mapping has been created successfully.');
};

const _createVolumeMapping = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  const mapping = parseVolumeMappingObject(obj.mapping, ErrorMessages.CLI.INVALID_VOLUME_MAPPING);
  const result = await MicroserviceService.createVolumeMapping(obj.microserviceId, mapping, user, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Volume mapping has been created successfully.')
};

const _removePortMapping = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  try {
    const internalPort = parseInt(obj.internalPort);
    await MicroserviceService.deletePortMapping(obj.microserviceId, internalPort, user, true);
    logger.info('Port mapping has been deleted successfully.');
  } catch (e) {
    logger.error(e.message);
  }
};

const _removeVolumeMapping = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  try {
    await MicroserviceService.deleteVolumeMapping(obj.microserviceId, obj.mappingId, user, true);
    logger.info('Volume mapping has been deleted successfully.');
  } catch (e) {
    logger.error(e.message);
  }
};

const _listPortMappings = async function (obj, user) {
  const result = await MicroserviceService.listMicroservicePortMappings(obj.microserviceId, user, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Port mappings have been retrieved successfully.');
};

const _listVolumeMappings = async function (obj, user) {
  const result = await MicroserviceService.listVolumeMappings(obj.microserviceId, user, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Volume mappings have been retrieved successfully.');
};

const _removeMicroservice = async function (obj, user) {
  const microserviceData = {
    withCleanup: obj.cleanup
  };

  await MicroserviceService.deleteMicroservice(obj.microserviceId, microserviceData, user, true);
  logger.info('Microservice has been removed successfully.')
};

const _listMicroservices = async function () {
  const result = await MicroserviceService.listMicroservices({}, {}, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Microservices have been retrieved successfully.');
};

const _getMicroservice = async function (obj, user) {
  logger.info(JSON.stringify(obj));
  const result = await MicroserviceService.getMicroservice(obj.microserviceId, user, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Microservice has been retrieved successfully.');
};

const _createMicroservice = async function (obj, user) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createMicroserviceObject(obj);

  logger.info(JSON.stringify(microservice));

  const result = await MicroserviceService.createMicroservice(microservice, user, true);
  logger.info(JSON.stringify(result));
  logger.info('Microservice has been created successfully.');
};

const _updateMicroservice = async function (obj, user) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _updateMicroserviceObject(obj);

  logger.info(JSON.stringify(microservice));

  await MicroserviceService.updateMicroservice(obj.microserviceId, microservice, user, true);
  logger.info('Microservice has been updated successfully.');
};

const _updateMicroserviceObject = function (obj) {
  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    iofogUuid: obj.iofogId,
    rootHostAccess: AppHelper.validateBooleanCliOptions(obj.rootEnable, obj.rootDisable),
    logSize: obj.logSize,
    rebuild: obj.rebuild
  };

  if (obj.volumes) {
    microserviceObj.volumeMappings = parseVolumeMappingArray(obj.volumes, 'Error during parsing of volume mapping option.');
  }

  return AppHelper.deleteUndefinedFields(microserviceObj);
};

const _createMicroserviceObject = function (obj) {
  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    catalogItemId: parseInt(obj.catalogId),
    flowId: parseInt(obj.flowId),
    iofogUuid: obj.iofogId,
    rootHostAccess: AppHelper.validateBooleanCliOptions(obj.rootEnable, obj.rootDisable),
    logSize: obj.logSize,
    routes: obj.routes
  };

  if (obj.volumes) {
    microserviceObj.volumeMappings = parseVolumeMappingArray(obj.volumes, ErrorMessages.CLI.INVALID_VOLUME_MAPPING);
  }
  if (obj.ports) {
    microserviceObj.ports = parsePortMappingArray(obj.ports, ErrorMessages.CLI.INVALID_PORT_MAPPING);
  }

  return AppHelper.deleteUndefinedFields(microserviceObj);
};

const parseVolumeMappingObject = function (obj, errMsg) {
  let result = {};
  try {
    const props = obj.split(':');
    result = {
      hostDestination: props[0],
      containerDestination: props[1],
      accessMode: props[2]
    }
  } catch (e) {
    logger.warn(errMsg);
  }
  return result;
};

const parseVolumeMappingArray = function (arr, errMsg) {
  return arr.map(obj => parseVolumeMappingObject(obj, errMsg));
};

const parsePortMappingObject = function (obj, errMsg) {
  let result = {};
  try {
    const props = obj.split(':');
    result = {
      internal: parseInt(props[0]),
      external: parseInt(props[1]),
      publicMode: props[2] === 'true'
    }
  } catch (e) {
    logger.warn(errMsg);
  }
  return result;
};

const parsePortMappingArray = function (arr, errMsg) {
  return arr.map(obj => parsePortMappingObject(obj, errMsg));
};

module.exports = new Microservice();
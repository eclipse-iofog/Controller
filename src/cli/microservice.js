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
const AuthDecorator = require('../decorators/cli-decorator');

const JSON_SCHEMA_ADD = AppHelper.stringifyCliJsonSchema(
  {
    name: "string",
    config: "string",
    catalogItemId: 0,
    flowId: 0,
    ioFogNodeId: "string",
    rootHostAccess: true,
    logLimit: 0,
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
    ioFogNodeId: "string",
    rootHostAccess: true,
    logLimit: 0,
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
    super()

    this.name = constants.CMD_MICROSERVICE
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      {
        name: 'file', alias: 'f', type: String, description: 'Microservice settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'microservice-id', alias: 'i', type: String, description: 'Microservice ID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PORT_MAPPING]
      },
      {
        name: 'name', alias: 'n', type: String, description: 'Microservice name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'catalog-id', alias: 'c', type: String, description: 'Catalog item ID',
        group: [constants.CMD_ADD]
      },
      {
        name: 'flow-id', alias: 'F', type: String, description: 'Application flow ID',
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
        name: 'log-limit', alias: 'l', type: Number, description: 'Log file size limit (MB)',
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
        name: 'routes', alias: 't', type: String, description: 'Microservice route(s) (receiving microservices)', multiple: true,
        group: [constants.CMD_ADD]
      },
      {
        name: 'add', alias: 'a', type: String, description: 'Add new route(s)',
        group: [constants.CMD_ROUTE]
      },
      {
        name: 'remove', alias: 'm', type: String, description: 'Delete existing route(s)',
        group: [constants.CMD_ROUTE]
      },
      {
        name: 'create', alias: 'b', type: String, description: 'Add new port mapping(s)',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'delete', alias: 'B', type: String, description: 'Delete existing port mapping(s)',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'list', alias: 'G', type: Boolean, description: 'List port mappings',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'rebuild', alias: 'w', type: Boolean, description: 'Rebuild microservice image on fog agent',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'cleanUp', alias: 'z', type: Boolean, description: 'Delete microservice with cleanup',
        group: [constants.CMD_REMOVE]
      },
      {
        name: 'user-id', alias: 'u', type: Number, description: 'User\'s id',
        group: [constants.CMD_ADD]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new microservice.',
      [constants.CMD_UPDATE]: 'Update existing microservice.',
      [constants.CMD_REMOVE]: 'Delete a microservice.',
      [constants.CMD_LIST]: 'List all microservices.',
      [constants.CMD_INFO]: 'Get microservice settings.',
      [constants.CMD_ROUTE]: 'Add/Remove microservice route.',
      [constants.CMD_PORT_MAPPING]: 'Create/Delete/List microservice port mapping.'
    }
  }

  async run(args) {
    const microserviceCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (microserviceCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(microserviceCommand, constants.CMD_ADD, _createMicroservice, false);
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
      case constants.CMD_ROUTE:
        await _executeCase(microserviceCommand, constants.CMD_ROUTE, _executeRouteCommand, false);
        break;
      case constants.CMD_PORT_MAPPING:
        await _executeCase(microserviceCommand, constants.CMD_PORT_MAPPING, _executePortMappingCommand, false);
        break;
      case constants.CMD_HELP:
      default:
        return this.help()
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
            example: '$ fog-controller microservice add [other required options] --volumes /host_src:/container_src',
          },
          {
            desc: '2. Multiple mappings',
            example: '$ fog-controller microservice add [other required options] --volumes /host_src:/container_src /host_bin:/container_bin',
          },
          {
            desc: '3. Port mapping (internal:external:publicMode)',
            example: '$ fog-controller microservice add [other required options] --ports 80:8080:false 443:5443:false',
          },
          {
            desc: '4. Add routes',
            example: '$ fog-controller microservice route --add ABC:DEF',
          },
          {
            desc: '5. Delete route',
            example: '$ fog-controller microservice route --remove ABC:DEF',
          },
          {
            desc: '6. Create port mapping',
            example: '$ fog-controller microservice port-mapping --create 80:8080:false -i ABC'
          },
          {
            desc: '7. Delete port mapping',
            example: '$ fog-controller microservice port-mapping --delete 80 -i ABC'
          }
        ],
      },
    ])
  }
}

const _executeCase  = async function (microserviceCommand, commandName, f, isUserRequired) {
  try {
    const item = microserviceCommand[commandName] || {};

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserById(f);
      decoratedFunction(item);
    } else {
      f(item);
    }
  } catch (error) {
    logger.error(error.message);
  }
};

const _executeRouteCommand = async function (obj) {
  logger.info(JSON.stringify(obj));
  if (obj.add) {
    try {
      const arr = obj.add.split(':');
      const sourceMicroserviceId = arr[0];
      const destMicroserviceId = arr[1];
      await MicroserviceService.createRouteWithTransaction(sourceMicroserviceId, destMicroserviceId, {}, true);
      logger.info(`Microservice route with source microservice ${sourceMicroserviceId} and dest microservice 
                ${destMicroserviceId} has been created successfully.`)
    } catch (e) {
      logger.error(ErrorMessages.CLI.INVALID_ROUTE);
    }
  } else if (obj.remove) {
    try {
      const arr = obj.add.split(':');
      const sourceMicroserviceId = arr[0];
      const destMicroserviceId = arr[1];
      await MicroserviceService.deleteRouteWithTransaction(sourceMicroserviceId, destMicroserviceId, {}, true);
      logger.info(`Microservice route with source microservice ${obj.sourceMicroserviceId} and dest microservice 
                ${obj.destMicroserviceId} has been removed successfully.`);
    } catch (e) {
      logger.error(ErrorMessages.CLI.INVALID_ROUTE);
    }
  } else if (obj.add && obj.remove) {
    logger.info('Please specify either "add" or "remove" operation');
  } else {
    logger.info('No operation specified');
  }
};

const _executePortMappingCommand = async function (obj) {
  logger.info(JSON.stringify(obj));

  if (obj.create) {
    const mapping = parsePortMappingObject(obj.create, ErrorMessages.CLI.INVALID_PORT_MAPPING);
    await MicroserviceService.createPortMappingWithTransaction(obj.microserviceId, mapping, {}, true);
    logger.info('Port mapping has been create successfully');
  } else if (obj.delete) {
    try {
      const internalPort = parseInt(obj.delete);
      await MicroserviceService.deletePortMappingWithTransaction(obj.microserviceId, internalPort, {}, true);
      logger.info('Port mapping has been deleted successfully');
    } catch(e) {
      logger.error(ErrorMessages.CLI.INVALID_INTERNAL_PORT);
    }
  } else if (obj.list) {
    await MicroserviceService.getMicroservicePortMappingListWithTransaction(obj.microserviceId, {}, true);
    logger.info('Port mappings have been retrieved successfully');
  } else {
    logger.info('Incorrect command usage. Please specify only one command at once');
  }
};

const _removeMicroservice = async function (obj) {
  logger.info(JSON.stringify(obj));
  await MicroserviceService.deleteMicroserviceWithTransaction(obj.microserviceId, obj.cleanUp, {}, true);
  logger.info('Microservice has been removed successfully.')
};

const _listMicroservices = async function () {
  const result = await MicroserviceService.listMicroservicesWithTransaction({}, {}, true);
  logger.info(JSON.stringify(result));
  logger.info('Microservices have been retrieved successfully.');
};

const _getMicroservice = async function (obj) {
  logger.info(JSON.stringify(obj));
  const result = await MicroserviceService.getMicroserviceWithTransaction(obj.microserviceId, {}, true);
  logger.info(JSON.stringify(result));
  logger.info('Microservice has been retrieved successfully.');
};

const _createMicroservice = async function (obj) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createMicroserviceObject(obj);

  logger.info(JSON.stringify(microservice));

  const result = await MicroserviceService.createMicroserviceOnFogWithTransaction(microservice, {}, true);
  logger.info(JSON.stringify(result));
  logger.info('Microservice has been created successfully.');
};

const _updateMicroservice = async function (obj) {
  const microservice = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _updateMicroserviceObject(obj);

  logger.info(JSON.stringify(microservice));

  await MicroserviceService.updateMicroserviceWithTransaction(obj.microserviceId, microservice, {}, true);
  logger.info('Microservice has been updated successfully.');
};

const _updateMicroserviceObject = function (obj) {
  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    ioFogNodeId: obj.iofogId,
    rootHostAccess: AppHelper.validateBooleanCliOptions(obj.rootEnable, obj.rootDisable),
    logLimit: obj.logLimit,
    rebuild: obj.rebuild
  };

  if (obj.volumes) {
    microserviceObj.volumeMappings = parseObjectArray(obj.volumes, 'Error during parsing of volume mapping option.');
  }

  return AppHelper.deleteUndefinedFields(microserviceObj);
};

const _createMicroserviceObject = function (obj) {
  const microserviceObj = {
    name: obj.name,
    config: obj.config,
    catalogItemId: parseInt(obj.catalogId),
    flowId: parseInt(obj.flowId),
    ioFogNodeId: obj.iofogId,
    rootHostAccess: AppHelper.validateBooleanCliOptions(obj.rootEnable, obj.rootDisable),
    logLimit: obj.logLimit,
    routes: obj.routes
  };

  if (obj.volumes) {
    microserviceObj.volumeMappings = parseVolumes(obj.volumes, ErrorMessages.CLI.INVALID_VOLUME_MAPPING);
  }
  if (obj.ports) {
    microserviceObj.ports = parsePortMappingArray(obj.ports, ErrorMessages.CLI.INVALID_PORT_MAPPING);
  }

  return AppHelper.deleteUndefinedFields(microserviceObj);
};


const parseVolumes = function (arr, errMsg) {
  return arr.map(item => {
    let result = {};
    try {
      const props = item.split(':');
      result = {
        hostDestination: props[0],
        containerDestination: props[1],
        accessMode: props[2]
      }
    } catch(e) {
      logger.warn(errMsg);
    }
    return result;
  })
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
  } catch(e) {
    logger.warn(errMsg);
  }
  return result;
}

const parsePortMappingArray = function (arr, errMsg) {
  return arr.map(obj => {
    parsePortMappingObject(obj, errMsg);
  })
};

module.exports = new Microservice();
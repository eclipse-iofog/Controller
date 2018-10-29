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
const logger = require('../logger');
const MicroserviceService = require('../services/microservices-service');
const fs = require('fs');
const AppHelper = require('../helpers/app-helper');
const AuthDecorator = require('../decorators/cli-decorator');

const JSON_SCHEMA =
  `  name: string
  catalogItemId: string
  flowId: string
  ioFogNodeId: string
  config: string
  volumeMappings: string
  logLimit: number
  rootHostAccess: true
  ports: object
    internal: number
    external: number
    tunnel: boolean
  routes: array of strings`

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
        name: 'dest-microservice-id', alias: 'D', type: String, description: 'Destination Microservice ID of route',
        group: [constants.CMD_ROUTE]
      },
      {
        name: 'source-microservice-id', alias: 'S', type: String, description: 'Source Microservice ID of route',
        group: [constants.CMD_ROUTE]
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
        name: 'add', alias: 'a', type: Boolean, description: 'Add new route(s)',
        group: [constants.CMD_ROUTE]
      },
      {
        name: 'remove', alias: 'm', type: Boolean, description: 'Delete existing route(s)',
        group: [constants.CMD_ROUTE]
      },
      {
        name: 'create', alias: 'b', type: Boolean, description: 'Add new port mapping(s)',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'delete', alias: 'B', type: Boolean, description: 'Delete existing port mapping(s)',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'list', alias: 'G', type: Boolean, description: 'List port mappings',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'internal', alias: 'W', type: Number, description: 'Internal port',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'external', alias: 'Y', type: Number, description: 'External port',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'public', alias: 'Z', type: Boolean, description: 'Public mode of connector',
        group: [constants.CMD_PORT_MAPPING]
      },
      {
        name: 'private', alias: 'K', type: Boolean, description: 'Private mode of connector',
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
      [constants.CMD_PORT_MAPPING]: 'Add/Remove/List microservice port mapping.'
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
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA,
        ],
        raw: true,
      },
      {
        header: 'Examples',
        content: [
          {
            desc: '1. Single mapping',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src',
          },
          {
            desc: '2. Multiple mappings',
            example: '$ iofog-controller microservice add [other required options] --volumes /host_src:/container_src /host_bin:/container_bin',
          },
          {
            desc: '3. Ports (internal:external:tunnel)',
            example: '$ iofog-controller microservice add [other required options] --ports 80:8080:false 443:5443:true',
          },
          {
            desc: '4. Add routes',
            example: '$ iofog-controller microservice route -i ABCD --add DEF GHI',
          },
          {
            desc: '5. Delete route',
            example: '$ iofog-controller microservice route -i ABC --remove DEF',
          },
          {
            desc: '6. Get strace data',
            example: '$ iofog-controller microservice strace -i ABC --get file',
          },
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
    await MicroserviceService.createRouteWithTransaction(obj.sourceMicroserviceId, obj.destMicroserviceId, {}, true);
    logger.info(`Microservice route with source microservice ${obj.sourceMicroserviceId} and dest microservice 
                ${obj.destMicroserviceId} has been created successfully.`)
  } else if (obj.remove) {
    await MicroserviceService.deleteRouteWithTransaction(obj.sourceMicroserviceId, obj.destMicroserviceId, {}, true);
    logger.info(`Microservice route with source microservice ${obj.sourceMicroserviceId} and dest microservice 
                ${obj.destMicroserviceId} has been removed successfully.`)
  } else if (obj.add && obj.remove) {
    logger.info('Please specify either "add" or "remove" operation');
  } else {
    logger.info('No operation specified');
  }
};

const _executePortMappingCommand = async function (obj) {
  logger.info(JSON.stringify(obj));

  if (obj.create) {

    let mapping = {
      internal: parseInt(obj.internal),
      external: parseInt(obj.external),
      publicMode: AppHelper.validateBooleanCliOptions(obj.public, obj.private)
    };
    mapping = AppHelper.deleteUndefinedFields(mapping);
    await MicroserviceService.createPortMappingWithTransaction(obj.microserviceId, mapping, {}, true);
    logger.info('Port mapping has been create successfully');

  } else if (obj.delete) {
    await MicroserviceService.deletePortMappingWithTransaction(obj.microserviceId, obj.internal, {}, true);
    logger.info('Port mapping has been deleted successfully');
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
}

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
    microserviceObj.volumeMappings = parseObjectArray(obj.volumes, 'Error during parsing of volume mapping option.');
  }
  if (obj.ports) {
    microserviceObj.ports = parseObjectArray(obj.ports, 'Error during parsing of port mapping option.');
  }

  return AppHelper.deleteUndefinedFields(microserviceObj);
};



const parseObjectArray = function (arr, errMsg) {
  return arr.map(item => {
    item = item.replace(/'/g, '"');
    let result = {};
    try {
      result = JSON.parse(item);
    } catch(e) {
      logger.warn(errMsg);
      logger.warn(e.message);
    }
    return result;
  })
};

module.exports = new Microservice();
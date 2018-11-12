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
const DiagnosticService = require('../services/diagnostic-service');
const AppHelper = require('../helpers/app-helper');
const AuthDecorator = require('../decorators/cli-decorator');


class Diagnostics extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_DIAGNOSTICS;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true,
        group: constants.CMD,
      },
      {
        name: 'enable', alias: 'e', type: Boolean, description: 'Enable microservice strace',
        group: [constants.CMD_STRACE_UPDATE]
      },
      {
        name: 'disable', alias: 'o', type: Boolean, description: 'Disable microservice strace',
        group: [constants.CMD_STRACE_UPDATE]
      },
      {
        name: 'microservice-id', alias: 'i', type: String, description: 'Microservice ID',
        group: [constants.CMD_STRACE_UPDATE, constants.CMD_STRACE_INFO, constants.CMD_STRACE_FTP_POST,
          constants.CMD_IMAGE_SNAPSHOT_CREATE, constants.CMD_IMAGE_SNAPSHOT_GET]
      },
      {
        name: 'format', alias: 'f', type: String, description: 'Format of strace data to receive',
        group: [constants.CMD_STRACE_INFO]
      },
      {
        name: 'ftpHost', alias: 'h', type: String, description: 'FTP host',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpPort', alias: 'p', type: Number, description: 'FTP port',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpUser', alias: 'u', type: String, description: 'FTP user',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpPass', alias: 's', type: String, description: 'FTP user password',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpDestDir', alias: 'd', type: String, description: 'FTP destination directory',
        group: [constants.CMD_STRACE_FTP_POST]
      },
    ];
    this.commands = {
      [constants.CMD_STRACE_UPDATE]: 'Change microservice strace status to enabled or disabled.',
      [constants.CMD_STRACE_INFO]: 'Get microservice strace data.',
      [constants.CMD_STRACE_FTP_POST]: 'Post microservice strace data to ftp.',
      [constants.CMD_IMAGE_SNAPSHOT_CREATE]: 'Create microservice image snapshot.',
      [constants.CMD_IMAGE_SNAPSHOT_GET]: 'Get microservice image snapshot.',
    }
  }

  async run(args) {
    try {
      const diagnosticCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv, partial: false});

      switch (diagnosticCommand.command.command) {
        case constants.CMD_STRACE_UPDATE:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_UPDATE, _changeMicroserviceStraceState, false);
          break;
        case constants.CMD_STRACE_INFO:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_INFO, _getMicroserviceStraceData, false);
          break;
        case constants.CMD_STRACE_FTP_POST:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_FTP_POST, _postMicroserviceStraceDataToFtp, false);
          break;
        case constants.CMD_IMAGE_SNAPSHOT_CREATE:
          await _executeCase(diagnosticCommand, constants.CMD_IMAGE_SNAPSHOT_CREATE, _postMicroserviceImageSnapshotCreate, false);
          break;
        case constants.CMD_IMAGE_SNAPSHOT_GET:
          await _executeCase(diagnosticCommand, constants.CMD_IMAGE_SNAPSHOT_GET, _getMicroserviceImageSnapshot, false);
          break;
        case constants.CMD_HELP:
        default:
          return this.help([constants.CMD_LIST])
      }
    } catch (error) {
      AppHelper.handleCLIError(error);
    }
  }
}

const _executeCase = async function (diagnosticCommand, commandName, f, isUserRequired) {
  try {
    const item = diagnosticCommand[commandName];

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserById(f);
      await decoratedFunction(item);
    } else {
      await f(item);
    }
  } catch (error) {
    logger.error(error.message);
  }
};

const _changeMicroserviceStraceState = async function (obj) {
  logger.info(JSON.stringify(obj));

  const enable = AppHelper.validateBooleanCliOptions(obj.disable, obj.enable);
  await DiagnosticService.changeMicroserviceStraceState(obj.microserviceId, {enable: enable}, {}, true);
  const msg = enable ? 'Microservice strace has been enabled' : 'Microservice strace has been disabled';
  logger.info(msg);
};

const _getMicroserviceStraceData = async function (obj) {
  logger.info(JSON.stringify(obj));

  const result = await DiagnosticService.getMicroserviceStraceData(obj.microserviceId, {format: obj.format}, {}, true);
  logger.info(JSON.stringify(result, null, 2));
  logger.info('Microservice strace data has been retrieved successfully.');
};

const _postMicroserviceStraceDataToFtp = async function (obj) {
  logger.info(JSON.stringify(obj));

  await DiagnosticService.postMicroserviceStraceDatatoFtp(obj.microserviceId, obj, {}, true);
  logger.info('Strace data has been posted to ftp successfully.');
};

const _postMicroserviceImageSnapshotCreate = async function (obj) {
  logger.info(JSON.stringify(obj));

  await DiagnosticService.postMicroserviceImageSnapshotCreate(obj.microserviceId, {}, true);
  logger.info('Microservice image snapshot has been created successfully.');
};

const _getMicroserviceImageSnapshot = async function (obj) {
  logger.info(JSON.stringify(obj));

  const filePath = await DiagnosticService.getMicroserviceImageSnapshot(obj.microserviceId, {}, true);
  logger.info('Microservice images path = ' + filePath);
};

module.exports = new Diagnostics();
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
const fs = require('fs');
const AppHelper = require('../helpers/app-helper');
const AuthDecorator = require('../decorators/cli-decorator');


class Diagnostics extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_DIAGNOSTICS;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true, description: 'add, remove, update, list',
        group: constants.CMD,
      },
      {
        name: 'enable', alias: 'e', type: Boolean, description: 'Enable microservice strace',
        group: [constants.CMD_STRACE_UPDATE]
      },
      {
        name: 'disable', alias: 'o', type: Boolean, description: 'Disable microservice strace',
        group: [constants.CMD_STRACE_UPDATE ]
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
        name: 'ftpUser', alias: 'u', type: Number, description: 'FTP user',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpPass', alias: 'p', type: Number, description: 'FTP user password',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpDestDir', alias: 'd', type: Number, description: 'FTP destination directory',
        group: [constants.CMD_STRACE_FTP_POST]
      },
    ]
    this.commands = {
      [constants.CMD_STRACE_UPDATE]: 'Change microservice strace status to enabled or disabled.',
      [constants.CMD_STRACE_INFO]: 'Get microservice strace data.',
      [constants.CMD_STRACE_FTP_POST]: 'Post microservice strace data to ftp.',
      [constants.CMD_IMAGE_SNAPSHOT_CREATE]: 'Create microservice image snapshot.',
      [constants.CMD_IMAGE_SNAPSHOT_GET]: 'Get microservice image snapshot.',
    }
  }

  async run(args) {
    const diagnosticCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (diagnosticCommand.command.command) {
      case constants.CMD_STRACE_UPDATE:
        await _executeCase(diagnosticCommand, constants.CMD_STRACE_UPDATE, _changeMicroserviceStraceState, false);
        break;
      case constants.CMD_STRACE_INFO:
        await _executeCase(diagnosticCommand, constants.CMD_STRACE_UPDATE, _getMicroserviceStraceData, false);
        break;
      case constants.CMD_STRACE_FTP_POST:
        await _executeCase(diagnosticCommand, constants.CMD_STRACE_UPDATE, _postMicroserviceStraceDataToFtp, false);
        break;
      case constants.CMD_IMAGE_SNAPSHOT_CREATE:
        return
      case constants.CMD_IMAGE_SNAPSHOT_GET:
        return
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }
}

const _executeCase  = async function (diagnosticCommand, commandName, f, isUserRequired) {
  try {
    const item = diagnosticCommand[commandName];

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

const _changeMicroserviceStraceState = async function (obj, user) {
  logger.info(JSON.stringify(obj));

  const enable = AppHelper.validateBooleanCliOptions(obj.disable, obj.enable);
  await DiagnosticService.changeMicroserviceStraceState(obj.microserviceId, {enable: enable}, user, true);
  const msg = enable ? 'Microservice strace has been enabled' : 'Microservice strace has been disabled';
  logger.info(msg);
};

const _getMicroserviceStraceData = async function (obj, user) {
  logger.info(JSON.stringify(obj));

  const result = await DiagnosticService.getMicroserviceStraceData(obj.microserviceId, {format: obj.format}, user, true);
  logger.info(result);
};

const _postMicroserviceStraceDataToFtp = async function (obj, user) {
  logger.info(JSON.stringify(obj));

  const id = obj.id;
  delete obj.id;
  await DiagnosticService.postMicroserviceStraceDatatoFtp(id, obj, user, true);
};

module.exports = new Diagnostics();
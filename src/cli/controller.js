/*
 * *******************************************************************************
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
const ControllerService = require('../services/controller-service');
const logger = require('../logger');


class Controller extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_CONTROLLER;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true, description: 'status, email-activation, fog-types',
        group: constants.CMD,
      }
    ];
    this.commands = {
      [constants.CMD_STATUS]: 'Display fog-controller service status.',
      [constants.CMD_EMAIL_ACTIVATION]: 'Is email activation.',
      [constants.CMD_FOG_TYPES]: 'List all Fog-types.',
    }
  }

  async run(args) {
    const controllerCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv});

    switch (controllerCommand.command.command) {
      case constants.CMD_STATUS:
        await _executeCase(controllerCommand, constants.CMD_STATUS, _getStatus, false);
        break;
      case constants.CMD_EMAIL_ACTIVATION:
        await _executeCase(controllerCommand, constants.CMD_EMAIL_ACTIVATION, _emailActivation, false);
        break;
      case constants.CMD_FOG_TYPES:
        await _executeCase(controllerCommand, constants.CMD_FOG_TYPES, _getFogTypes, false);
        break;
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }

}

const _executeCase = async function (userCommand, commandName, f, isUserRequired) {
  try {
    const item = userCommand[commandName];

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserByEmail(f);
      decoratedFunction(item);
    } else {
      f(item);
    }
  } catch (error) {
    logger.error(error.message);
  }
};


const _getStatus = async function () {
  const response = await ControllerService.statusController(true);
  logger.info(JSON.stringify(response));
};

const _emailActivation = async function () {
  const response =  await ControllerService.emailActivation(true);
  logger.info(JSON.stringify(response));
};

const _getFogTypes = async function () {
  const response =  await ControllerService.getFogTypes(true);
  logger.info(JSON.stringify(response));
};

module.exports = new Controller();
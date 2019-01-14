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
const fs = require('fs');
const logger = require('../logger');
const TunnelService = require('../services/tunnel-service');
const CliDecorator = require('../decorators/cli-decorator');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const AppHelper = require('../helpers/app-helper');


class Tunnel extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_TUNNEL;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true,
        description: 'update, list',
        group: constants.CMD
      },
      {
        name: 'username', alias: 'u', type: String,
        description: 'Tunnel username',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'password', alias: 'p', type: String,
        description: 'Tunnel password',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'host', alias: 's', type: String,
        description: 'Tunnel host address',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'rsa-key', alias: 'k', type: String,
        description: 'Path to tunnel RSA key',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'port', alias: 'o', type: Number,
        description: 'Tunnel port',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'iofogUuid', alias: 'i', type: String,
        description: 'ioFog UUID',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'action', alias: 'a', type: String,
        description: 'Type of action. Can be "open" or "close"',
        group: [constants.CMD_UPDATE]
      }
    ];
    this.commands = {
      [constants.CMD_UPDATE]: 'Update existing tunnel.',
      [constants.CMD_LIST]: 'List all tunnels.',
    }
  }

  async run(args) {
    try {
      const tunnelCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv, partial: false});

      const command = tunnelCommand.command.command;

      AppHelper.validateParameters(command, this.commandDefinitions, args.argv);

      switch (command) {
        case constants.CMD_UPDATE:
          await _executeCase(tunnelCommand, constants.CMD_UPDATE, _updateTunnel, false);
          break;
        case constants.CMD_LIST:
          await _executeCase(tunnelCommand, constants.CMD_LIST, _tunnelList, false);
          break;
        default:
          return this.help([constants.CMD_HELP])
      }
    } catch (error) {
      AppHelper.handleCLIError(error);
    }
  }
}

async function _updateTunnel(obj, user) {
  const action = obj.action;
  const tunnel = _createTunnelObject(obj);
  if (tunnel.iofogUuid === undefined) {
    throw new Error("Required field 'ioFog UUID' is missing.");
  }

  switch (action) {
    case 'open':
      await TunnelService.openTunnel(tunnel, user, true);
      break;
    case 'close':
      await TunnelService.closeTunnel({iofogUuid: tunnel.iofogUuid}, user);
      break;
    default:
      throw new Errors.ValidationError(ErrorMessages.INVALID_ACTION_PROPERTY);
  }
  logger.info('Tunnel has been updated successfully.');
}

async function _tunnelList() {
  const tunnels = await TunnelService.findAll();
  logger.info(JSON.stringify(tunnels, null, 2));
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

function _createTunnelObject(cliData) {
  const rsa = cliData.rsaKey ? fs.readFileSync(cliData.rsaKey, 'utf8') : "";
  return {
    host: cliData.host,
    username: cliData.username,
    password: cliData.password,
    rsakey: rsa,
    lport: cliData.port,
    iofogUuid: cliData.iofogUuid
  };
}

module.exports = new Tunnel();
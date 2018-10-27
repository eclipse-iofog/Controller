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

const BaseCLIHandler = require('./base-cli-handler')
const constants = require('../helpers/constants')
const fs = require('fs');
const logger = require('../logger')
const TunnelService = require('../services/tunnel-service');
const CliDecorator = require('../decorators/cli-decorator')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')

class Proxy extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_PROXY
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, description: 'update, list', group: constants.CMD, },
      { name: 'username', alias: 'u', type: String, description: 'Proxy username', group: [constants.CMD_UPDATE] },
      { name: 'password', alias: 'p', type: String, description: 'Proxy password', group: [constants.CMD_UPDATE] },
      { name: 'host', alias: 's', type: String, description: 'Proxy host address', group: [constants.CMD_UPDATE] },
      { name: 'rsa-key', alias: 'k', type: String, description: 'Proxy RSA key', group: [constants.CMD_UPDATE] },
      { name: 'port', alias: 'o', type: Number, description: 'Proxy port', group: [constants.CMD_UPDATE] },
      { name: 'iofogUuid', alias: 'f', type: String, description: 'Fog UUID', group: [constants.CMD_UPDATE] },
      { name: 'action', alias: 'a', type: String, description: 'Type of action. Can be "open" or "close"', group: [constants.CMD_UPDATE] }
    ]
    this.commands = {
      [constants.CMD_UPDATE]: 'Update existing proxy.',
      [constants.CMD_LIST]: 'List all proxies.',
    }
  }

async run(args) {
    const proxyCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (proxyCommand.command.command) {
      case constants.CMD_UPDATE:
          await _executeCase(proxyCommand, constants.CMD_UPDATE, _updateTunnel, false);
          break;
      case constants.CMD_LIST:
          await _executeCase(proxyCommand, constants.CMD_LIST, _tunnelList, false);
          break;
      default:
        return this.help([constants.CMD_HELP])
    }
  }
}

async function _updateTunnel(obj, user) {
    const action = obj.action;
    const tunnel = _createTunnelObject(obj);
    logger.info(JSON.stringify(tunnel));
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

async function _tunnelList(obj) {
    const tunnels = await TunnelService.findAll();
    logger.info(JSON.stringify(tunnels));
    logger.info('Tunnels has been received successfully.');
    return tunnels;
}

async function _executeCase(commands, commandName, f, isUserRequired) {
    try {
        const obj = commands[commandName];

        if (isUserRequired) {
            const decoratedFunction = CliDecorator.prepareUserById(f);
            decoratedFunction(obj);
        } else {
            f(obj);
        }
    } catch (error) {
        logger.error(error.message);
    }
}

function _createTunnelObject(cliData) {
    const rsa = cliData.rsaKey ? fs.readFileSync(cliData.rsaKey, 'utf8') : "";
    const tunnel = {
        host: cliData.host,
        username: cliData.username,
        password: cliData.password,
        rsakey: rsa,
        lport: cliData.port,
        iofogUuid: cliData.iofogUuid
    }
    return tunnel;
}

module.exports = new Proxy()
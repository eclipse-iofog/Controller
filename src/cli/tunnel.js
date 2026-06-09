/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
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
const fs = require('fs')
const logger = require('../logger')
const TunnelService = require('../services/tunnel-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const CliDataTypes = require('./cli-data-types')

class Tunnel extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_TUNNEL
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        description: 'update, list',
        group: constants.CMD
      },
      {
        name: 'username',
        alias: 'u',
        type: String,
        description: 'Tunnel username',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'password',
        alias: 'p',
        type: String,
        description: 'Tunnel password',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'host',
        alias: 's',
        type: String,
        description: 'Tunnel host address',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'rsa-key',
        alias: 'k',
        type: String,
        description: 'Path to tunnel RSA key',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'port',
        alias: 'o',
        type: CliDataTypes.Integer,
        description: 'Tunnel port',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'iofog-uuid',
        alias: 'i',
        type: String,
        description: 'ioFog node UUID',
        group: [constants.CMD_UPDATE]
      },
      {
        name: 'action',
        alias: 'a',
        type: String,
        description: 'Type of action. Can be "open" or "close"',
        group: [constants.CMD_UPDATE]
      }
    ]
    this.commands = {
      [constants.CMD_UPDATE]: 'Update existing tunnel.',
      [constants.CMD_LIST]: 'List all tunnels.'
    }
  }

  async run (args) {
    try {
      const tunnelCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = tunnelCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_UPDATE:
          await _executeCase(tunnelCommand, constants.CMD_UPDATE, _updateTunnel)
          break
        case constants.CMD_LIST:
          await _executeCase(tunnelCommand, constants.CMD_LIST, _tunnelList)
          break
        default:
          return this.help([])
      }
    } catch (error) {
      this.handleCLIError(error, args.argv)
    }
  }
}

async function _updateTunnel (obj) {
  const action = obj.action
  const tunnel = _createTunnelObject(obj)

  const logTunnel = Object.assign({}, tunnel)
  delete logTunnel.password
  logger.cliReq('tunnel update', { args: logTunnel })

  if (tunnel.iofogUuid === undefined) {
    throw new Error('Required field \'ioFog UUID\' is missing.')
  }

  switch (action) {
    case 'open':
      await TunnelService.openTunnel(tunnel, true)
      break
    case 'close':
      await TunnelService.closeTunnel({ iofogUuid: tunnel.iofogUuid })
      break
    default:
      throw new Errors.ValidationError(ErrorMessages.INVALID_ACTION_PROPERTY)
  }
  logger.cliRes('Tunnel has been updated successfully.')
}

async function _tunnelList () {
  logger.cliReq('tunnel list')
  const tunnels = await TunnelService.findAll()
  logger.cliRes(JSON.stringify(tunnels, null, 2))
}

async function _executeCase (commands, commandName, f) {
  try {
    const obj = commands[commandName]
    await f(obj)
  } catch (error) {
    logger.error(error.message)
  }
}

function _createTunnelObject (cliData) {
  const rsa = cliData.rsaKey ? fs.readFileSync(cliData.rsaKey, 'utf8') : ''
  return {
    host: cliData.host,
    username: cliData.username,
    password: cliData.password,
    rsakey: rsa,
    lport: cliData.port,
    iofogUuid: cliData.iofogUuid
  }
}

module.exports = new Tunnel()

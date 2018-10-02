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

class Comsat extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_COMSAT
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'name', alias: 'n', type: String, description: 'ComSat name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'domain', alias: 'd', type: String, description: 'ComSat domain name', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'public-ip', alias: 'i', type: String, description: 'ComSat public IP address', group: [constants.CMD_ADD, constants.CMD_UPDATE, constants.CMD_REMOVE] },
      { name: 'cert-dir', alias: 'c', type: String, description: 'Path to certificate', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'self-signed', alias: 's', type: Boolean, description: 'Is self-signed', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'user-id', alias: 'u', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new ComSat.',
      [constants.CMD_UPDATE]: 'Update existing ComSat.',
      [constants.CMD_REMOVE]: 'Delete a ComSat.',
      [constants.CMD_LIST]: 'List all ComSats.',
    }
  }

  run(args) {
    const comsatCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (comsatCommand.command.command) {
      case constants.CMD_ADD:
        return
      case constants.CMD_UPDATE:
        return
      case constants.CMD_REMOVE:
        return
      case constants.CMD_LIST:
        return
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }

}

module.exports = new Comsat()
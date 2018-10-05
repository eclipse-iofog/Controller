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

class Proxy extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_PROXY
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, description: 'add, remove, update, list', group: constants.CMD, },
      { name: 'username', alias: 'u', type: String, description: 'Proxy username', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'password', alias: 'p', type: String, description: 'Proxy password', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'host', alias: 's', type: String, description: 'Proxy host address', group: [constants.CMD_ADD, constants.CMD_UPDATE, constants.CMD_REMOVE] },
      { name: 'rsa-key', alias: 'k', type: String, description: 'Proxy RSA key', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'port', alias: 'o', type: Number, description: 'Proxy port', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new proxy.',
      [constants.CMD_UPDATE]: 'Update existing proxy.',
      [constants.CMD_REMOVE]: 'Delete a proxy.',
      [constants.CMD_LIST]: 'List all proxies.',
    }
  }

  run(args) {
    const proxyCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (proxyCommand.command.command) {
      case constants.CMD_ADD:
        return
      case constants.CMD_UPDATE:
        return
      case constants.CMD_REMOVE:
        return
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }
}

module.exports = new Proxy()
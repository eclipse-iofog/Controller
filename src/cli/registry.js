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

class Registry extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_REGISTRY
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'uri', alias: 'u', type: String, description: 'Registry URI', group: [constants.CMD_ADD, constants.CMD_REMOVE] },
      { name: 'public', alias: 'b', type: Boolean, description: 'Set registry as public', group: [constants.CMD_ADD] },
      { name: 'private', alias: 'r', type: Boolean, description: 'Set registry as private', group: [constants.CMD_ADD] },
      { name: 'username', alias: 'l', type: String, description: 'Registry\'s user name', group: [constants.CMD_ADD] },
      { name: 'password', alias: 'p', type: String, description: 'Password', group: [constants.CMD_ADD] },
      { name: 'email', alias: 'e', type: String, description: 'Email address', group: [constants.CMD_ADD] },
      { name: 'user-id', alias: 'i', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new Registry.',
      [constants.CMD_REMOVE]: 'Delete a Registry.',
      [constants.CMD_LIST]: 'List all Registries.',
    }
  }

  run(args) {
    const registryCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (registryCommand.command.command) {
      case constants.CMD_ADD:
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

module.exports = new Registry()
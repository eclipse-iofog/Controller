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

class User extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_USER
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true, description: 'add, remove, update, list, generate-token',
        group: constants.CMD,
      },
      {
        name: 'first-name', alias: 'f', type: String, description: 'User\'s first name',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
      {
        name: 'last-name', alias: 'l', type: String, description: 'User\'s last name',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
      {
        name: 'email', alias: 'e', type: String, description: 'User\'s email address',
        group: [constants.CMD_ADD, constants.CMD_GENERATE_TOKEN, constants.CMD_REMOVE, constants.CMD_UPDATE, constants.CMD_ACTIVATE, constants.CMD_SUSPEND],
      },
      {
        name: 'password', alias: 'p', type: String, description: 'User\'s password',
        group: [constants.CMD_ADD, constants.CMD_UPDATE],
      },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new user.',
      [constants.CMD_UPDATE]: 'Update existing user.',
      [constants.CMD_REMOVE]: 'Delete a user.',
      [constants.CMD_LIST]: 'List all users.',
      [constants.CMD_GENERATE_TOKEN]: 'Generate token for a user.',
      [constants.CMD_ACTIVATE]: 'Activate a user.',
      [constants.CMD_SUSPEND]: 'Suspend a user.',
    }
  }

  run(args) {
    const userCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, })

    switch (userCommand.command.command) {
      case constants.CMD_ADD:
        return
      case constants.CMD_UPDATE:
        return
      case constants.CMD_REMOVE:
        return
      case constants.CMD_GENERATE_TOKEN:
        return
      case constants.CMD_HELP:
      default:
        return this.help([constants.CMD_LIST])
    }
  }
}

module.exports = new User()

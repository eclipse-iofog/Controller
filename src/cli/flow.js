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

const JSON_SCHEMA =
  `  name: string
  description: string
  isActivated: boolean`

class Flow extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_FLOW
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'file', alias: 'f', type: String, description: 'Application flow settings JSON file', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'flow-id', alias: 'i', type: String, description: 'Application flow ID', group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO] },
      { name: 'name', alias: 'n', type: String, description: 'Application flow name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'description', alias: 'd', type: String, description: 'Application flow description', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'activate', alias: 'a', type: Boolean, description: 'Activate application flow', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'deactivate', alias: 'D', type: Boolean, description: 'Deactivate application flow', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'user-id', alias: 'u', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new flow.',
      [constants.CMD_UPDATE]: 'Update existing flow.',
      [constants.CMD_REMOVE]: 'Delete a flow.',
      [constants.CMD_LIST]: 'List all flows.',
      [constants.CMD_INFO]: 'Get flow settings.',
    }
  }

  run(args) {
    const flowCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (flowCommand.command.command) {
      case constants.CMD_ADD:
        return
      case constants.CMD_UPDATE:
        return
      case constants.CMD_REMOVE:
        return
      case constants.CMD_LIST:
        return
      case constants.CMD_INFO:
        return
      case constants.CMD_HELP:
      default:
        return this.help()
    }
  }

  help() {
    super.help([constants.CMD_LIST], true, true, [
      {
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA,
        ],
        raw: true
      },
    ])
  }
}

module.exports = new Flow()
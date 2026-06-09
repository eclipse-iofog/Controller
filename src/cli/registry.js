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
const logger = require('../logger')
const RegistryService = require('../services/registry-service')
const AppHelper = require('../helpers/app-helper')
const CliDataTypes = require('./cli-data-types')

class Registry extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_REGISTRY
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        group: [constants.CMD]
      },
      {
        name: 'uri',
        alias: 'U',
        type: String,
        description: 'Registry URI',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'public',
        alias: 'b',
        type: Boolean,
        description: 'Set registry as public',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'private',
        alias: 'r',
        type: Boolean,
        description: 'Set registry as private',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'username',
        alias: 'l',
        type: String,
        description: 'Registry\'s user name',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'password',
        alias: 'p',
        type: String,
        description: 'Password',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'email',
        alias: 'e',
        type: String,
        description: 'Email address',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'item-id',
        alias: 'i',
        type: CliDataTypes.Integer,
        description: 'Item\'s id',
        group: [constants.CMD_REMOVE, constants.CMD_UPDATE]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new Registry.',
      [constants.CMD_REMOVE]: 'Delete a Registry.',
      [constants.CMD_UPDATE]: 'Update a Registry',
      [constants.CMD_LIST]: 'List all Registries.'
    }
  }

  async run (args) {
    try {
      const registryCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = registryCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(registryCommand, constants.CMD_ADD, _createRegistry)
          break
        case constants.CMD_REMOVE:
          await _executeCase(registryCommand, constants.CMD_REMOVE, _deleteRegistry)
          break
        case constants.CMD_UPDATE:
          await _executeCase(registryCommand, constants.CMD_UPDATE, _updateRegistry)
          break
        case constants.CMD_LIST:
          await _executeCase(registryCommand, constants.CMD_LIST, _getRegistries)
          break
        case constants.CMD_HELP:
        default:
          return this.help([])
      }
    } catch (error) {
      this.handleCLIError(error, args.argv)
    }
  }
}

async function _createRegistry (obj) {
  const registry = _createRegistryObject(obj)

  const logRegistry = Object.assign({}, registry)
  delete logRegistry.password
  logger.cliReq('registry add', { args: logRegistry })

  const response = await RegistryService.createRegistry(registry)
  logger.cliRes(JSON.stringify({
    id: response.id
  }, null, 2))
}

async function _getRegistries (obj) {
  logger.cliReq('registry list')
  const result = await RegistryService.findRegistries(true)
  logger.cliRes(JSON.stringify(result, null, 2))
}

async function _deleteRegistry (obj) {
  logger.cliReq('registry remove', { args: { id: obj.itemId } })
  await RegistryService.deleteRegistry({ id: obj.itemId }, true)
  logger.cliRes('Registry has been removed successfully.')
}

async function _updateRegistry (obj) {
  const registry = _createRegistryObject(obj)

  const logRegistry = Object.assign({}, registry)
  delete logRegistry.password
  logger.cliReq('registry update', { args: logRegistry })

  await RegistryService.updateRegistry(registry, obj.itemId, {}, true)
  logger.cliRes('Registry has been updated successfully.')
}

async function _executeCase (commands, commandName, f) {
  try {
    const obj = commands[commandName]
    await f(obj)
  } catch (error) {
    logger.error(error.message)
  }
}

function _createRegistryObject (cliData) {
  return {
    url: cliData.uri,
    username: cliData.username,
    password: cliData.password,
    isPublic: AppHelper.validateBooleanCliOptions(cliData.public, cliData.private),
    email: cliData.email
  }
}

module.exports = new Registry()

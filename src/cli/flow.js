/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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
const AuthDecorator = require('../decorators/cli-decorator')
const ApplicationService = require('../services/application-service')
const AppHelper = require('../helpers/app-helper')
const logger = require('../logger')
const fs = require('fs')
const CliDataTypes = require('./cli-data-types')

const JSON_SCHEMA = AppHelper.stringifyCliJsonSchema({
  name: 'string',
  description: 'string',
  isActivated: true
})

class Application extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_FLOW
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        group: [constants.CMD]
      },
      {
        name: 'file',
        alias: 'f',
        type: String,
        description: 'Path to application flow settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'name',
        alias: 'n',
        type: String,
        description: 'Flow flow name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD, constants.CMD_REMOVE, constants.CMD_INFO]
      },
      {
        name: 'description',
        alias: 'd',
        type: String,
        description: 'Flow flow description',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'activate',
        alias: 'a',
        type: Boolean,
        description: 'Activate application flow',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'deactivate',
        alias: 'D',
        type: Boolean,
        description: 'Deactivate application flow',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'user-id',
        alias: 'u',
        type: CliDataTypes.Integer,
        description: 'User\'s id',
        group: [constants.CMD_ADD, constants.CMD_UPDATE, constants.CMD_REMOVE]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new flow.',
      [constants.CMD_UPDATE]: 'Update existing flow.',
      [constants.CMD_REMOVE]: 'Delete a flow.',
      [constants.CMD_LIST]: 'List all flows.',
      [constants.CMD_INFO]: 'Get flow settings.'
    }
  }

  async run (args) {
    try {
      const flowCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = flowCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(flowCommand, constants.CMD_ADD, _createApplication, true)
          break
        case constants.CMD_UPDATE:
          await _executeCase(flowCommand, constants.CMD_UPDATE, _updateApplication, true)
          break
        case constants.CMD_REMOVE:
          await _executeCase(flowCommand, constants.CMD_REMOVE, _deleteApplication, true)
          break
        case constants.CMD_LIST:
          await _executeCase(flowCommand, constants.CMD_LIST, _getAllApplications, false)
          break
        case constants.CMD_INFO:
          await _executeCase(flowCommand, constants.CMD_INFO, _getApplication, false)
          break
        case constants.CMD_HELP:
        default:
          return this.help([])
      }
    } catch (error) {
      this.handleCLIError(error, args.argv)
    }
  }

  help () {
    super.help([], true, true, [
      {
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA
        ],
        raw: true
      }
    ])
  }
}

const _executeCase = async function (flowCommand, commandName, f, isUserRequired) {
  try {
    const item = flowCommand[commandName]

    if (isUserRequired) {
      const decoratedFunction = AuthDecorator.prepareUserById(f)
      await decoratedFunction(item)
    } else {
      await f(item)
    }
  } catch (error) {
    logger.error(error.message)
  }
}

const _createApplication = async function (flowData, user) {
  const flow = flowData.file
    ? JSON.parse(fs.readFileSync(flowData.file, 'utf8'))
    : _createApplicationObject(flowData)
  logger.cliReq('flow add', { args: flow })
  const createdApplication = await ApplicationService.createApplicationEndPoint(flow, user, true)
  logger.cliRes(JSON.stringify({
    id: createdApplication.id,
    name: createdApplication.name
  }, null, 2))
}

const _updateApplication = async function (flowData, user) {
  const flow = flowData.file
    ? JSON.parse(fs.readFileSync(flowData.file, 'utf8'))
    : _createApplicationObject(flowData)

  const name = flowData.name
  logger.cliReq('flow update', { args: flow })
  await ApplicationService.patchApplicationEndPoint(flow, name, user, true)
  logger.cliRes('Flow updated successfully.')
}

const _deleteApplication = async function (flowData, user) {
  const name = flowData.name
  logger.cliReq('flow remove', { args: { name } })
  await ApplicationService.deleteApplicationEndPoint(name, user, true)
  logger.cliRes('Flow removed successfully.')
}

const _getAllApplications = async function () {
  logger.cliReq('flow list')
  const flows = await ApplicationService.getAllApplicationsEndPoint(true)
  logger.cliRes(JSON.stringify(flows, null, 2))
}

const _getApplication = async function (flowData) {
  const name = flowData.name
  logger.cliReq('flow info', { args: { name } })
  const flow = await ApplicationService.getApplicationEndPoint(name, {}, true)
  logger.cliRes(JSON.stringify(flow, null, 2))
}

function _createApplicationObject (data) {
  const flow = {
    id: data.id,
    name: data.name,
    description: data.description,
    isActivated: AppHelper.validateBooleanCliOptions(data.activate, data.deactivate)
  }

  return AppHelper.deleteUndefinedFields(flow)
}

module.exports = new Application()

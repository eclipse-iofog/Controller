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
const ApplicationService = require('../services/application-service')
const AppHelper = require('../helpers/app-helper')
const logger = require('../logger')
const fs = require('fs')

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
        description: 'Path to application settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'name',
        alias: 'n',
        type: String,
        description: 'Application name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD, constants.CMD_REMOVE, constants.CMD_INFO]
      },
      {
        name: 'description',
        alias: 'd',
        type: String,
        description: 'Application description',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'activate',
        alias: 'a',
        type: Boolean,
        description: 'Activate application',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'deactivate',
        alias: 'D',
        type: Boolean,
        description: 'Deactivate application',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new application.',
      [constants.CMD_UPDATE]: 'Update existing application.',
      [constants.CMD_REMOVE]: 'Delete a application.',
      [constants.CMD_LIST]: 'List all applications.',
      [constants.CMD_INFO]: 'Get application settings.'
    }
  }

  async run (args) {
    try {
      const applicationCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = applicationCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(applicationCommand, constants.CMD_ADD, _createApplication)
          break
        case constants.CMD_UPDATE:
          await _executeCase(applicationCommand, constants.CMD_UPDATE, _updateApplication)
          break
        case constants.CMD_REMOVE:
          await _executeCase(applicationCommand, constants.CMD_REMOVE, _deleteApplication)
          break
        case constants.CMD_LIST:
          await _executeCase(applicationCommand, constants.CMD_LIST, _getAllApplications)
          break
        case constants.CMD_INFO:
          await _executeCase(applicationCommand, constants.CMD_INFO, _getApplication)
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

const _executeCase = async function (applicationCommand, commandName, f) {
  try {
    const item = applicationCommand[commandName]
    await f(item)
  } catch (error) {
    logger.error(error.message)
  }
}

const _createApplication = async function (applicationData) {
  const application = applicationData.file
    ? JSON.parse(fs.readFileSync(applicationData.file, 'utf8'))
    : _createApplicationObject(applicationData)
  logger.cliReq('application add', { args: application })
  const createdApplication = await ApplicationService.createApplicationEndPoint(application, true)
  logger.cliRes(JSON.stringify({
    id: createdApplication.id,
    name: createdApplication.name
  }, null, 2))
}

const _updateApplication = async function (applicationData) {
  const application = applicationData.file
    ? JSON.parse(fs.readFileSync(applicationData.file, 'utf8'))
    : _createApplicationObject(applicationData)

  const name = applicationData.name
  logger.cliReq('application update', { args: application })
  await ApplicationService.patchApplicationEndPoint(application, { name }, true)
  logger.cliRes('Application updated successfully.')
}

const _deleteApplication = async function (applicationData) {
  const name = applicationData.name
  logger.cliReq('application remove', { args: { name } })
  await ApplicationService.deleteApplicationEndPoint({ name }, true)
  logger.cliRes('Application removed successfully.')
}

const _getAllApplications = async function () {
  logger.cliReq('application list')
  const applications = await ApplicationService.getAllApplicationsEndPoint(true)
  logger.cliRes(JSON.stringify(applications, null, 2))
}

const _getApplication = async function (applicationData) {
  const name = applicationData.name
  logger.cliReq('application info', { args: { name } })
  const application = await ApplicationService.getApplicationEndPoint({ name }, {}, true)
  logger.cliRes(JSON.stringify(application, null, 2))
}

function _createApplicationObject (data) {
  const application = {
    id: data.id,
    name: data.name,
    description: data.description,
    isActivated: AppHelper.validateBooleanCliOptions(data.activate, data.deactivate)
  }

  return AppHelper.deleteUndefinedFields(application)
}

module.exports = new Application()

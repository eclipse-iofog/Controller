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
const DiagnosticService = require('../services/diagnostic-service')
const AppHelper = require('../helpers/app-helper')
const CliDataTypes = require('./cli-data-types')

class Diagnostics extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_DIAGNOSTICS
    this.commandDefinitions = [
      {
        name: 'command',
        defaultOption: true,
        group: constants.CMD
      },
      {
        name: 'enable',
        alias: 'e',
        type: Boolean,
        description: 'Enable microservice strace',
        group: [constants.CMD_STRACE_UPDATE]
      },
      {
        name: 'disable',
        alias: 'o',
        type: Boolean,
        description: 'Disable microservice strace',
        group: [constants.CMD_STRACE_UPDATE]
      },
      {
        name: 'microservice-uuid',
        alias: 'i',
        type: String,
        description: 'Microservice UUID',
        group: [constants.CMD_STRACE_UPDATE, constants.CMD_STRACE_INFO, constants.CMD_STRACE_FTP_POST,
          constants.CMD_IMAGE_SNAPSHOT_CREATE, constants.CMD_IMAGE_SNAPSHOT_GET]
      },
      {
        name: 'format',
        alias: 'f',
        type: String,
        description: 'Format of strace data to receive. Possible values: string, file',
        group: [constants.CMD_STRACE_INFO]
      },
      {
        name: 'ftpHost',
        alias: 'h',
        type: String,
        description: 'FTP host',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpPort',
        alias: 'p',
        type: CliDataTypes.Integer,
        description: 'FTP port',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpUser',
        alias: 'u',
        type: String,
        description: 'FTP user',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpPass',
        alias: 's',
        type: String,
        description: 'FTP user password',
        group: [constants.CMD_STRACE_FTP_POST]
      },
      {
        name: 'ftpDestDir',
        alias: 'd',
        type: String,
        description: 'FTP destination directory',
        group: [constants.CMD_STRACE_FTP_POST]
      }
    ]
    this.commands = {
      [constants.CMD_STRACE_UPDATE]: 'Change microservice strace status to enabled or disabled.',
      [constants.CMD_STRACE_INFO]: 'Get microservice strace data.',
      [constants.CMD_STRACE_FTP_POST]: 'Post microservice strace data to ftp.',
      [constants.CMD_IMAGE_SNAPSHOT_CREATE]: 'Create microservice image snapshot.',
      [constants.CMD_IMAGE_SNAPSHOT_GET]: 'Get microservice image snapshot.'
    }
  }

  async run (args) {
    try {
      const diagnosticCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = diagnosticCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_STRACE_UPDATE:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_UPDATE, _changeMicroserviceStraceState)
          break
        case constants.CMD_STRACE_INFO:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_INFO, _getMicroserviceStraceData)
          break
        case constants.CMD_STRACE_FTP_POST:
          await _executeCase(diagnosticCommand, constants.CMD_STRACE_FTP_POST, _postMicroserviceStraceDataToFtp)
          break
        case constants.CMD_IMAGE_SNAPSHOT_CREATE:
          await _executeCase(diagnosticCommand, constants.CMD_IMAGE_SNAPSHOT_CREATE, _postMicroserviceImageSnapshotCreate)
          break
        case constants.CMD_IMAGE_SNAPSHOT_GET:
          await _executeCase(diagnosticCommand, constants.CMD_IMAGE_SNAPSHOT_GET, _getMicroserviceImageSnapshot)
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

const _executeCase = async function (diagnosticCommand, commandName, f) {
  try {
    const item = diagnosticCommand[commandName]
    await f(item)
  } catch (error) {
    logger.error(error.message)
  }
}

const _changeMicroserviceStraceState = async function (obj) {
  const isEnable = AppHelper.validateBooleanCliOptions(obj.enable, obj.disable)
  logger.cliReq('diagnostics strace-update', { args: { isEnable: isEnable } })
  await DiagnosticService.changeMicroserviceStraceState(obj.microserviceUuid, { enable: isEnable }, {}, true)
  const msg = isEnable ? 'Microservice strace has been enabled' : 'Microservice strace has been disabled'
  logger.cliRes(msg)
}

const _getMicroserviceStraceData = async function (obj) {
  logger.cliReq('diagnostics strace-info', { args: obj })
  const result = await DiagnosticService.getMicroserviceStraceData(obj.microserviceUuid, { format: obj.format }, {}, true)
  logger.cliRes('Strace data:')
  logger.cliRes('=============================')
  logger.cliRes(result.data)
  logger.cliRes('Microservice strace data has been retrieved successfully.')
}

const _postMicroserviceStraceDataToFtp = async function (obj) {
  logger.cliReq('diagnostics strace-ftp-post', { args: obj })
  await DiagnosticService.postMicroserviceStraceDatatoFtp(obj.microserviceUuid, obj, {}, true)
  logger.cliRes('Strace data has been posted to FTP successfully.')
}

const _postMicroserviceImageSnapshotCreate = async function (obj) {
  logger.cliReq('diagnostics image-snapshot-create')
  await DiagnosticService.postMicroserviceImageSnapshotCreate(obj.microserviceUuid, {}, true)
  logger.cliRes('Microservice image snapshot has been created successfully.')
}

const _getMicroserviceImageSnapshot = async function (obj) {
  logger.cliReq('diagnostics image-snapshot-get')
  const filePath = await DiagnosticService.getMicroserviceImageSnapshot(obj.microserviceUuid, {}, true)
  logger.cliRes('Microservice images path = ' + filePath)
}

module.exports = new Diagnostics()

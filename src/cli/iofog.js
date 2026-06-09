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
const fs = require('fs')
const AppHelper = require('../helpers/app-helper')
const FogService = require('../services/iofog-service')
const CliDataTypes = require('./cli-data-types')

const JSON_SCHEMA = AppHelper.stringifyCliJsonSchema({
  name: 'string',
  location: 'string',
  latitude: 0,
  longitude: 0,
  description: 'string',
  dockerUrl: 'string',
  diskLimit: 0,
  diskDirectory: 'string',
  memoryLimit: 0,
  cpuLimit: 0,
  logLimit: 0,
  logDirectory: 'string',
  logFileCount: 0,
  statusFrequency: 0,
  changeFrequency: 0,
  deviceScanFrequency: 0,
  bluetoothEnabled: false,
  watchdogEnabled: true,
  abstractedHardwareEnabled: false,
  fogType: 0,
  dockerPruningFrequency: 0,
  availableDiskThreshold: 0,
  logLevel: 'string',
  timeZone: 'string'
})

class IOFog extends BaseCLIHandler {
  constructor () {
    super()

    this.name = constants.CMD_IOFOG
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
        description: 'Path to ioFog settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'iofog-uuid',
        alias: 'i',
        type: String,
        description: 'ioFog node UUID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PROVISIONING_KEY,
          constants.CMD_IOFOG_REBOOT, constants.CMD_VERSION, constants.CMD_HAL_HW, constants.CMD_HAL_USB, constants.CMD_IOFOG_PRUNE]
      },
      {
        name: 'name',
        alias: 'n',
        type: String,
        description: 'ioFog node name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'location',
        alias: 'l',
        type: String,
        description: 'ioFog node location',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'latitude',
        alias: 't',
        type: CliDataTypes.Float,
        description: 'ioFog node latitude',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'longitude',
        alias: 'g',
        type: CliDataTypes.Float,
        description: 'ioFog node longitude',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'description',
        alias: 'd',
        type: String,
        description: 'ioFog node description',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'docker-url',
        alias: 'D',
        type: String,
        description: 'ioFog node docker url',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'disk-limit',
        alias: 'M',
        type: CliDataTypes.Float,
        description: 'ioFog node disk usage limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'disk-directory',
        alias: 'T',
        type: String,
        description: 'Path to ioFog node disk directory',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'memory-limit',
        alias: 'm',
        type: CliDataTypes.Float,
        description: 'ioFog node memory usage limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'cpu-limit',
        alias: 'c',
        type: CliDataTypes.Float,
        description: 'ioFog node CPU usage limit (%)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-limit',
        alias: 'G',
        type: CliDataTypes.Float,
        description: 'ioFog node log size limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-directory',
        alias: 'Y',
        type: String,
        description: 'Path to ioFog node log files directory',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-file-count',
        alias: 'C',
        type: CliDataTypes.Integer,
        description: 'ioFog node log files count',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'status-frequency',
        alias: 's',
        type: CliDataTypes.Integer,
        description: 'ioFog node status check frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'change-frequency',
        alias: 'F',
        type: CliDataTypes.Integer,
        description: 'ioFog node configuration change check frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'device-frequency',
        alias: 'Q',
        type: CliDataTypes.Integer,
        description: 'ioFog node device scan frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'bluetooth-enable',
        alias: 'B',
        type: Boolean,
        description: 'Enable bluetooth on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'bluetooth-disable',
        alias: 'b',
        type: Boolean,
        description: 'Disable bluetooth on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'watchdog-enable',
        alias: 'W',
        type: Boolean,
        description: 'Enable watchdog on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'watchdog-disable',
        alias: 'w',
        type: Boolean,
        description: 'Disable watchdog on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'abs-hw-enable',
        alias: 'A',
        type: Boolean,
        description: 'Enable hardware abstraction on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'abs-hw-disable',
        alias: 'a',
        type: Boolean,
        description: 'Disable hardware abstraction on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'reboot',
        alias: 'o',
        type: Boolean,
        description: 'Reboot ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'fog-type',
        alias: 'y',
        type: CliDataTypes.Integer,
        description: 'ioFog node architecture type',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'version-command',
        alias: 'v',
        type: String,
        description: 'ioFog version command <upgrade/rollback>',
        group: [constants.CMD_VERSION]
      },
      {
        name: 'log-level',
        alias: 'L',
        type: String,
        description: 'ioFog node log files level',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'docker-pruning-frequency',
        alias: 'p',
        type: CliDataTypes.Integer,
        description: 'ioFog node docker pruning frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'available-disk-threshold',
        alias: 'k',
        type: CliDataTypes.Integer,
        description: 'ioFog node available disk threshold (%)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'prune',
        alias: 'e',
        type: Boolean,
        description: 'Prune ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      }
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new ioFog node.',
      [constants.CMD_UPDATE]: 'Update existing ioFog node.',
      [constants.CMD_REMOVE]: 'Delete an ioFog node.',
      [constants.CMD_LIST]: 'List all ioFog nodes.',
      [constants.CMD_INFO]: 'Get ioFog node settings.',
      [constants.CMD_PROVISIONING_KEY]: 'Get provisioning key for an ioFog node.',
      [constants.CMD_IOFOG_REBOOT]: 'Reboot ioFog node',
      [constants.CMD_VERSION]: 'Change agent version of ioFog node',
      [constants.CMD_HAL_HW]: 'Get HAL Hardware ioFog node data',
      [constants.CMD_HAL_USB]: 'Get HAL USB ioFog node data',
      [constants.CMD_IOFOG_PRUNE]: 'Prune ioFog node'
    }
  }

  async run (args) {
    try {
      const iofogCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv, partial: false })

      const command = iofogCommand.command.command

      this.validateParameters(command, this.commandDefinitions, args.argv)

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(iofogCommand, constants.CMD_ADD, _createFog)
          break
        case constants.CMD_UPDATE:
          await _executeCase(iofogCommand, constants.CMD_UPDATE, _updateFog)
          break
        case constants.CMD_REMOVE:
          await _executeCase(iofogCommand, constants.CMD_REMOVE, _deleteFog)
          break
        case constants.CMD_LIST:
          await _executeCase(iofogCommand, constants.CMD_LIST, _getFogList)
          break
        case constants.CMD_INFO:
          await _executeCase(iofogCommand, constants.CMD_INFO, _getFog)
          break
        case constants.CMD_PROVISIONING_KEY:
          await _executeCase(iofogCommand, constants.CMD_PROVISIONING_KEY, _generateProvision)
          break
        case constants.CMD_IOFOG_REBOOT:
          await _executeCase(iofogCommand, constants.CMD_IOFOG_REBOOT, _setFogRebootCommand)
          break
        case constants.CMD_VERSION:
          await _executeCase(iofogCommand, constants.CMD_VERSION, _setFogVersionCommand)
          break
        case constants.CMD_HAL_HW:
          await _executeCase(iofogCommand, constants.CMD_HAL_HW, _getHalHardwareInfo)
          break
        case constants.CMD_HAL_USB:
          await _executeCase(iofogCommand, constants.CMD_HAL_USB, _getHalUsbInfo)
          break
        case constants.CMD_IOFOG_PRUNE:
          await _executeCase(iofogCommand, constants.CMD_IOFOG_PRUNE, _setFogPruneCommand)
          break
        case constants.CMD_HELP:
        default:
          return this.help()
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
        ]
      }
    ])
  }
}

async function _executeCase (commands, commandName, f) {
  try {
    const obj = commands[commandName]
    await f(obj)
  } catch (error) {
    logger.error(error.message)
  }
}

async function _createFog (obj) {
  const fog = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createFogObject(obj)

  logger.cliReq('fog add', { args: fog })
  const result = await FogService.createFogEndPoint(fog, true)
  logger.cliRes(JSON.stringify({
    uuid: result.uuid
  }, null, 2))
}

async function _updateFog (obj) {
  const fog = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createFogObject(obj)

  fog.uuid = obj.iofogUuid

  logger.cliReq('fog update', { args: fog })
  await FogService.updateFogEndPoint(fog, true)
  logger.cliRes('ioFog node has been updated successfully.')
}

async function _deleteFog (obj) {
  const fog = _createFogObject(obj)
  logger.cliReq('fog remove', { args: fog })
  await FogService.deleteFogEndPoint(fog, true)
  logger.cliRes('ioFog node has been removed successfully')
}

async function _getFogList (obj) {
  logger.cliReq('fog list')
  const emptyFilters = []
  const list = await FogService.getFogListEndPoint(emptyFilters, true, false)
  logger.cliRes(JSON.stringify(list, null, 2))
}

async function _getFog (obj) {
  const fog = _createFogObject(obj)
  logger.cliReq('fog info', { args: fog })
  const res = await FogService.getFogEndPoint(fog, true)
  logger.cliRes(JSON.stringify(res, null, 2))
}

async function _generateProvision (obj) {
  const fog = _createFogObject(obj)
  logger.cliReq('fog provisioning-key', { args: fog })
  const response = await FogService.generateProvisioningKeyEndPoint(fog, true)
  logger.cliRes(JSON.stringify(response), null, 2)
}

async function _setFogRebootCommand (obj) {
  const fog = _createFogObject(obj)
  logger.cliReq('fog reboot', { args: fog })
  await FogService.setFogRebootCommandEndPoint(fog, true)
  logger.cliRes('ioFog reboot command has been set successfully')
}

async function _setFogVersionCommand (obj) {
  const fog = {
    uuid: obj.iofogUuid,
    versionCommand: obj.versionCommand
  }
  logger.cliReq('fog version', { args: fog })
  await FogService.setFogVersionCommandEndPoint(fog, true)
  logger.cliRes('ioFog version command has been set successfully')
}

async function _getHalHardwareInfo (obj) {
  const uuidObj = {
    uuid: obj.iofogUuid
  }
  logger.cliReq('fog hal-hw', { args: uuidObj })
  const data = await FogService.getHalHardwareInfoEndPoint(uuidObj, {}, true)
  if (data) {
    if (data.hasOwnProperty('info')) {
      data.info = JSON.parse(data.info)
    }

    logger.cliRes(JSON.stringify(data, null, 2))
  }
}

async function _getHalUsbInfo (obj) {
  const uuidObj = {
    uuid: obj.iofogUuid
  }
  logger.cliReq('fog hal-usb', { args: uuidObj })
  const data = await FogService.getHalUsbInfoEndPoint(uuidObj, {}, true)
  if (data) {
    if (data.hasOwnProperty('info')) {
      data.info = JSON.parse(data.info)
    }

    logger.cliRes(JSON.stringify(data, null, 2))
  }
}

async function _setFogPruneCommand (obj) {
  const fog = _createFogObject(obj)
  logger.cliReq('fog prune', { args: fog })
  await FogService.setFogPruneCommandEndPoint(fog, true)
  logger.cliRes('ioFog prune command has been set successfully')
}

function _createFogObject (cliData) {
  const fogObj = {
    uuid: cliData.iofogUuid,
    name: cliData.name,
    location: cliData.location,
    latitude: cliData.latitude,
    longitude: cliData.longitude,
    description: cliData.description,
    dockerUrl: cliData.dockerUrl,
    diskLimit: cliData.diskLimit,
    diskDirectory: cliData.diskDirectory,
    memoryLimit: cliData.memoryLimit,
    cpuLimit: cliData.cpuLimit,
    logLimit: cliData.logLimit,
    logDirectory: cliData.logDirectory,
    logFileCount: cliData.logFileCount,
    statusFrequency: cliData.statusFrequency,
    changeFrequency: cliData.changeFrequency,
    deviceScanFrequency: cliData.deviceFrequency,
    bluetoothEnabled: AppHelper.validateBooleanCliOptions(cliData.bluetoothEnable, cliData.bluetoothDisable),
    watchdogEnabled: AppHelper.validateBooleanCliOptions(cliData.watchdogEnable, cliData.watchdogDisable),
    abstractedHardwareEnabled: AppHelper.validateBooleanCliOptions(cliData.absHwEnable, cliData.absHwDisable),

    fogType: cliData.fogType,
    dockerPruningFrequency: cliData.dockerPruningFrequency,
    availableDiskThreshold: cliData.availableDiskThreshold,
    logLevel: cliData.logLevel,
    timeZone: cliData.timeZone
  }

  return AppHelper.deleteUndefinedFields(fogObj)
}

module.exports = new IOFog()

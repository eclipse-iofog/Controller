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

const BaseCLIHandler = require('./base-cli-handler');
const constants = require('../helpers/constants');
const logger = require('../logger');
const fs = require('fs');
const CliDecorator = require('../decorators/cli-decorator');
const AppHelper = require('../helpers/app-helper');
const FogService = require('../services/iofog-service');

const JSON_SCHEMA = AppHelper.stringifyCliJsonSchema({
  name: "string",
  location: "string",
  latitude: 0,
  longitude: 0,
  description: "string",
  dockerUrl: "string",
  diskLimit: 0,
  diskDirectory: "string",
  memoryLimit: 0,
  cpuLimit: 0,
  logLimit: 0,
  logDirectory: "string",
  logFileCount: 0,
  statusFrequency: 0,
  changeFrequency: 0,
  deviceScanFrequency: 0,
  bluetoothEnabled: false,
  watchdogEnabled: true,
  abstractedHardwareEnabled: false,
  fogType: 0
});

class IOFog extends BaseCLIHandler {
  constructor() {
    super();

    this.name = constants.CMD_IOFOG;
    this.commandDefinitions = [
      {
        name: 'command', defaultOption: true,
        group: [constants.CMD]},
      {
        name: 'file', alias: 'f', type: String,
        description: 'Path to ioFog settings JSON file',
        group: [constants.CMD_ADD, constants.CMD_UPDATE]
      },
      {
        name: 'node-id', alias: 'i', type: String,
        description: 'ioFog node ID',
        group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PROVISIONING_KEY,
          constants.CMD_IOFOG_REBOOT, constants.CMD_VERSION, constants.CMD_HAL_HW, constants.CMD_HAL_USB]
      },
      {
        name: 'name', alias: 'n', type: String,
        description: 'ioFog node name',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'location', alias: 'l', type: String,
        description: 'ioFog node location',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'latitude', alias: 't', type: Number,
        description: 'ioFog node latitude',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'longitude', alias: 'g', type: Number,
        description: 'ioFog node longitude',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'description', alias: 'd', type: String,
        description: 'ioFog node description',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'docker-url', alias: 'D', type: String,
        description: 'ioFog node docker url',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'disk-limit', alias: 'M', type: Number,
        description: 'ioFog node disk usage limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'disk-directory', alias: 'T', type: String,
        description: 'Path to ioFog node disk directory',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'memory-limit', alias: 'm', type: Number,
        description: 'ioFog node memory usage limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'cpu-limit', alias: 'c', type: Number,
        description: 'ioFog node CPU usage limit (%)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-limit', alias: 'G', type: Number,
        description: 'ioFog node log size limit (MB)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-directory', alias: 'Y', type: String,
        description: 'Path to ioFog node log files directory',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'log-file-count', alias: 'C', type: Number,
        description: 'ioFog node log files count',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'status-frequency', alias: 's', type: Number,
        description: 'ioFog node status check frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'change-frequency', alias: 'F', type: Number,
        description: 'ioFog node configuration change check frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'device-frequency', alias: 'Q', type: Number,
        description: 'ioFog node device scan frequency (seconds)',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'bluetooth-enable', alias: 'B', type: Boolean,
        description: 'Enable bluetooth on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'bluetooth-disable', alias: 'b', type: Boolean,
        description: 'Disable bluetooth on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'watchdog-enable', alias: 'W', type: Boolean,
        description: 'Enable watchdog on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'watchdog-disable', alias: 'w', type: Boolean,
        description: 'Disable watchdog on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'abs-hw-enable', alias: 'A', type: Boolean,
        description: 'Enable hardware abstraction on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'abs-hw-disable', alias: 'a', type: Boolean,
        description: 'Disable hardware abstraction on ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'reboot', alias: 'o', type: Boolean,
        description: 'Reboot ioFog node',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'fog-type', alias: 'y', type: Number,
        description: 'ioFog node architecture type',
        group: [constants.CMD_UPDATE, constants.CMD_ADD]
      },
      {
        name: 'version-command', alias: 'v', type: String,
        description: 'ioFog version command <upgrade/rollback>',
        group: [constants.CMD_VERSION]
      },
      {
        name: 'user-id', alias: 'u', type: Number,
        description: 'User\'s id',
        group: [constants.CMD_ADD]
      }
    ];
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
      [constants.CMD_HAL_USB]: 'Get HAL USB ioFog node data'
    }
  }

  async run(args) {
    try {
      const iofogCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv, partial: false});

      const command = iofogCommand.command.command;

      AppHelper.validateParameters(command, this.commandDefinitions, args.argv);

      switch (command) {
        case constants.CMD_ADD:
          await _executeCase(iofogCommand, constants.CMD_ADD, _createFog, true);
          break;
        case constants.CMD_UPDATE:
          await _executeCase(iofogCommand, constants.CMD_UPDATE, _updateFog, false);
          break;
        case constants.CMD_REMOVE:
          await _executeCase(iofogCommand, constants.CMD_REMOVE, _deleteFog, false);
          break;
        case constants.CMD_LIST:
          await _executeCase(iofogCommand, constants.CMD_LIST, _getFogList, false);
          break;
        case constants.CMD_INFO:
          await _executeCase(iofogCommand, constants.CMD_INFO, _getFog, false);
          break;
        case constants.CMD_PROVISIONING_KEY:
          await _executeCase(iofogCommand, constants.CMD_PROVISIONING_KEY, _generateProvision, false);
          break;
        case constants.CMD_IOFOG_REBOOT:
          await _executeCase(iofogCommand, constants.CMD_IOFOG_REBOOT, _setFogRebootCommand, false);
          break;
        case constants.CMD_VERSION:
          await _executeCase(iofogCommand, constants.CMD_VERSION, _setFogVersionCommand, false);
          break;
        case constants.CMD_HAL_HW:
          await _executeCase(iofogCommand, constants.CMD_HAL_HW, _getHalHardwareInfo, false);
          break;
        case constants.CMD_HAL_USB:
          await _executeCase(iofogCommand, constants.CMD_HAL_USB, _getHalUsbInfo, false);
          break;
        case constants.CMD_HELP:
        default:
          return this.help()
      }
    } catch (error) {
      AppHelper.handleCLIError(error);
    }
  }

  help() {
    super.help([constants.CMD_LIST], true, true, [
      {
        header: 'JSON File Schema',
        content: [
          JSON_SCHEMA,
        ]
      },
    ])
  }
}

async function _executeCase(commands, commandName, f, isUserRequired) {
  try {
    const obj = commands[commandName];

    if (isUserRequired) {
      const decoratedFunction = CliDecorator.prepareUserById(f);
      await decoratedFunction(obj);
    } else {
      await f(obj);
    }
  } catch (error) {
    logger.error(error.message);
  }
}

async function _createFog(obj, user) {
  const fog = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createFogObject(obj);

  logger.info(JSON.stringify(fog));

  const result = await FogService.createFog(fog, user, true);
  logger.info(JSON.stringify(result));
  logger.info('Fog has been created successfully.');
}

async function _updateFog(obj, user) {
  const fog = obj.file
    ? JSON.parse(fs.readFileSync(obj.file, 'utf8'))
    : _createFogObject(obj);

  fog.uuid = obj.nodeId
  logger.info(JSON.stringify(fog));

  await FogService.updateFog(fog, user, true);
  logger.info('Fog has been updated successfully.');
}

async function _deleteFog(obj, user) {
  const fog = _createFogObject(obj);
  logger.info(JSON.stringify(fog));
  await FogService.deleteFog(fog, user, true);
  logger.info('Fog has been removed successfully');
}

async function _getFogList(obj, user) {
  const emptyFilters = [];
  const list = await FogService.getFogList(emptyFilters, user, true);
  logger.info(JSON.stringify(list, null, 2));
  logger.info('Fog list has been gotten successfully.');
}

async function _getFog(obj, user) {
  const fog = _createFogObject(obj);
  const res = await FogService.getFogWithTransaction(fog, user, true);
  logger.info(JSON.stringify(res, null, 2));
  logger.info('Fog has been gotten successfully.');
}

async function _generateProvision(obj, user) {
  const fog = _createFogObject(obj);
  logger.info(JSON.stringify(fog));
  const res = await FogService.generateProvisioningKey(fog, user, true);
  logger.info('Provisioning key: ' + JSON.stringify(res, null, 2));
  logger.info('Fog provisioning key has been generated successfully.');
}

async function _setFogRebootCommand(obj, user) {
  const fog = _createFogObject(obj);
  logger.info(JSON.stringify(fog));
  await FogService.setFogRebootCommand(fog, user, true);
  logger.info('Fog reboot command has been set successfully');
}

async function _setFogVersionCommand(obj, user) {
  const fog = {
    uuid: obj.nodeId,
    versionCommand: obj.versionCommand
  };
  logger.info(JSON.stringify(fog));
  await FogService.setFogVersionCommand(fog, user, true);
  logger.info('Fog version command has been set successfully');
}

async function _getHalHardwareInfo(obj) {
  const uuidObj = {
    uuid: obj.nodeId
  };

  logger.info("Parameters" + JSON.stringify(uuidObj));

  const info = await FogService.getHalHardwareInfo(uuidObj, {}, true);
  logger.info(JSON.stringify(info, null, 2));
  logger.info('Hardware info has been retrieved successfully.')
}

async function _getHalUsbInfo(obj) {
  const uuidObj = {
    uuid: obj.nodeId
  };

  logger.info("Parameters" + JSON.stringify(uuidObj));

  const info = await FogService.getHalHardwareInfo(uuidObj, {}, true);
  logger.info(JSON.stringify(info, null, 2));
  logger.info('Usb info has been retrieved successfully.')
}

function _createFogObject(cliData) {
  const fogObj = {
    uuid: cliData.nodeId,
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
    userId: cliData.userId
  };

  return AppHelper.deleteUndefinedFields(fogObj);
}

module.exports = new IOFog();
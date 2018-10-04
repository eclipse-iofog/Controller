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
  `name: string
  location: string
  latitude: number
  longitude: number
  description: string
  dockerUrl: string
  diskLimit: number
  diskDirectory: string
  memoryLimit: number
  cpuLimit: number
  logLimit: number
  logDirectory: string
  logFileCount: number
  statusFrequency: number
  changeFrequency: number
  deviceScanFrequency: number
  bluetoothEnabled: boolean
  watchdogEnabled: boolean
  abstractedHardwareEnabled: boolean
  autoGPSEnabled: boolean
  reboot: boolean
  fogType: number`

class IOFog extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_IOFOG
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: [constants.CMD] },
      { name: 'file', alias: 'f', type: String, description: 'ioFog settings JSON file', group: [constants.CMD_ADD, constants.CMD_UPDATE] },
      { name: 'node-id', alias: 'i', type: String, description: 'ioFog node ID', group: [constants.CMD_UPDATE, constants.CMD_REMOVE, constants.CMD_INFO, constants.CMD_PROVISIONING_KEY] },
      { name: 'name', alias: 'n', type: String, description: 'ioFog node name', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'location', alias: 'l', type: String, description: 'ioFog node location', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'latitude', alias: 't', type: Number, description: 'ioFog node latitude', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'longitude', alias: 'g', type: Number, description: 'ioFog node longitude', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'description', alias: 'd', type: String, description: 'ioFog node description', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'docker-url', alias: 'D', type: String, description: 'ioFog node docker url', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'disk-limit', alias: 'M', type: Number, description: 'ioFog node disk usage limit (MB)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'disk-directory', alias: 'T', type: String, description: 'ioFog node disk directory', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'memory-limit', alias: 'm', type: Number, description: 'ioFog node memory usage limit (MB)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'cpu-limit', alias: 'c', type: Number, description: 'ioFog node CPU usage limit (%)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'log-limit', alias: 'G', type: Number, description: 'ioFog node log size limit (MB)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'log-directory', alias: 'Y', type: String, description: 'ioFog node log files directory', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'log-count', alias: 'C', type: Number, description: 'ioFog node log files count', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'status-frequency', alias: 's', type: Number, description: 'ioFog node status check frequency (seconds)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'change-frequency', alias: 'F', type: Number, description: 'ioFog node configuration change check frequency (seconds)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'device-frequency', alias: 'Q', type: Number, description: 'ioFog node device scan frequency (seconds)', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'blutooth-enable', alias: 'B', type: Boolean, description: 'Enable bluetoth on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'blutooth-disable', alias: 'b', type: Boolean, description: 'Disable bluetoth on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'watchdog-enable', alias: 'W', type: Boolean, description: 'Enable watchdog on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'watchdog-disable', alias: 'w', type: Boolean, description: 'Disable watchdog on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'abs-hw-enable', alias: 'a', type: Boolean, description: 'Enable hardware abstraction on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'abs-hw-disable', alias: 'A', type: Boolean, description: 'Disable hardware abstraction on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'gps-enable', alias: 'p', type: Boolean, description: 'Enable GPS on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'gps-disable', alias: 'P', type: Boolean, description: 'Disable GPS on ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'reboot', alias: 'o', type: Boolean, description: 'Reboot ioFog node', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'fog-type', alias: 'y', type: Number, description: 'ioFog node architecture type', group: [constants.CMD_UPDATE, constants.CMD_ADD] },
      { name: 'enable', alias: 'e', type: Boolean, description: 'Enable tunnel', group: [constants.CMD_TUNNEL] },
      { name: 'disable', alias: 'S', type: Boolean, description: 'Disable tunnel', group: [constants.CMD_TUNNEL] },
      { name: 'info', alias: 'O', type: Boolean, description: 'Display tunnel info', group: [constants.CMD_TUNNEL] },
      { name: 'user-id', alias: 'u', type: Number, description: 'User\'s id', group: [constants.CMD_ADD] },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new ioFog node.',
      [constants.CMD_UPDATE]: 'Update existing ioFog node.',
      [constants.CMD_REMOVE]: 'Delete an ioFog node.',
      [constants.CMD_LIST]: 'List all ioFog nodes.',
      [constants.CMD_INFO]: 'Get ioFog node settings.',
      [constants.CMD_PROVISIONING_KEY]: 'Get provisioning key for an ioFog node.',
      [constants.CMD_TUNNEL]: 'Tunnel operations for an ioFog node.',
    }
  }

  run(args) {
    const iofogCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    switch (iofogCommand.command.command) {
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
      case constants.CMD_PROVISIONING_KEY:
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
        ]
      },
    ])
  }
}

module.exports = new IOFog()
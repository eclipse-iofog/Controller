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
const Start = require('./start')
const User = require('./user')
const Config = require('./config')
const Tunnel = require('./tunnel')
const IOFog = require('./iofog')
const Catalog = require('./catalog')
const Application = require('./application')
const Microservice = require('./microservice')
const Registry = require('./registry')
const Controller = require('./controller')
const Diagnostics = require('./diagnostics')
const packageJson = require('./../../package')

const constants = require('../helpers/constants')

const Sentry = require('@sentry/node')
Sentry.init({ dsn: 'https://3213bc0b88db47ffb103075d7e1e254f@sentry.io/1378606' })
Sentry.configureScope((scope) => {
  scope.setExtra('version', packageJson.version)
})

class Cli extends BaseCLIHandler {
  constructor () {
    super()
    this.commandDefinitions = [
      { name: 'command', defaultOption: true }
    ]
    this.commands = {
      [constants.CMD_START]: 'Start iofog-controller service.',
      [constants.CMD_STOP]: 'Stop iofog-controller service.',
      // init db is hidden command
      // [constants.CMD_INIT_DB]: 'Init sqlite db for iofog-controller.',
      [constants.CMD_CONTROLLER]: 'Display iofog-controller service information.',
      [constants.CMD_HELP]: 'Display usage information.',
      [constants.CMD_USER]: 'User operations.',
      [constants.CMD_CONFIG]: 'Set/Display iofog-controller service config.',
      [constants.CMD_TUNNEL]: 'Tunnel operations.',
      [constants.CMD_IOFOG]: 'ioFog nodes operations.',
      [constants.CMD_CATALOG]: 'Microservices catalog operations.',
      [constants.CMD_FLOW]: 'Application operations.',
      [constants.CMD_MICROSERVICE]: 'Microservice instance operations.',
      [constants.CMD_REGISTRY]: 'Registries instance operations.',
      [constants.CMD_DIAGNOSTICS]: 'Diagnostic instance operations.'
    }
  }

  async run (daemon) {
    const mainCommand = this.parseCommandLineArgs(this.commandDefinitions)
    const argv = mainCommand._unknown || []

    await Start.initDB(mainCommand.command === constants.CMD_START)

    switch (mainCommand.command) {
      case constants.CMD_START:
        return Start.run({ daemon })
      case constants.CMD_STOP:
        return daemon.stop()
      case constants.CMD_INIT_DB:
        return
      case constants.CMD_CONTROLLER:
        return Controller.run({ argv })
      case constants.CMD_USER:
        return User.run({ argv })
      case constants.CMD_CONFIG:
        return Config.run({ argv })
      case constants.CMD_TUNNEL:
        return Tunnel.run({ argv })
      case constants.CMD_IOFOG:
        return IOFog.run({ argv })
      case constants.CMD_CATALOG:
        return Catalog.run({ argv })
      case constants.CMD_FLOW:
        return Application.run({ argv })
      case constants.CMD_MICROSERVICE:
        return Microservice.run({ argv })
      case constants.CMD_REGISTRY:
        return Registry.run({ argv })
      case constants.CMD_DIAGNOSTICS:
        return Diagnostics.run({ argv })
      case constants.CMD_HELP:
      default:
        return this.help([], false)
    }
  }
}

module.exports = Cli

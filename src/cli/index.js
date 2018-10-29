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
const Start = require('./start')
const User = require('./user')
const Connector = require('./connector')
const Config = require('./config')
const Proxy = require('./proxy')
const IOFog = require('./iofog')
const Catalog = require('./catalog')
const Flow = require('./flow')
const Microservice = require('./microservice')
const Registry = require('./registry')
const Controller = require('./controller')
const Diagnostics = require('./diagnostics')

const constants = require('../helpers/constants')

class Cli extends BaseCLIHandler {
  constructor() {
    super()
    this.commandDefinitions = [
      { name: 'command', defaultOption: true },
    ]
    this.commands = {
      [constants.CMD_START]: 'Start iofog-controller service.',
      [constants.CMD_STOP]: 'Stop iofog-controller service.',
      [constants.CMD_CONTROLLER]: 'Display iofog-controller service information.',
      [constants.CMD_HELP]: 'Display usage information.',
      [constants.CMD_USER]: 'User operations.',
      [constants.CMD_CONFIG]: 'Set/Display iofog-controller service config.',
      [constants.CMD_CONNECTOR]: 'Connector operations.',
      [constants.CMD_PROXY]: 'Proxy operations.',
      [constants.CMD_IOFOG]: 'ioFog nodes operations.',
      [constants.CMD_CATALOG]: 'Microservices catalog operations.',
      [constants.CMD_FLOW]: 'Application flow operations.',
      [constants.CMD_MICROSERVICE]: 'Microservice instance operations.',
      [constants.CMD_REGISTRY]: 'Registries instance operations.',
      [constants.CMD_DIAGNOSTICS]: 'Diagnostic instance operations.',
    }
  }

  run(daemon) {
    const mainCommand = this.parseCommandLineArgs(this.commandDefinitions)
    const argv = mainCommand._unknown || []

    switch (mainCommand.command) {
      case constants.CMD_START:
        return Start.run({ daemon })
      case constants.CMD_STOP:
        return daemon.stop()
      case constants.CMD_CONTROLLER:
        return Controller.run({ argv })
      case constants.CMD_USER:
        return User.run({ argv })
      case constants.CMD_CONFIG:
        return Config.run({ argv })
      case constants.CMD_CONNECTOR:
        return Connector.run({ argv })
      case constants.CMD_PROXY:
        return Proxy.run({ argv })
      case constants.CMD_IOFOG:
        return IOFog.run({ argv })
      case constants.CMD_CATALOG:
        return Catalog.run({ argv })
      case constants.CMD_FLOW:
        return Flow.run({ argv })
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
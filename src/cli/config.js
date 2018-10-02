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
const config = require('../config')
const constants = require('../helpers/constants')
const helpers = require('../helpers')

class Config extends BaseCLIHandler {
  constructor() {
    super()

    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: constants.CMD },
      { name: 'list', alias: 'l', type: Boolean, description: 'Display current config', group: 'Options' },
      { name: 'port', alias: 'p', type: Number, description: 'Port', group: 'Options' },
      { name: 'ssl-cert', alias: 'c', type: String, description: 'Path to SSL certificate file', group: 'Options' },
      { name: 'ssl-key', alias: 'k', type: String, description: 'Path to SSL key file', group: 'Options' },
      { name: 'intermediate-cert', alias: 'i', type: String, description: 'Path to SSL intermediate certificate file', group: 'Options' },
      { name: 'email-activation-on', alias: 'm', type: Boolean, description: 'Email activation required', group: 'Options' },
      { name: 'email-activation-off', alias: 'n', type: Boolean, description: 'Email activation not required', group: 'Options' },
      { name: 'email-address', alias: 'a', type: String, description: 'Email address to send activations from', group: 'Options' },
      { name: 'email-password', alias: 'w', type: String, description: 'Email password to send activations from', group: 'Options' },
      { name: 'email-service', alias: 's', type: String, description: 'Email service to send activations', group: 'Options' },
      { name: 'log-dir', alias: 'd', type: String, description: 'Log files directory', group: 'Options' },
      { name: 'log-size', alias: 'z', type: Number, description: 'Log files size (MB)', group: 'Options' },
    ]
    this.commands = {
      'Options': {},
    }
  }

  run(args) {
    const configCommand = this.parseCommandLineArgs(this.commandDefinitions, { argv: args.argv })

    if (configCommand.command.command === constants.CMD_HELP) {
      return this.help([], true, false)
    }

    if (configCommand.Options.port != null) {
      config.set('Server:Port', configCommand.Options.port)
    }

    if (configCommand.Options.sslCert != null) {
      config.set('Server:SslCert', configCommand.Options.sslCert)
    }

    if (configCommand.Options.sslKey != null) {
      config.set('Server:SslKey', configCommand.Options.sslKey)
    }

    if (configCommand.Options.intermediateCert != null) {
      config.set('Server:IntermediateCert', configCommand.Options.intermediateCert)
    }

    if (configCommand.Options.emailActivationOn === true && !config.get('Email:ActivationEnabled')) {
      config.set('Email:ActivationEnabled', true)
    }

    if (configCommand.Options.emailActivationOff === true && config.get('Email:ActivationEnabled')) {
      config.set('Email:ActivationEnabled', false)
    }

    if (configCommand.Options.emailAddress != null && config.get('Email:Address') !== configCommand.Options.emailAddress) {
      if (configCommand.Options.emailPassword == null) {
        return console.log('When changing email address, password must be provided.')
      }
      config.set('Email:Address', configCommand.Options.emailAddress)
    }

    if (configCommand.Options.emailPassword != null) {
      config.set('Email:Password', helpers.encryptText(configCommand.Options.emailPassword, config.get('Email:Address')))
    }

    if (configCommand.Options.emailService != null) {
      config.set('Email:Service', configCommand.Options.emailService)
    }

    if (configCommand.Options.logDir != null) {
      config.set('Service:LogsDirectory', configCommand.Options.logDir)
    }

    if (configCommand.Options.logSize != null) {
      config.set('Service:LogsFileSize', configCommand.Options.logSize * 1024)
    }

    if (configCommand.Options.list === true) {
      this.listConfig()
    }
  }

  listConfig() {
    const configuration = {
      'Port': config.get('Server:Port'),
      'SSL key directory': config.get('Server:SslKey'),
      'SSL certificate directory': config.get('Server:SslCert'),
      'Intermediate key directory': config.get('Server:IntermediateCert'),
      'Email activation': config.get('Email:ActivationEnabled') ? 'on' : 'off',
      'Email address': config.get('Email:Address'),
      'Email password': config.get('Email:Password'),
      'Email service': config.get('Email:Service'),
      'Log files directory': config.get('Service:LogsDirectory'),
      'Log files size': config.get('Service:LogsFileSize'),
    }

    const result = Object.keys(configuration)
      .filter(key => configuration[key] != null)
      .map(key => `${key}: ${configuration[key]}`)
      .join('\n')
    console.log(result)
  }
}

module.exports = new Config()
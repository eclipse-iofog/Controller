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
const config = require('../config');
const constants = require('../helpers/constants');
const AppHelper = require('../helpers/app-helper');
const ErrorMessages = require('../helpers/error-messages');
const logger = require('../logger');

class Config extends BaseCLIHandler {
  constructor() {
    super()

    this.name = constants.CMD_CONFIG;
    this.commandDefinitions = [
      { name: 'command', defaultOption: true, group: constants.CMD },
      { name: 'port', alias: 'p', type: Number, description: 'Port', group: constants.CMD_ADD },
      { name: 'ssl-cert', alias: 'c', type: String, description: 'Path to SSL certificate file', group: constants.CMD_ADD },
      { name: 'ssl-key', alias: 'k', type: String, description: 'Path to SSL key file', group: constants.CMD_ADD },
      { name: 'intermediate-cert', alias: 'i', type: String, description: 'Path to SSL intermediate certificate file', group: constants.CMD_ADD },
      { name: 'email-activation-on', alias: 'm', type: Boolean, description: 'Email activation required', group: constants.CMD_ADD },
      { name: 'email-activation-off', alias: 'n', type: Boolean, description: 'Email activation not required', group: constants.CMD_ADD },
      { name: 'email-address', alias: 'a', type: String, description: 'Email address to send activations from', group: constants.CMD_ADD },
      { name: 'email-password', alias: 'w', type: String, description: 'Email password to send activations from', group: constants.CMD_ADD },
      { name: 'email-service', alias: 's', type: String, description: 'Email service to send activations', group: constants.CMD_ADD },
      { name: 'log-dir', alias: 'd', type: String, description: 'Log files directory', group: constants.CMD_ADD },
      { name: 'log-size', alias: 'z', type: Number, description: 'Log files size (MB)', group: constants.CMD_ADD },
    ]
    this.commands = {
      [constants.CMD_ADD]: 'Add a new config value.',
      [constants.CMD_LIST]: 'Display current config.'
    }
  }

  async run(args) {
    const configCommand = this.parseCommandLineArgs(this.commandDefinitions, {argv: args.argv});

    switch (configCommand.command.command) {
      case constants.CMD_ADD:
        await _executeCase(configCommand, constants.CMD_ADD, _addConfigOption);
        break;
      case constants.CMD_LIST:
        await _executeCase(configCommand, constants.CMD_LIST, _listConfigOptions, false);
        break;
      case constants.CMD_HELP:
      default:
        return this.help([], true, false)
    }
  }
}

const _executeCase  = async function (catalogCommand, commandName, f) {
  try {
    const item = catalogCommand[commandName];
    f(item);
  } catch (error) {
    logger.error(error.message);
  }
};

const _addConfigOption = async function (options) {
  if (options.port != null) {
    const port = options.port;
    if (!AppHelper.isValidPort(port)) {
      logger.error(ErrorMessages.INVALID_PORT_FORMAT);
      return;
    }
    AppHelper.checkPortAvailability(port).then(availability => {
      if (availability === 'closed') {
        config.set('Server:Port', port);
      }
      else {
        logger.error(AppHelper.formatMessage(ErrorMessages.PORT_NOT_AVAILABLE, port));
      }
    });
  }

  if (options.sslCert != null) {
    const sslCert = options.sslCert;
    if (!AppHelper.isFileExists(sslCert)) {
      logger.error(ErrorMessages.INVALID_FILE_PATH);
      return;
    }
    config.set('Server:SslCert', sslCert)
  }

  if (options.sslKey != null) {
    const sslKey = options.sslKey;
    if (!AppHelper.isFileExists(sslKey)) {
      logger.error(ErrorMessages.INVALID_FILE_PATH);
      return;
    }
    config.set('Server:SslKey', sslKey)
  }

  if (options.intermediateCert != null) {
    const intermediateCert = options.intermediateCert;
    if (!AppHelper.isFileExists(intermediateCert)) {
      logger.error(ErrorMessages.INVALID_FILE_PATH);
      return;
    }
    config.set('Server:IntermediateCert', intermediateCert)
  }

  if (options.emailActivationOn != null) {
    const emailActivationOn = options.emailActivationOn;
    if (!AppHelper.isValidEmailActivation(emailActivationOn)) {
      logger.error(ErrorMessages.INVALID_FILE_PATH);
      return;
    }
    config.set('Server:ActivationEnabled', true)
  }

  if (options.emailActivationOff != null) {
    const emailActivationOff = options.emailActivationOff;
    if (!AppHelper.isValidEmailActivation(emailActivationOff)) {
      logger.error(ErrorMessages.INVALID_FILE_PATH);
      return;
    }
    config.set('Server:ActivationEnabled', false)
  }

  if (options.emailAddress != null && config.get('Email:Address') !== options.emailAddress) {
    if (options.emailPassword == null) {
      return console.log('When changing email address, password must be provided.')
    }
    config.set('Email:Address', options.emailAddress)
  }

  if (options.emailPassword != null) {
    config.set('Email:Password', AppHelper.encryptText(options.emailPassword, config.get('Email:Address')))
  }

  if (options.emailService != null) {
    config.set('Email:Service', options.emailService)
  }

  if (options.logDir != null) {
    config.set('Service:LogsDirectory', options.logDir)
  }

  if (options.logSize != null) {
    config.set('Service:LogsFileSize', options.logSize * 1024)
  }
}

const _listConfigOptions = function () {
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
  };

  const result = Object.keys(configuration)
    .filter(key => configuration[key] != null)
    .map(key => `${key}: ${configuration[key]}`)
    .join('\n')
  console.log(result)
};

module.exports = new Config();
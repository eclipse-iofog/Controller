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

const _ = require('underscore');
const ConfigManager = require('../sequelize/managers/config-manager');
const AppHelper = require("./app-helper");
const Errors = require("../helpers/errors");

const Constants = require('../helpers/constants');


class ConfigHelper {

  getConfigParam(key) {
    let configValue;

    if (!this.fogConfigs) {
      return undefined;
    } else {
      _.each(this.fogConfigs, function (config) {
        if (config.key.toLowerCase() === key.toLowerCase()) {
          configValue = config.value;
          return;
        }
      });
      return configValue;
    }
  }

  setConfigParam(key, value) {
    if (this.isKeyExist(key)) {
      if (this.validateValue(key, value)) {
        if (key === Constants.CONFIG.port) {
          AppHelper.checkPortAvailability(value).then(availability => {
            if (availability === 'closed') {
              return ConfigManager.setByKey(key, value).then(result => {
                console.log('"' + key + '" has been updated successfully.');
              });
            } else {
              console.log('Port "' + value + '" is not available.');
            }
          });
        } else {
          return ConfigManager.setByKey(key, value).then(result => {
            console.log('"' + key + '" has been updated successfully.');
          });
        }
      } else {
        throw new Errors.ValidationError('Invalid value provided for key "' + key + '"');
      }
    } else {
      throw new Errors.ValidationError('"' + key + '" is not a valid property. You can set properties like: \nport, ssl_key, ssl_cert, intermediate_cert, ' +
        '\nemail_address, email_password, email_service, \nioauthoring_port, ioauthoring_ip_address, ioauthoring_protocol, ' +
        '\nemail_activation [on | off]');
    }
  }

  isKeyExist(configKey) {
    return _.find(Constants.CONFIG, function (value, key) {
      if (configKey.toLowerCase() === key.toLowerCase()) {
        return true;
      }
    });
  }

  validateValue(key, value) {
    if (key === Constants.CONFIG.port || key === Constants.CONFIG.ioauthoring_port) {
      return AppHelper.isValidPort(value);
    } else if (key.toLowerCase() === Constants.CONFIG.email_service || key.toLowerCase() === Constants.CONFIG.email_password || key.toLowerCase() === Constants.CONFIG.email_address) {
      return true;
    } else if (key.toLowerCase() === Constants.CONFIG.ssl_key || key.toLowerCase() === Constants.CONFIG.ssl_cert || key.toLowerCase() === Constants.CONFIG.intermediate_cert) {
      return AppHelper.isFileExists(value);
    } else if (key.toLowerCase() === Constants.CONFIG.email_activation) {
      return AppHelper.isValidEmailActivation(value);
    } else if (key.toLowerCase() === Constants.CONFIG.email_server) {
      return AppHelper.isValidDomain(value);
    } else if (key.toLowerCase() === Constants.CONFIG.email_serverport) {
      return AppHelper.isValidPort(value);
    }
  }

  async getAllConfigs() {
    let configs = await ConfigManager.find();
    this.fogConfigs = configs;
    return configs;
  }
}

const instance = new ConfigHelper();
module.exports = instance;

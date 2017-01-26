/**
 * @file sslFileController.js
 * @author Zishan Iqbal
 * @description This file includes the CRUD operarions on ssl files.
 */

import _ from 'underscore';
import AppUtils from './appUtils';
import FogControllerConfigManager from './../managers/fogControllerConfigManager';
import Constants from './../constants';

class FogControllerConfigUtil {

  getConfigParam(key) {
    let configValue;

    if (!this.fogConfigs) {
      return undefined;
    } else {

      _.each(this.fogConfigs, function(config) {
        if (config.key.toUpperCase() === key.toUpperCase()) {
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
        FogControllerConfigManager.setByKey(key, value);
      } else {
        throw 'Invalid value provided for key "' + key + '"';
      }
    } else {
      throw '"' + key + '" is not a valid property. You can set properties like port, ssl_key, ssl_cert, intermediate_cert etc';
    }
  }

  isKeyExist(configKey) {
    return _.find(Constants.CONFIG, function(value, key) {
      if (configKey.toUpperCase() == key.toUpperCase()) {
        return true;
      }
    });
  }

  validateValue(key, value) {
    if (key.toUpperCase() == Constants.CONFIG.PORT) {
      return AppUtils.isValidPort(value);
    } else if (key.toUpperCase() == Constants.CONFIG.SSL_KEY || key.toUpperCase() == Constants.CONFIG.SSL_CERT || key.toUpperCase() == Constants.CONFIG.INTERMEDIATE_CERT) {
      return AppUtils.isFileExists(value);
    }
  }

  getAllConfigs() {
    return FogControllerConfigManager.find()
      .then(function(configs) {
        this.fogConfigs = configs;
        return configs;
      }.bind(this));
  }
}

const instance = new FogControllerConfigUtil();
export default instance;
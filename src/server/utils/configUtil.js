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
        FogControllerConfigManager.setByKey(key, value);
        console.log('Property "' + key + '" has been updated successfully.');
      } else {
        throw 'Invalid value provided for key "' + key + '"';
      }
    } else {
      throw '"' + key + '" is not a valid property. You can set properties like port, ssl_key, ssl_cert, intermediate_cert, email, password, service';
    }
  }

  isKeyExist(configKey) {
    return _.find(Constants.CONFIG, function(value, key) {
      if (configKey.toLowerCase() == key.toLowerCase()) {
        return true;
      }
    });
  }

  validateValue(key, value) {
    if (key == Constants.CONFIG.port) {
      return AppUtils.isValidPort(value);
    }else if (key == 'service' || key == 'password'){
      return true;
    }else if (key == 'email'){
      return AppUtils.isValidEmail(value);
    }else if (key.toLowerCase() == Constants.CONFIG.ssl_key || key.toLowerCase() == Constants.CONFIG.ssl_cert || key.toLowerCase() == Constants.CONFIG.intermediate_cert) {
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
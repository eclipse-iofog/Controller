/**
 * @file sslFileController.js
 * @author Zishan Iqbal
 * @description This file includes the CRUD operarions on ssl files.
 */

import _ from 'underscore';
import AppUtils from './appUtils';
import FabricControllerConfigManager from './../managers/fabricControllerConfigManager';
import Constants from './../constants';

class FabricControllerConfigUtil {

  getConfigParam(key) {
    let configValue;

    if (!FabricControllerConfigUtil.fabricConfigs) {
      return undefined;
    } else {

      _.each(FabricControllerConfigUtil.fabricConfigs, function(config) {
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
      FabricControllerConfigManager.setByKey(key, value);
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

  getAllConfigs() {
    return FabricControllerConfigManager.find()
      .then(function(configs) {
        this.fabricConfigs = configs;
        return configs;
      }.bind(this));
  }
}

const instance = new FabricControllerConfigUtil();
export default instance;
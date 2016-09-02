/**
 * @file sslFileManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the sslFiles Model.
 */

import FabricControllerConfig from './../models/fabricControllerConfig';
import BaseManager from './../managers/baseManager';

class FabricControllerConfigManager extends BaseManager {
  getEntity() {
    return FabricControllerConfig;
  }

  getByKey(key) {
    return FabricControllerConfig.find({
      where: {
        key: key
      }
    });
  }

  setByKey(key, value) {
    this.getByKey(key).then(function(dbConfig) {
      if (dbConfig) {
        dbConfig.value = value;
        dbConfig.save();
      } else {
        this.create({
          key: key,
          value: value
        });
      }
    });
  }
}

const instance = new FabricControllerConfigManager();
export default instance;
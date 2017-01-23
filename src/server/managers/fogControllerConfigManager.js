/**
 * @file sslFileManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the sslFiles Model.
 */

import FogControllerConfig from './../models/fogControllerConfig';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';


class FogControllerConfigManager extends BaseManager {
  getEntity() {
    return FogControllerConfig;
  }

  getByKey(key) {
    return FogControllerConfig.find({
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

  list() {
    const query = 'select * from config';
    return sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
  }

  deleteConfig(key){
    if (key) {
      this.getByKey(key)
        .then(function(dbConfig) {
          if (dbConfig) {
            dbConfig.destroy();
            console.log('\nProperty "' + key + '" has been deleted successfully.');
          } else {
            console.log('\nCan not find Configuration having "' + key + '" as key');
          }
        })
    } else {
      console.log('\nKey is required');
    }
  }
}

const instance = new FogControllerConfigManager();
export default instance;
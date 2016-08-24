/**
 * @file registryManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the registry Model.
 */

import sequelize from './../utils/sequelize';
import Registry from './../models/registry';
import BaseManager from './../managers/baseManager';

class RegistryManager extends BaseManager {

  /**
   * @desc - finds the registrys based on the is_public property or where the iofabric_id
   * match with the instanceId
   * @param Integer - instanceId
   * @return JSON - returns a Array of JSON objects of registry
   */
  findByInstanceId(instanceId) {
    return Registry.findAll({
      where: {
        $or: [{
          is_public: 1
        }, {
          ID: {
            $in: [sequelize.literal('select registry_id from iofabric_registry where iofabric_id = ' + instanceId)]
          }
        }]
      }
    });
  }
}

const instance = new RegistryManager();
export default instance;
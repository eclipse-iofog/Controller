/**
 * @file registryManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the registry Model.
 */
 
import BaseManager from './../managers/baseManager';
import Registry from './../models/registry';
import sequelize from './../utils/sequelize';

class RegistryManager extends BaseManager {

 findByInstanceId(instanceId) {
    return Registry.findAll({
      where: {
          iofog_uuid: instanceId
          }
      });
  }
 }

const instance = new RegistryManager();
export default instance;
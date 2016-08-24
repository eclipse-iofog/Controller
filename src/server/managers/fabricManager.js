/**
 * @file fabricManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fabric Model.
 */

import Fabric from './../models/fabric';
import BaseManager from './../managers/baseManager';

class FabricManager extends BaseManager {
  getEntity() {
      return Fabric;
    }
  /**
   * @desc - finds the fabric based on the instanceId
   * @param Integer - instanceId
   * @return JSON - returns a JSON object of fabric
   */
  findByInstanceId(instanceId) {
    return Fabric.find({
      where: {
        id: instanceId
      }
    });
  }
  /**
   * @desc - updates the config data in the fabric with the id that matches the instanceId
   * @param Integer, JSON object - instanceId, config
   * @return Integer - returns the number of rows updated 
   */
  updateFabricConfig(instanceId, config) {
    return Fabric.update(config, {
      where: {
        id: instanceId
      }
    });
  }
}

const instance = new FabricManager();
export default instance;
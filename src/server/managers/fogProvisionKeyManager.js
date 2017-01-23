/**
 * @file fogProvisionKeyManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogProvisionKey Model.
 */
import BaseManager from './../managers/baseManager';

import Fog from './../models/fog';
import FogProvisionKey from './../models/fogProvisionKey';

class FogProvisionKeyManager extends BaseManager {

    /**
     * @desc - creates a new ProvisionKey with the param data
     * @param JSON object - newProvision
     * @return JSON object - returns the created object
     */
  createProvisionKey(newProvision) {
    return FogProvisionKey.create(newProvision);
  }

  /**
   * @desc - deletes the fog provision key based on the instanceId
   * @param String - instanceId
   * @return  Integer - returns the number of rows deleted
   */
  deleteByInstanceId(instanceId) {
    return FogProvisionKey.destroy({
      where: {
        iofog_uuid: instanceId
      }
    });
  }

  /**
     * @desc - removes the provisionKey based on the key from the database
     * @param String - key
     * @return Integer - returns the number of rows deleted
     */
  deleteByProvisionKey(key) {
      return FogProvisionKey.destroy({
        where: {
          provisionKey: key
        }
      });
    }

  getEntity() {
      return FogProvisionKey;
    }
    /**
     * @desc - finds the provisionKey based on the key parameter
     * @param String - key
     * @return JSON - returns a JSON object of fogProvisionKey including the fog it belongs to
     */
  getByProvisionKey(key) {
      return FogProvisionKey.findOne({
        where: {
          provisionKey: key
        },
        include: [Fog]
      });
    }
}

const instance = new FogProvisionKeyManager();
export default instance;
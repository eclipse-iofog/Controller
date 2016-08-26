/**
 * @file fabricProvisionKeyManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fabricProvisionKey Model.
 */

import FabricProvisionKey from './../models/fabricProvisionKey';
import Fabric from './../models/fabric';
import BaseManager from './../managers/baseManager';

class FabricProvisionKeyManager extends BaseManager {

  getEntity() {
      return FabricProvisionKey;
    }
  /**
   * @desc - finds the provisionKey based on the key parameter
   * @param String - key
   * @return JSON - returns a JSON object of fabricProvisionKey including the fabric it belongs to
   */
  getByProvisionKey(key) {
      return FabricProvisionKey.findOne({
        where: {
          provisionKey: key
        },
        include: [Fabric]
      });
    }
  /**
   * @desc - removes the provisionKey based on the key from the database
   * @param String - key
   * @return Integer - returns the number of rows deleted
   */
  deleteByProvisionKey(key) {
    return FabricProvisionKey.destroy({
      where: {
        provisionKey: key
      }
    });
  }
  /**
   * @desc - creates a new ProvisionKey with the param data
   * @param JSON object - newProvision
   * @return JSON object - returns the created object
   */
  createProvisionKey(newProvision) {
  return FabricProvisionKey.create(newProvision);
}

}

const instance = new FabricProvisionKeyManager();
export default instance;
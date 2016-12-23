/**
 * @file fabricManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fabric Model.
 */

import Fabric from './../models/fabric';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

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
          uuid: instanceId
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
          uuid: instanceId
        }
      });
    }

    /**
     * @desc - creates a new Iofabric with config data
     * @param JSON object - config
     * @return Integer - returns the number of rows created
     */
  createFabric(config) {
      return Fabric.create({
        uuid: config.uuid,
        typeKey: config.typeKey
      });
    }
    /**
     * @desc - finds all the fabrics UUID and Typkey and sends them
     * back in order of TypeKey in the form of JSON objects
     * @param - none
     * @return Array of JSON - returns an Array containing JSON objects
     */
  getFogList() {
      var fabricListQuery = "SELECT UUID, typeKey from iofabrics ORDER BY TypeKey";
      return sequelize.query(fabricListQuery, { type: sequelize.QueryTypes.SELECT });
    }
    /**
     * @desc - deletes the fabric based on the instanceId
     * @param String - instanceId
     * @return  Integer - returns the number of rows deleted
     */
  deleteByInstanceId(instanceId) {
    return Fabric.destroy({
      where: {
        uuid: instanceId
      }
    });
  }

  findByUserId(userId){
    var instanceQuery = 'SELECT i.*, t.id as typeId, t.name as typeName, t.image as typeImage, t.description as typeDescription FROM iofabrics i JOIN iofabric_type t ON (i.typeKey= t.ID)'+ 
                        'JOIN iofabric_users u ON (i.UUID = u.fabric_id) WHERE u.user_id ='+userId;

    return sequelize.query(instanceQuery, { type: sequelize.QueryTypes.SELECT });
  }
}

const instance = new FabricManager();
export default instance;
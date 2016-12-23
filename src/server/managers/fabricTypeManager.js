/**
 * @file fabricTypeManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fabricType Model.
 */

import FabricType from './../models/fabricType';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class FabricTypeManager extends BaseManager {

  getEntity() {
    return FabricType;
  }

  getFabricTypes() {
    var fabricTypeQuery = "SELECT * from iofabric_type";
    return sequelize.query(fabricTypeQuery, { type: sequelize.QueryTypes.SELECT });
  }

  findFabricTypeById(id) {
    return FabricType.findOne({
      where: {
        'ID': id
      }
    });
  }

}

const instance = new FabricTypeManager();
export default instance;
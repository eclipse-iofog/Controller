/**
 * @file fogTypeManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogType Model.
 */

import FogType from './../models/fogType';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class FogTypeManager extends BaseManager {

  getEntity() {
    return FogType;
  }

  getFogTypes() {
    let fogTypeQuery = "SELECT * from iofog_type";
    return sequelize.query(fogTypeQuery, { type: sequelize.QueryTypes.SELECT });
  }

  findFogTypeById(id) {
    return FogType.findOne({
      where: {
        'ID': id
      }
    });
  }
}

const instance = new FogTypeManager();
export default instance;
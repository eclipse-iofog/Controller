/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

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
        ID: id
      }
    });
  }

  getDirectlySelectionableFogTypes() {
    let fogTypeQuery = "SELECT * from iofog_type where DirectlySelection = 1";
    return sequelize.query(fogTypeQuery, { type: sequelize.QueryTypes.SELECT });
  }
}

const instance = new FogTypeManager();
export default instance;
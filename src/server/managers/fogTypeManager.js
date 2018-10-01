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

const FogType = require('./../models/fogType');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');

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
}

const instance = new FogTypeManager();
module.exports =  instance;
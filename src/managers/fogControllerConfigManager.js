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
 * @file sslFileManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the sslFiles Model.
 */

const models = require('./../sequelize/models');
const FogControllerConfig = models.ControllerConfig;
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');


class FogControllerConfigManager extends BaseManager {
  getEntity() {
    return FogControllerConfig;
  }

  getByKey(key) {
    return FogControllerConfig.find({
      where: {
        key: key
      }
    });
  }

  setByKey(key, value) {
    return this.getByKey(key).then((dbConfig) => {
      if (dbConfig) {
        dbConfig.value = value;
        dbConfig.save();
      } else {
        this.create({
          key: key,
          value: value
        });
      }
    });
  }

  list() {
    const query = 'select * from config';
    return sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
  }

  deleteConfig(key){
    if (key) {
      this.getByKey(key)
        .then(function(dbConfig) {
          if (dbConfig) {
            dbConfig.destroy();
            console.log('\n"' + key + '" has been deleted successfully.');
          } else {
            console.log('\nCan not find Configuration having "' + key + '" as key');
          }
        })
    } else {
      console.log('\nKey is required');
    }
  }
}

const instance = new FogControllerConfigManager();
module.exports =  instance;
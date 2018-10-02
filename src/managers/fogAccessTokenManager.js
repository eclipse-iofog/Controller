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
 * @file fogAccessTokenManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogAccessToken Model.
 */

const FogAccessToken = require('./../sequelize/models/fogAccessToken');
const BaseManager = require('./../managers/baseManager');

class FogAccessTokenManager extends BaseManager {
  getEntity() {
      return FogAccessToken;
    }
  /**
   * @desc - finds the fogAccessToken based on the token
   * @param String - token
   * @return JSON - returns a JSON object of fogAccessToken
   */
  getByToken(token) {
      return FogAccessToken.find({
        where: {
          token: token
        }
      });
    }

  getByTokenAndFogId(token, fogId) {
      return FogAccessToken.find({
        where: {
          token: token,
          iofog_uuid: fogId
        }
      });
    }
  /**
   * @desc - deletes the fogAccessToken based on the userId
   * @param Integer - userId
   * @return Integer -  returns the number of rows deleted
   */
  deleteByFogId(fogId) {
      return FogAccessToken.destroy({
        where: {
          iofog_uuid: fogId
        }
      });
    }
  /**
   * @desc - creates a new fogAccessToken from the incoming parameters
   * @param Integer, Integer, String  - userId, expiryTokenTime, token
   * @return Integer - returns the number of rows inserted
   */
  saveUserToken(config) {
    return FogAccessToken.create(config);
  }
}

const instance = new FogAccessTokenManager();
module.exports =  instance;
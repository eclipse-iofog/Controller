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

const AppHelper = require('../helpers/app-helper');
const FogAccessTokenManager = require('../sequelize/managers/iofog-access-token-manager');

const Config = require('../config');

const generateAccessToken = async function (transaction) {
  while (true) {
    const newAccessToken = AppHelper.generateRandomString(16);
    const exists = await FogAccessTokenManager.findOne({
      token: newAccessToken
    }, transaction);
    if (!exists) {
      const accessTokenExpiryTime = Date.now() + Config.get('Settings:FogTokenExpirationIntervalSeconds') * 1000;
      return {
        token: newAccessToken,
        expirationTime: accessTokenExpiryTime
      }
    }
  }
};

async function updateAccessToken(fogUuid, newAccessToken, transaction) {
  return FogAccessTokenManager.updateOrCreate({
    iofogUuid: fogUuid
  }, {
    iofogUuid: fogUuid,
    token: newAccessToken.token,
    expirationTime: newAccessToken.expirationTime
  }, transaction);
}

module.exports = {
  generateAccessToken: generateAccessToken,
  updateAccessToken: updateAccessToken
};
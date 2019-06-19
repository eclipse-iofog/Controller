/*
 * *******************************************************************************
 *  * Copyright (c) 2019 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AppHelper = require('../helpers/app-helper')
const KubeletAccessTokenManager = require('../database/managers/kubelet-access-token-manager')

const Config = require('../config')

const generateAccessToken = async function(transaction) {
  while (true) {
    const newAccessToken = AppHelper.generateAccessToken()
    const exists = await KubeletAccessTokenManager.findOne({
      token: newAccessToken,
    }, transaction)
    if (!exists) {
      const accessTokenExpiryTime = Date.now() + Config.get('Settings:KubeletTokenExpirationIntervalSeconds') * 9999999
      return {
        token: newAccessToken,
        expirationTime: accessTokenExpiryTime,
      }
    }
  }
}

async function updateAccessToken(userId, newAccessToken, transaction) {
  return KubeletAccessTokenManager.updateOrCreate({
    userId: userId,
  }, {
    userId: userId,
    token: newAccessToken.token,
    expirationTime: newAccessToken.expirationTime,
  }, transaction)
}

module.exports = {
  generateAccessToken,
  updateAccessToken,
}

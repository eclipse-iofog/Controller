/*
 *  *******************************************************************************
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

const BaseManager = require('./base-manager');
const models = require('./../models');
const AccessToken = models.AccessToken;

class accessTokenManager extends BaseManager {

  getEntity() {
    return AccessToken;
  }

  createAccessToken(accessToken) {
    return AccessToken.create(accessToken);
  };

  updateExpirationTime(id, newTime) {
    return AccessToken.update({
      expirationTime: newTime
    }, {
      where: {
        id: id
      }
    })
  }
}

const instance = new accessTokenManager();
module.exports = instance;
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
const KubeletAccessToken = models.KubeletAccessToken;

class KubeletAccessTokenManager extends BaseManager {
  getEntity() {
    return KubeletAccessToken
  }

  // no transaction required here, used by auth decorator
  updateExpirationTime(id, newTime) {
    return KubeletAccessToken.update({
      expirationTime: newTime
    }, {
      where: {
        id: id
      }
    })
  }
}

const instance = new KubeletAccessTokenManager();
module.exports = instance;
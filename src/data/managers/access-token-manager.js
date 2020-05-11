/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseManager = require('./base-manager')
const models = require('../models')
const AccessToken = models.AccessToken

class AccessTokenManager extends BaseManager {
  getEntity () {
    return AccessToken
  }

  // no transaction required here, used by auth decorator
  updateExpirationTime (id, newTime) {
    return AccessToken.update({
      expirationTime: newTime
    }, {
      where: {
        id: id
      }
    })
  }
}

const instance = new AccessTokenManager()
module.exports = instance

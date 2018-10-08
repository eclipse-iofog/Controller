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

const BaseManager = require('./base-manager');
const models = require('./../models');
const User = models.User;
const AccessToken = models.AccessToken;

class UserManager extends BaseManager {
  getEntity() {
    return User;
  }

  async addUser(userData) {
    return User.create(userData);
  }

  async validateUserByEmail(email) {
    return User.find({
      where: {
        email: email
      }
    });
  }

  findByAccessToken(token) {
    return User.find({
      include: [{
        model: AccessToken,
        as: 'accessToken',
        where: {
          token: token
        }
      }]
    });
  }

  findByEmail(email) {
    return User.find({
      where: {
        email: email
      }
    });
  }

}

const instance = new UserManager();
module.exports = instance;
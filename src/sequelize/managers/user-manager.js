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
const AppHelper = require('../../helpers/app-helper');
const Flow = models.Flow;
const Fog = models.Fog;
const CatalogItem = models.CatalogItem;

class UserManager extends BaseManager {
  getEntity() {
    return User;
  }

  findByAccessToken(token, transaction) {
    AppHelper.checkTransaction(transaction);

    return User.find({
      include: [{
        model: AccessToken,
        as: 'accessToken',
        where: {
          token: token
        }
      }],
    }, {
      transaction: transaction
    });
  }

  findByEmail(email) {
    return User.find({
      where: {
        email: email
      }
    });
  }

  // no transaction required here, used by auth decorator
  checkAuthentication(token) {
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

  // no transaction required here, used by cli decorator
  findById(id) {
    return User.find({where: {id: id}});
  }

  updateDetails(user, updateObject, transaction) {
    return this.update({
      id: user.id
    }, updateObject, transaction);
  }

  updatePassword(userId, newPassword, transaction) {
    return this.update({
      id: userId
    }, {
      password: newPassword
    }, transaction)
  }

  updateTempPassword(userId, tempPassword, transaction) {
    return this.update({
      id: userId
    }, {
      tempPassword: tempPassword
    }, transaction)
  }

// no transaction required here, used by cli decorator
  findById(id) {
    return User.find({where: {id: id}});
  }

  findUserForMicroservice(where, transaction) {
    return User.findOne({
      include: [
        {
          model: CatalogItem,
          as: 'catalogItem',
          required: true,
          attributes: ['id']
        },
        {
          model: Flow,
          as: 'flow',
          required: true,
          attributes: ['id']
        },
        {
          model: Fog,
          as: 'fog',
          required: false,
          attributes: ['uuid']
        }
      ],
      where: where,
      attributes: ['id']
    }, {transaction: transaction})
  }
}

const instance = new UserManager();
module.exports = instance;
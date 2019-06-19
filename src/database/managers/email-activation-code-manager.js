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

const models = require('../models')
const EmailActivationCode = models.EmailActivationCode
const BaseManager = require('./base-manager')
const AppHelper = require('../../helpers/app-helper')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

class EmailActivationCodeManager extends BaseManager {
  getEntity() {
    return EmailActivationCode
  }

  async getByActivationCode(activationCode, transaction) {
    AppHelper.checkTransaction(transaction)

    return EmailActivationCode.findOne({
      where: {
        activationCode: activationCode,
      },
    }, {
      transaction: transaction,
    })
  };

  async createActivationCode(userId, activationCode, expirationTime, transaction) {
    AppHelper.checkTransaction(transaction)

    return EmailActivationCode.create({
      userId: userId,
      activationCode: activationCode,
      expirationTime: expirationTime,
    }, {
      transaction: transaction,
    })
  };

  async verifyActivationCode(activationCode, transaction) {
    return EmailActivationCode.findOne({
      where: {
        activationCode: activationCode,
        expirationTime: {
          [Op.gt]: new Date().getTime(),
        },
      },
    }, {
      transaction: transaction,
    })
  }
}

const instance = new EmailActivationCodeManager()
module.exports = instance

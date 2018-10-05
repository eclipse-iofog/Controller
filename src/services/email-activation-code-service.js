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

const async = require('async');
const logger = require('../logger');

const EmailActivationCodeManager = require('../sequelize/managers/email-activation-code-manager');
const AppHelper = require('../helpers/app-helper');

const generateActivationCode = async function () {
  while (true) {
    const newActivationCode = AppHelper.generateRandomString(16);
    const exists = await findEmailActivationCode(newActivationCode);
    if (!exists) {
      const activationCodeExpiryTime = new Date().getTime() + ((60 * 60 * 24 * 3) * 1000);
      return {
        activationCode: newActivationCode,
        expirationTime: activationCodeExpiryTime
      }
    }
  }
};

const findEmailActivationCode = async function (activationCode) {
  return await EmailActivationCodeManager.getByActivationCode(activationCode);
};

const saveActivationCode = async function (userId, activationCodeData) {
  const activationCode = activationCodeData.activationCode;
  const expirationTime = activationCodeData.expirationTime;

  try {
    return await EmailActivationCodeManager.createActivationCode(userId, activationCode, expirationTime);
  } catch (errMsg) {
    throw new Error('Unable to create activation code');
  }
};


module.exports = {
  generateActivationCode: generateActivationCode,
  saveActivationCode: saveActivationCode
};
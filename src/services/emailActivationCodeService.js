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

const EmailActivationCodeManager = require('../managers/emailActivationCodeManager');
const AppUtils = require('../utils/appUtils');

const generateActivationCode = async function () {
  while(true) {
    let newActivationCode = AppUtils.generateRandomString(16);
    let exists = await findEmailActivationCode(newActivationCode);
    if (!exists) {
      let activationCodeExpiryTime = new Date().getTime() + ((60 * 60 * 24 * 3) * 1000);
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

const verifyActivationCode = function (props, params, callback) {
  let activationCode = AppUtils.getProperty(params, props.activationCode);

  EmailActivationCodeManager
    .verifyActivationCode(activationCode)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Invalid activation code', callback));
}

const saveActivationCode = async function (userId, activationCodeData) {
    let activationCode = activationCodeData.activationCode;
    let expirationTime = activationCodeData.expirationTime;

    try {
      return await EmailActivationCodeManager.createActivationCode(userId, activationCode, expirationTime);
    } catch(errMsg) {
      throw 'Error: Unable to create activation code'
    }
};


module.exports = {
  generateActivationCode: generateActivationCode,
  saveActivationCode: saveActivationCode,
  findEmailActivationCode: findEmailActivationCode,
  verifyActivationCode: verifyActivationCode
}
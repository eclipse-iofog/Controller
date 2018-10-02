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

const generateActivationCode = function(params, callback) {
  let safeCode = false;

  async.whilst(
    function() {
      return !(safeCode);
    },
    function(cb) { 
      params.newActivationCode = AppUtils.generateRandomString(16);

      let activationCodeProps = {
        activationCode: 'newActivationCode',
        setProperty: 'emailActivationCode'
      };

      async.waterfall([
        async.apply(findEmailActivationCode, activationCodeProps, params)

      ], function(err, result) {
          if(!params.emailActivationCode){
            safeCode = true;
          }
          cb(null, safeCode);
      });
    },
    function(err, activationCode) { // CALLBACK
      let activationCodeExpiryTime = new Date().getTime() + ((60 * 60 * 24 * 3) * 1000);
      let activationCodeData = {
        activationCode: params.newActivationCode,
        expirationTime: activationCodeExpiryTime
      };

      params.activationCodeData = activationCodeData;
      callback(null, params);
    }
  );
}

const findEmailActivationCode = function(props, params, callback){
  let activationCode = AppUtils.getProperty(params, props.activationCode);

  EmailActivationCodeManager
    .getByActivationCode(activationCode)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const verifyActivationCode = function(props, params, callback){
  let activationCode = AppUtils.getProperty(params, props.activationCode);

  EmailActivationCodeManager
    .verifyActivationCode(activationCode)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Invalid activation code', callback));
}

const saveActivationCode = function(props, params, callback){
  let userId = AppUtils.getProperty(params, props.userId),
  activationCode = AppUtils.getProperty(params, props.activationCode),
  expirationTime = AppUtils.getProperty(params, props.expirationTime);

  EmailActivationCodeManager
    .createActivationCode(userId, activationCode, expirationTime)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Error: Unable to create activation code', callback));
}


module.exports =  {
	generateActivationCode: generateActivationCode,
	saveActivationCode: saveActivationCode,
	findEmailActivationCode: findEmailActivationCode,
	verifyActivationCode: verifyActivationCode
}
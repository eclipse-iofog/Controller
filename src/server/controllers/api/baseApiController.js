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

/**
* @file baseApiController.js
* @author Zishan Iqbal
* @description This file includes the Middle-ware functions.
*/
const async = require('async');

const FogService = require('../../services/fogService');
const FogAccessTokenService = require('../../services/fogAccessTokenService');
const FogUserService = require('../../services/fogUserService');
const AppUtils = require('../../utils/appUtils');
const ErrorUtils = require('./../../utils/errorUtils');

const get = (req, res, manager) => {
  const id = req.params.id;
  let promise = null;
  let resultCount = 0;
  const offset = parseInt(req.query.offset || 0);
  const limit = parseInt(req.query.limit || 15);

  if(null == id){
    promise = manager.count()
    .then((count) => {
      resultCount = count;
      return manager.find({offset: offset, limit: limit});
    });
  }
  else
    promise = manager.findById(id);

  promise
  .then((result) => {
    const response = null == id ? {offset: offset, count: limit, totalCount: resultCount, list: result} : result;
    res.send(response);
  })
  .catch((error) => {
    return ErrorUtils.caughtError(res, error);
  });
};

const checkUserExistance = (req, res, next) => {
  let params = {},

    instanceProps = {
      token: 'bodyParams.Token',
      fogId: 'bodyParams.ID',
      setProperty: 'fogAccessToken'
    },

    tokenProps = {
      expirationTime: 'fogAccessToken.expirationTime'
    },
    fogProps = {
      fogId: 'bodyParams.ID'
    },
    fogUserProps = {
      instanceId: 'bodyParams.ID',
      userId: 'fogAccessToken.userId'
    };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(FogAccessTokenService.findFogAccessTokenByTokenAndFogId, instanceProps, params),
    async.apply(FogAccessTokenService.checkFogTokenExpirationByToken, tokenProps),
    async.apply(FogService.getFogInstance, fogProps),
    async.apply(FogUserService.findFogUserByInstanceIdAndUserId, fogUserProps),

  ], function(err, result) {
    if (!err){
      next();
    }
    else {
    AppUtils.sendResponse(res, err, 'Error:', result, result);
    }
  })
}

const checkfogExistance = (req, res, next) => {
  let params = {},

    instanceProps = {
      fogId: 'bodyParams.instanceId'
    };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(FogService.getFogInstance, instanceProps, params),

  ], function(err, result) {
    if (!err){
      next();
    }
    else {
    AppUtils.sendResponse(res, err, 'Error:', result, result);
    }
  })
}

module.exports =  {
  get: get,
  checkUserExistance: checkUserExistance,
  checkfogExistance : checkfogExistance 
}
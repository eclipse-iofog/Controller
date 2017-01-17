/**
* @file baseApiController.js
* @author Zishan Iqbal
* @description This file includes the Middle-ware functions.
*/
import async from 'async';

import FabricService from '../../services/fabricService';
import FabricAccessTokenService from '../../services/fabricAccessTokenService';
import FabricUserService from '../../services/fabricUserService';
import AppUtils from '../../utils/appUtils';
import ErrorUtils from './../../utils/errorUtils';

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
  var params = {},

    instanceProps = {
      token: 'bodyParams.Token',
      setProperty: 'fogAccessToken'
    },

    tokenProps = {
      expirationTime: 'fogAccessToken.expirationTime'
    },

    fogUserProps = {
      instanceId: 'bodyParams.ID',
      userId: 'fogAccessToken.userId'
    };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(FabricAccessTokenService.findFogAccessTokenByToken, instanceProps, params),
    async.apply(FabricAccessTokenService.checkFogTokenExpirationByToken, tokenProps),
    async.apply(FabricUserService.findFogUserByInstanceIdAndUserId, fogUserProps),

  ], function(err, result) {
    if (!err){
      next();
    }
    else {
    AppUtils.sendResponse(res, err, 'Error:', result, result);
    }
  })
}

const checkfabricExistance = (req, res, next) => {
  var params = {},

    instanceProps = {
      fogId: 'bodyParams.instanceId'
    };

  params.bodyParams = req.params;

  async.waterfall([
    async.apply(FabricService.getFogInstance, instanceProps, params),

  ], function(err, result) {
    if (!err){
      next();
    }
    else {
    AppUtils.sendResponse(res, err, 'Error:', result, result);
    }
  })
}

export default {
  get: get,
  checkUserExistance: checkUserExistance,
  checkfabricExistance : checkfabricExistance 
}
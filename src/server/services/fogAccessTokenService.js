import async from 'async';

import FogAccessTokenManager from '../managers/fogAccessTokenManager';
import UserService from './userService'
import AppUtils from '../utils/appUtils';
import Constants from '../constants.js';

const checkFogTokenExpirationByToken = function(props, params, callback) {
  var time =  new Date(),
   expirationTime = AppUtils.getProperty(params, props.expirationTime);

  if(expirationTime > time){
      callback(null, params);
  }
  else{
    callback('Error', 'AccessToken is Expired');
  }
}

const findFogAccessTokenByTokenAndFogId = function(props, params, callback) {
  var token = AppUtils.getProperty(params, props.token),
  fogId = AppUtils.getProperty(params, props.fogId);

  FogAccessTokenManager
    .getByTokenAndFogId(token, fogId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Fog Access Token', callback));
}

const findFogAccessTokenByToken = function(props, params, callback) {
  var token = AppUtils.getProperty(params, props.token);

  FogAccessTokenManager
    .getByToken(token)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Fog Access Token', callback));
}

const deleteFogAccessTokenByFogId = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FogAccessTokenManager
    .deleteByFogId(fogId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const generateAccessToken = function(params, callback) {
  var safeToken = false;

  async.whilst(
    function() {
      return !(safeToken);
    },
    function(cb) { 
      params.accessToken = AppUtils.generateAccessToken();

      var userProps = {
        userId: 'accessToken',
        setProperty: 'userAccessTokenData'
      },
      accessTokenProps = {
        token: 'accessToken',
        setProperty: 'fogAccessToken'
      };

      async.waterfall([
        async.apply(UserService.getUserOptional, userProps, params),
        async.apply(findFogAccessTokenByToken, accessTokenProps)

      ], function(err, result) {
          if(!params.userAccessTokenData && !params.fogAccessToken){
            safeToken = true;
          }
          cb(null, safeToken);
      });
    },
    function(err, token) { // CALLBACK
      var tokenExpiryTime = new Date().getTime() +  (Constants.ACCESS_TOKEN_EXPIRE_PERIOD * 1000);

      var tokenData = {
        accessToken: params.accessToken,
        expirationTime: tokenExpiryTime
      };

      params.tokenData = tokenData;
      callback(null, params);
    }
  );
}

const saveFogAccessToken = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      fogId = AppUtils.getProperty(params, props.fogId),
      expirationTime = AppUtils.getProperty(params, props.expirationTime),
      accessToken = AppUtils.getProperty(params, props.accessToken);

  var config = {
    userId: userId,
    expirationTime: expirationTime,
    token: accessToken,
    iofog_uuid: fogId 
  };

  FogAccessTokenManager
    .saveUserToken(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fog Access Token', callback));
}

export default {
  checkFogTokenExpirationByToken: checkFogTokenExpirationByToken,
  findFogAccessTokenByToken: findFogAccessTokenByToken,
  findFogAccessTokenByTokenAndFogId: findFogAccessTokenByTokenAndFogId,
  deleteFogAccessTokenByFogId: deleteFogAccessTokenByFogId,
  generateAccessToken: generateAccessToken,
  saveFogAccessToken: saveFogAccessToken
};
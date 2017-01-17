import FabricAccessTokenManager from '../managers/fabricAccessTokenManager';
import AppUtils from '../utils/appUtils';
import Constants from '../constants.js';

const findFogAccessTokenByToken = function(props, params, callback) {
  var token = AppUtils.getProperty(params, props.token);

  FabricAccessTokenManager
    .getByToken(token)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Fog Access Token', callback));
}

const deleteFabricAccessTokenByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  FabricAccessTokenManager
    .deleteByUserId(userId)
    .then(AppUtils.onDeleteOptional.bind(null, params, 'Unable to delete Fog Access Token', callback));
}

const generateFogAccessToken = function(params, callback) {
  var accessToken = AppUtils.generateAccessToken(),
	  tokenExpiryTime = new Date();
  
  tokenExpiryTime.setDate(tokenExpiryTime.getDate() + Constants.ACCESS_TOKEN_EXPIRE_PERIOD);

  var tokenData = {
	accessToken: accessToken,
	expirationTime: tokenExpiryTime
  };

 params.tokenData = tokenData;

 callback(null, params);
}

const saveFogAccessToken = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId),
      expirationTime = AppUtils.getProperty(params, props.expirationTime),
      accessToken = AppUtils.getProperty(params, props.accessToken);

  var config = {
    userId: userId,
    expirationTime: expirationTime,
    accessToken: accessToken
  };

  FabricAccessTokenManager
    .saveUserToken(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fog Access Token', callback));
}

export default {
  findFogAccessTokenByToken: findFogAccessTokenByToken,
  deleteFabricAccessTokenByUserId: deleteFabricAccessTokenByUserId,
  generateFogAccessToken: generateFogAccessToken,
  saveFogAccessToken: saveFogAccessToken
};
import FogAccessTokenManager from '../managers/fogAccessTokenManager';
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

const deleteFogAccessTokenByFogId = function(props, params, callback) {
  var fogId = AppUtils.getProperty(params, props.fogId);

  FogAccessTokenManager
    .deleteByFogId(fogId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const generateFogAccessToken = function(params, callback) {
  var accessToken = AppUtils.generateAccessToken(),
	  tokenExpiryTime = new Date().getTime() +  (Constants.ACCESS_TOKEN_EXPIRE_PERIOD * 1000);
    
  var tokenData = {
	 accessToken: accessToken,
	 expirationTime: tokenExpiryTime
  };

 params.tokenData = tokenData;

 callback(null, params);
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
  findFogAccessTokenByTokenAndFogId: findFogAccessTokenByTokenAndFogId,
  deleteFogAccessTokenByFogId: deleteFogAccessTokenByFogId,
  generateFogAccessToken: generateFogAccessToken,
  saveFogAccessToken: saveFogAccessToken
};
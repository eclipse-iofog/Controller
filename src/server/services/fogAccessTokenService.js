import FogAccessTokenManager from '../managers/fogAccessTokenManager';
import AppUtils from '../utils/appUtils';
import Constants from '../constants.js';


const checkFogTokenExpirationByToken = function(props, params, callback) {
  var time =  new Date().getTime(),
   expirationTime = AppUtils.getProperty(params, props.expirationTime);

  if(expirationTime > time){
      callback(null, params);
  }
  else{
    callback('Error', 'AccessToken is Expired');
  }
}

const findFogAccessTokenByToken = function(props, params, callback) {
  var token = AppUtils.getProperty(params, props.token);

  FogAccessTokenManager
    .getByToken(token)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find Fog Access Token', callback));
}

const deleteFogAccessTokenByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  FogAccessTokenManager
    .deleteByUserId(userId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
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

  FogAccessTokenManager
    .saveUserToken(config)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Fog Access Token', callback));
}

export default {
  checkFogTokenExpirationByToken: checkFogTokenExpirationByToken,
  findFogAccessTokenByToken: findFogAccessTokenByToken,
  deleteFogAccessTokenByUserId: deleteFogAccessTokenByUserId,
  generateFogAccessToken: generateFogAccessToken,
  saveFogAccessToken: saveFogAccessToken
};
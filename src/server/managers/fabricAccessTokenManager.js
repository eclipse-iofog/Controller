/**
* @file fabricAccessTokenManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabricAccessToken Model.
*/

import FabricAccessToken from './../models/fabricAccessToken';
import BaseManager from './../managers/baseManager';

class FabricAccessTokenManager extends BaseManager {
  getEntity() {
    return FabricAccessToken;
  }

  getByToken(token) {
  	return FabricAccessToken.find({
  		where: {token : token}
  	});
  }

 deleteByUserId(userId){
  	return FabricAccessToken.destroy({
  		where: {userId : userId}
  	});
  }

 saveUserToken(userId,expiryTokenTime,token){
 	return FabricAccessToken.create({
  		userId: userId,
  		expirationTime: expiryTokenTime,
  		token: token
  	});
 }
}

const instance = new FabricAccessTokenManager();
export default instance;
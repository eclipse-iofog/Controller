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
  /**
   * @desc - finds the fabricAccessToken based on the token
   * @param String - token
   * @return JSON - returns a JSON object of fabricAccessToken
   */
  getByToken(token) {
      return FabricAccessToken.find({
        where: {
          token: token
        }
      });
    }
  /**
   * @desc - deletes the fabricAccessToken based on the userId
   * @param Integer - userId
   * @return Integer -  returns the number of rows deleted
   */
  deleteByUserId(userId) {
      return FabricAccessToken.destroy({
        where: {
          userId: userId
        }
      });
    }
  /**
   * @desc - creates a new fabricAccessToken from the incoming parameters
   * @param Integer, Integer, String  - userId, expiryTokenTime, token
   * @return Integer - returns the number of rows inserted
   */
  saveUserToken(userId, expiryTokenTime, token) {
    return FabricAccessToken.create({
      userId: userId,
      expirationTime: expiryTokenTime,
      token: token
    });
  }
}

const instance = new FabricAccessTokenManager();
export default instance;
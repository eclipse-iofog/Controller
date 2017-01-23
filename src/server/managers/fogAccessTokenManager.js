/**
 * @file fogAccessTokenManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogAccessToken Model.
 */

import FogAccessToken from './../models/fogAccessToken';
import BaseManager from './../managers/baseManager';

class FogAccessTokenManager extends BaseManager {
  getEntity() {
      return FogAccessToken;
    }
  /**
   * @desc - finds the fogAccessToken based on the token
   * @param String - token
   * @return JSON - returns a JSON object of fogAccessToken
   */
  getByToken(token) {
      return FogAccessToken.find({
        where: {
          token: token
        }
      });
    }
  /**
   * @desc - deletes the fogAccessToken based on the userId
   * @param Integer - userId
   * @return Integer -  returns the number of rows deleted
   */
  deleteByUserId(userId) {
      return FogAccessToken.destroy({
        where: {
          userId: userId
        }
      });
    }
  /**
   * @desc - creates a new fogAccessToken from the incoming parameters
   * @param Integer, Integer, String  - userId, expiryTokenTime, token
   * @return Integer - returns the number of rows inserted
   */
  saveUserToken(config) {
    return FogAccessToken.create({
      userId: config.userId,
      expirationTime: config.expirationTime,
      token: config.accessToken
    });
  }
}

const instance = new FogAccessTokenManager();
export default instance;
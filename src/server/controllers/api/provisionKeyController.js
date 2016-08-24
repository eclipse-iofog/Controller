/**
 * @file provisionKeyController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-provision key end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import FabricAccessTokenManager from '../../managers/fabricAccessTokenManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import FabricUserManager from '../../managers/fabricUserManager';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType', (req, res) => {

  var provisionKey = req.params.provisionKey,
    fabricType = req.params.fabricType;
  /**
   * @desc - async.waterfall control flow, sequential calling of an Array of functions.
   * @param Array - [getFabricProcisionKey, getFabric, getFabricUser, generateAccessToken, saveUserToken]
   * @return - returns an appropriate response to the client
   */
  async.waterfall([
    async.apply(getFabricProvisionKey, provisionKey, fabricType),
    getFabric,
    getFabricUser,
    generateAccessToken,
    saveUserToken
  ], function(err, result) {
    res.status(200);
    if (err) {
      deleteKey(provisionKey);
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      deleteKey(provisionKey);
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'id': result.id,
        'token': result.token
      });
    }
  });
});
/**
 * @desc - if the provision key exists in the database forwards to getFabric function
 * @param - provisionKey, fabricType, callback
 * @return - none
 */
function getFabricProvisionKey(provisionKey, fabricType, callback) {
  FabricProvisionKeyManager.getByProvisionKey(provisionKey)
    .then((fabricKey) => {
        if (fabricKey) callback(null, fabricType, fabricKey);
        else callback('error', Constants.MSG.ERROR_INVALID_PROVISTION_KEY);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}
/**
 * @desc - if the provision key is not expired in the database finds its 
 * coresponding fabric data and forwards to getFabricUser function
 * @param - fabricType, fabricKey, callback
 * @return - none
 */
function getFabric(fabricType, fabricKey, callback) {
  var date = new Date();

  if (date < fabricKey.expirationTime) {
    FabricManager.findByInstanceId(fabricKey.iofabric_id)
      .then((fabricData) => {
        if (fabricData) callback(null, fabricType, fabricData);
        else callback('error', Constants.MSG.ERROR_FABRIC_UNKNOWN);
      }, (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
  } else {
    callback('error', Constants.MSG.ERROR_PROVISION_KEY_EXPIRED);
  }
}
/**
 * @desc - if the fabricType matches the type in the database this function
 * retrieves the data for the user who owns this fabric and forwards to 
 * generateAccessToken function.
 * @param - fabricType, fabricData, callback
 * @return - none
 */
function getFabricUser(fabricType, fabricData, callback) {

  if (fabricType == fabricData.typeKey) {
    FabricUserManager.findByInstanceId(fabricData.id)
      .then((fabricUser) => {
          if (fabricUser) callback(null, fabricUser, fabricData);
          else callback('error', Constants.MSG.ERROR_FABRIC_UNKNOWN);
        },
        (err) => {
          callback('error', Constants.MSG.SYSTEM_ERROR);
        });
  } else {
    callback('error', Constants.MSG.ERROR_FABRIC_MISMATCH);
  }
}
/**
 * @desc - this function checks if an accessToken is present for a user, if yes then
 * removes it and then calls the saveUserToken function with a new generated token as
 * a parameter.
 * @param - fabricUser, fabricData, callback
 * @return - none
 */
function generateAccessToken(fabricUser, fabricData, callback) {
  var accessToken,
    tokenExpiryTime;

  accessToken = AppUtils.generateAccessToken();
  tokenExpiryTime = new Date();
  tokenExpiryTime.setDate(tokenExpiryTime.getDate() + Constants.ACCESS_TOKEN_EXPIRE_PERIOD);

  var p1 = new Promise(
    function(resolve, reject) {
      FabricAccessTokenManager.getByToken(accessToken)
        .then((tokenData) => {
          if (tokenData && tokenData != " ") {
            accessToken = AppUtils.generateAccessToken();
          } else {
            resolve("ok");
          }
        });
    }
  );

  p1.then(
      function(val) {
        FabricAccessTokenManager.deleteByUserId(fabricUser.user_id)
          .then(function(rowDeleted) {
            callback(null, fabricUser, fabricData, tokenExpiryTime, accessToken);
          }, function(err) {
            callback('error', Constants.MSG.ERROR_ACCESS_TOKEN_GEN);
          });
      })
    .catch(
      function(reason) {

      });
}
/**
 * @desc - this function inserts a new token against a user_Id 
 * @param - fabricUser, fabricData, tokenExpiryTime, accessToken, callback
 * @return - none
 */
function saveUserToken(fabricUser, fabricData, tokenExpiryTime, accessToken, callback) {
  FabricAccessTokenManager.saveUserToken(fabricUser.user_id, tokenExpiryTime, accessToken)
    .then(function(rowInserted) {
      if (rowInserted) {
        callback(null, {
          id: fabricData.id,
          token: accessToken
        });
      } else {
        callback('error', Constants.MSG.ERROR_ACCESS_TOKEN_GEN);
      }
    }, function(err) {
      callback('error', Constants.MSG.ERROR_ACCESS_TOKEN_GEN);
    });
}
/**
 * @desc - this function deletes the provision key entry in all cases from the database
 * @param - provisionKey
 * @return - none
 */
function deleteKey(provisionKey) {
  FabricProvisionKeyManager.deleteByProvisionKey(provisionKey)
    .then(function(rowDeleted) {
      if (rowDeleted > 0) {
        console.log('Deleted successfully');
      }
    }, function(err) {
      console.log(err);
    });
}

export default router;
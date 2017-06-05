/**
 * @file provisionKeyController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-provision key end-point
 */
import async from 'async';

import BaseApiController from './baseApiController';
import FogAccessTokenService from '../../services/fogAccessTokenService';
import FogProvisionKeyService from '../../services/fogProvisionKeyService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import FogUserService from '../../services/fogUserService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/
/******* Get Provision Key EndPoint (Get: /api/v2/authoring/fabric/provisionkey/instanceid/:instanceId) ********/
 const getProvisionKeyEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},
      fogProps = {
          instanceId: 'bodyParams.instanceId',
          setProperty: 'newProvision'
      };
  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkfogExistance, req, res),
    async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, fogProps, params),
    async.apply(FogProvisionKeyService.createProvisonKeyByInstanceId, fogProps),
    FogProvisionKeyService.deleteExpiredProvisionKeys

  ],function(err, result) {
    var outputProvisionKey, outputExpirationTime, successLabelArr, successValueArr;

    if (params.newProvision)
    {
      outputProvisionKey= params.newProvision.provisionKey;
      outputExpirationTime = params.newProvision.expirationTime;
    }

    successLabelArr= ['provisionKey', 'expirationTime'],
    successValueArr= [outputProvisionKey, outputExpirationTime];
    
    AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  });
};

/** Fog Provisioning EndPoint (Get/Post: /api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType) **/
const fogProvisionKeyEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},
      provisionProps = {
        provisionKey: 'bodyParams.provisionKey',
        setProperty: 'fogProvision'
      },
      provisionKeyExpiryProps = {
        expirationTime: 'fogProvision.expirationTime'
      },
      fogProps = {
        fogId: 'fogProvision.iofog_uuid',
        setProperty: 'fogData'
      },
      fogTypeProps = {
        fogTypeId: 'bodyParams.fabricType',
        setProperty: 'fogTypeData'
      },
      fogUserProps = {
        instanceId: 'fogData.uuid',
        setProperty: 'fogUser'
      },
      saveFogAccessTokenProps = {
        userId: 'fogUser.user_id',
        fogId: 'fogProvision.iofog_uuid',
        expirationTime: 'tokenData.expirationTime',
        accessToken: 'tokenData.accessToken',
        setProperty: 'newAccessToken'
      };
  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(FogProvisionKeyService.getFogByProvisionKey, provisionProps, params),
    async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
    async.apply(FogProvisionKeyService.deleteByProvisionKey, provisionProps),
    async.apply(FogProvisionKeyService.checkProvisionKeyExpiry, provisionKeyExpiryProps),
    async.apply(FogService.getFogInstance, fogProps),
    checkFogType,
    async.apply(FogUserService.getFogUserByInstanceId, fogUserProps),
    FogAccessTokenService.generateAccessToken,
    async.apply(FogAccessTokenService.deleteFogAccessTokenByFogId, fogProps),
    async.apply(FogAccessTokenService.saveFogAccessToken,saveFogAccessTokenProps)

  ], function(err, result) {
   
   var successLabelArr,
       successValueArr;

    if (params.fogData && params.newAccessToken){
      successLabelArr= ['id', 'token'],
      successValueArr= [params.fogData.uuid, params.newAccessToken.token];
    }
    AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  })
};

const checkFogType = function(params, callback){
  if (params.bodyParams.fabricType == params.fogData.typeKey){
    callback(null, params);
  }else{
    callback('err', 'Provisioning failed - System error: Host architecture is different from selected fog instance.')
  }
}

/********* Delete Provision Key EndPoint (Post: /api/v2/authoring/fabric/provisioningkey/list/delete) *********/
const deleteProvisionKeyEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},
      instanceProps = {
        instanceId: 'bodyParams.instanceId',
        setProperty: 'provisionData'
      };
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(FogProvisionKeyService.getProvisionKeyByInstanceId, instanceProps, params),
    async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps)
  
  ], function(err, result) {
       AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, result);  
  });
};

export default {
  getProvisionKeyEndPoint: getProvisionKeyEndPoint,
  fogProvisionKeyEndPoint: fogProvisionKeyEndPoint,
  deleteProvisionKeyEndPoint: deleteProvisionKeyEndPoint
};
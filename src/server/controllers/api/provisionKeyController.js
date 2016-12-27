/**
 * @file provisionKeyController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-provision key end-point
 */
import async from 'async';
import express from 'express';
const router = express.Router();

import BaseApiController from './baseApiController';
import FabricAccessTokenService from '../../services/fabricAccessTokenService';
import FabricProvisionKeyService from '../../services/fabricProvisionKeyService';
import FabricService from '../../services/fabricService';
import FabricUserService from '../../services/fabricUserService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';

router.get('/api/v2/authoring/fabric/provisionkey/instanceid/:instanceId', BaseApiController.checkfabricExistance, (req, res) => {
  var params = {},
      createProvisionProps = {
          instanceId: 'bodyParams.instanceId',
          setProperty: 'newProvision'
      };
  params.bodyParams = req.params;

  async.waterfall([
    async.apply(FabricProvisionKeyService.createProvisonKeyByInstanceId, createProvisionProps, params)

  ],function(err, result) {
    var outputProvisionKey;

    if (params.newProvision)
    {
      outputProvisionKey= params.newProvision.provisionKey;
    }
      AppUtils.sendResponse(res, err, 'provisionKey', outputProvisionKey, result);
    });
});

router.get('/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType', (req, res) => {
  provisionFabricKey(req, res);
});

router.post('/api/v2/instance/provision/key/:provisionKey/fabrictype/:fabricType', (req, res) => {
  provisionFabricKey(req, res);
});

function provisionFabricKey(req, res) {
  var params = {},
      provisionProps = {
        provisionKey: 'bodyParams.provisionKey',
        setProperty: 'fogProvision'
      },
      provisionKeyExpiryProps = {
        expirationTime: 'fogProvision.expirationTime'
      },
      fogProps = {
        fogId: 'fogProvision.iofabric_uuid',
        setProperty: 'fogData'
      },
      fogUserProps = {
        instanceId: 'fogData.uuid',
        setProperty: 'fogUser'
      },
      deleteTokenProps = {
        userId: 'fogUser.user_id'
      },
      saveFogAccessTokenProps = {
        userId: 'fogUser.user_id',
        expirationTime: 'tokenData.expirationTime',
        accessToken: 'tokenData.accessToken',
        setProperty: 'newAccessToken'
      };
  params.bodyParams = req.params;
  
  async.waterfall([
    async.apply(FabricProvisionKeyService.getFogByProvisionKey, provisionProps, params),
    async.apply(FabricProvisionKeyService.deleteByProvisionKey, provisionProps),
    async.apply(FabricProvisionKeyService.checkProvisionKeyExpiry, provisionKeyExpiryProps),
    async.apply(FabricService.getFogInstance, fogProps),
    async.apply(FabricUserService.getFogUserByInstanceId, fogUserProps),
    FabricAccessTokenService.generateFogAccessToken,
    async.apply(FabricAccessTokenService.deleteFabricAccessTokenByUserId, deleteTokenProps),
    async.apply(FabricAccessTokenService.saveFogAccessToken,saveFogAccessTokenProps)

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

router.post('/api/v2/authoring/fabric/provisioningkey/list/delete', (req, res) => {
  var params = {},
      instanceProps = {
        instanceId: 'bodyParams.instanceId',
      };
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(FabricProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps, params)
  
  ], function(err, result) {
       AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, result);  
  });
});

export default router;
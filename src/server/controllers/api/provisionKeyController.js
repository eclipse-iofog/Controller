/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file provisionKeyController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-provision key end-point
 */
const async = require('async');

const BaseApiController = require('./baseApiController');
const FogAccessTokenService = require('../../services/fogAccessTokenService');
const FogProvisionKeyService = require('../../services/fogProvisionKeyService');
const FogService = require('../../services/fogService');
const FogTypeService = require('../../services/fogTypeService');
const FogUserService = require('../../services/fogUserService');
const ElementInstanceService = require('../../services/elementInstanceService');
const UserService = require('../../services/userService');

const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');

/********************************************* EndPoints ******************************************************/
/******* Get Provision Key EndPoint (Get: /api/v2/authoring/fog/provisionkey/instanceid/:instanceId) ********/
 const getProvisionKeyEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
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
    let outputProvisionKey, outputExpirationTime, successLabelArr, successValueArr;

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

/** Fog Provisioning EndPoint (Get/Post: /api/v2/instance/provision/key/:provisionKey/fogtype/:fogType) **/
const fogProvisionKeyEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
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
        fogTypeId: 'bodyParams.fogType',
        setProperty: 'fogTypeData'
      },
      fogTypeKeyProps = {
        instanceId: 'fogProvision.iofog_uuid',
        updatedFog: {
            typeKey: req.params.fogType
        }
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
    checkElementsForFogType,
    async.apply(FogProvisionKeyService.deleteByProvisionKey, provisionProps),
    async.apply(FogProvisionKeyService.checkProvisionKeyExpiry, provisionKeyExpiryProps),
    async.apply(FogService.getFogInstance, fogProps),
    async.apply(FogUserService.getFogUserByInstanceId, fogUserProps),
    FogAccessTokenService.generateAccessToken,
    async.apply(FogAccessTokenService.deleteFogAccessTokenByFogId, fogProps),
    async.apply(FogAccessTokenService.saveFogAccessToken,saveFogAccessTokenProps),
    async.apply(FogService.updateFogInstance, fogTypeKeyProps)
  ], function(err, result) {
   
   let successLabelArr,
       successValueArr;

    if (params.fogData && params.newAccessToken){
      successLabelArr= ['id', 'token'],
      successValueArr= [params.fogData.uuid, params.newAccessToken.token];
    }
    AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  })
};

const checkElementsForFogType = function (params, callback) {
    let checkNewTypeProps = {
        iofogUuid: 'fogProvision.iofog_uuid',
        newFogType: 'bodyParams.fogType',
        setProperty: 'fogElementInstances'
    };

    async.waterfall([
        async.apply(ElementInstanceService.getElementInstanceImagesByFogIdAndNewFogType, checkNewTypeProps, params),
        validateElementContainerImages
    ], function(err, result) {
        if (!err) {
            callback(null, params);
        } else {
            callback(err, result)
        }
    });
};

const validateElementContainerImages = function (params, callback) {
    let errorsElements = [];
    if (params.fogElementInstances) {
        params.fogElementInstances.forEach((instance) => {
            if (!instance.containerImage) {
                errorsElements.push(instance);
            }
        });
    }

    let errorMsg = 'Some of elements hasn\'t proper docker images for this fog type. ' +
        'List of elements and tracks:\n';
    errorsElements.forEach((el) => {
        errorMsg = errorMsg
            + ' "' + el.elementName + '" element instances on the'
            + ' "' + el.trackName + '" track \n';

    });

    if (errorsElements.length > 0) {
        callback('error', errorMsg)
    } else {
        callback(null, params)
    }
};

/********* Delete Provision Key EndPoint (Post: /api/v2/authoring/fog/provisioningkey/list/delete) *********/
const deleteProvisionKeyEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
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

module.exports =  {
  getProvisionKeyEndPoint: getProvisionKeyEndPoint,
  fogProvisionKeyEndPoint: fogProvisionKeyEndPoint,
  deleteProvisionKeyEndPoint: deleteProvisionKeyEndPoint
};
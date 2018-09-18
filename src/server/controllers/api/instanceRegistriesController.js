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
 * @file instanceRegistriesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-registries end-point
 */
const async = require('async');

const BaseApiController = require('./baseApiController');
const RegistryService = require('../../services/registryService');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const FogAccessTokenService = require('../../services/fogAccessTokenService');

/********************************************* EndPoints ******************************************************/

/********* Instance Registries EndPoint (Get/Post: /api/v2/instance/registries/id/:ID/token/:Token) **********/
const instanceRegistriesEndPoint = function (req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
    let params = {},
        instanceProps = {
            token: 'bodyParams.Token',
            fogId: 'bodyParams.ID',
            setProperty: 'fogAccessToken'
        },
        regProps = {
            userId: 'fogAccessToken.userId',
            setProperty: 'registry'
        };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
      async.apply(FogAccessTokenService.findFogAccessTokenByTokenAndFogId, instanceProps, params),
      async.apply(RegistryService.findRegistriesByUserId, regProps, params)
  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'registries', params.registry, result);  
  });
};

module.exports =  {
  instanceRegistriesEndPoint: instanceRegistriesEndPoint
};
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
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */
const async = require('async');

const ChangeTrackingService = require('../../services/changeTrackingService');
const ComsatService = require('../../services/comsatService');
const ConsoleService = require('../../services/consoleService');
const ElementService = require('../../services/elementService');
const ElementInstancePortService = require('../../services/elementInstancePortService');
const ElementInstanceService = require('../../services/elementInstanceService');
const FogService = require('../../services/fogService');
const FogTypeService = require('../../services/fogTypeService');
const FogUserService = require('../../services/fogUserService');
const NetworkPairingService = require('../../services/networkPairingService');
const SatelliteService = require('../../services/satelliteService');
const SatellitePortService = require('../../services/satellitePortService');
const StreamViewerService = require('../../services/streamViewerService');
const UserService = require('../../services/userService');

const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');

/**
 * @deprecated
 */


/********************************************* EndPoints ******************************************************/

/*************** Integrator Instance Create EndPoint (Post: /api/v2/authoring/integrator/instance/create     
                                                          : /api/v2/authoring/fog/instance/create) ************/
const integratorInstanceCreateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    createFogProps = {
      name: 'bodyParams.name',
      location: 'bodyParams.location',
      latitude: 'bodyParams.latitude',
      longitude: 'bodyParams.longitude',
      description: 'bodyParams.description',
      fogType: 'bodyParams.fogType',
      setProperty: 'fogInstance'
    },
    
    createFogUserProps = {
      userId: 'user.id',
      instanceId: 'fogInstance.uuid',
      setProperty: null
    },

    fogTypeProps = {
      fogTypeId: 'bodyParams.fogType',
      setProperty: 'fogType'
    },
    createChangeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      setProperty: null
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
    async.apply(FogService.createFogInstance, createFogProps),
    async.apply(ChangeTrackingService.createFogChangeTracking, createChangeTrackingProps),
    async.apply(FogUserService.createFogUser, createFogUserProps)
  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'instance', params.fogInstance, result);
  });
};

/*********** Integrator Instance Update EndPoint (Post: /api/v2/authoring/integrator/instance/update) *********/
const integratorInstanceUpdateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },

      fogInstanceProps = {
        fogId: 'bodyParams.instanceId',
        setProperty: 'fogInstance'
      };
  
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.getFogInstance, fogInstanceProps),
    updateFogInstance

  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem updating Fog instance.' + result
    AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
  });
};

/************************************* Extra Functions **************************************************/
const updateFogInstance = function(params, callback){
  let fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          name : params.bodyParams.name,
          location : params.bodyParams.location,
          latitude : params.bodyParams.latitude,
          longitude : params.bodyParams.longitude,
          description : params.bodyParams.description
        }
      };
  FogService.updateFogInstance(fogInstanceProps, params, callback);
};

module.exports =  {
  integratorInstanceCreateEndPoint: integratorInstanceCreateEndPoint,
  integratorInstanceUpdateEndPoint: integratorInstanceUpdateEndPoint
};
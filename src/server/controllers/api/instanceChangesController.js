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
 * @file instanceChangesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-changes end-point
 */

const async = require('async');

const BaseApiController = require('./baseApiController');
const ChangeTrackingService = require('../../services/changeTrackingService');
const FogService = require('../../services/fogService');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');

/********************************************* EndPoints ********************************************************/

/** Check Change Tracking Changes EndPoint (Get/Post: /api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp) **/
const getChangeTrackingChangesEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
      instanceProps = {
        instanceId: 'bodyParams.ID',
        setProperty: 'changeTrackingData'
    };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(ChangeTrackingService.getChangeTrackingByInstanceId, instanceProps, params),
    processChangeTrackingChanges,
    updateFogInstance

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'changes', params.changes, result);
  })
};

/************************************* Extra Functions **************************************************/
const processChangeTrackingChanges = function(params, callback) {
  if(params.changeTrackingData){
    if(params.bodyParams.TimeStamp.length < 1) {
      params.bodyParams.TimeStamp = 0;
    }
    let changes = {
      config: false,
      version: false,
      reboot: false,
      deletenode: false,
      containerlist: false,
      containerconfig: false,
      routing: false,
      registries: false,
      proxy: false,
      diagnostics: false,
      isimagesnapshot: false
    };

    if(params.changeTrackingData.config > params.bodyParams.TimeStamp) {
      changes.config = true;
    }

    if(params.changeTrackingData.version > params.bodyParams.TimeStamp) {
      changes.version = true;
    }

    if(params.changeTrackingData.reboot) {
      changes.reboot = true;
      async.waterfall([
              async.apply(updateChangeTracking, params)
          ],
          function (err, result) {
          });
    }

    if (params.changeTrackingData.deletenode) {
      changes.deletenode = true;
    }
    
    if(params.changeTrackingData.containerList > params.bodyParams.TimeStamp) {
      changes.containerlist = true;
    }

    if(params.changeTrackingData.containerConfig > params.bodyParams.TimeStamp) {
      changes.containerconfig = true;
    }
    
    if(params.changeTrackingData.routing > params.bodyParams.TimeStamp) {
      changes.routing = true;
    }

    if (params.changeTrackingData.registries > params.bodyParams.TimeStamp) {
      changes.registries = true;
    }

    if (params.changeTrackingData.proxy > params.bodyParams.TimeStamp) {
      changes.proxy = true;
    }

    if(params.changeTrackingData.diagnostics > params.bodyParams.TimeStamp) {
      changes.diagnostics = true;
    }

    if(params.changeTrackingData.isImageSnapshot > params.bodyParams.TimeStamp) {
      changes.isimagesnapshot = true;
    }
    params.changes = changes;
    callback (null, params);
  }else{
    callback('Error', 'Error: Cannot find changeTracking data of current iofog instance.')
  }
};

const updateChangeTracking = function (params, callback) {
    var changeTrackingProps = {
        fogInstanceId: 'bodyParams.ID',
        changeObject: {
            reboot: false
        }
    }

    ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
}

const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.ID',
        updatedFog: {
          lastactive : new Date().getTime(),
        }
      };
  FogService.updateFogInstance(fogInstanceProps, params, callback);
};

module.exports =  {
  getChangeTrackingChangesEndPoint: getChangeTrackingChangesEndPoint
};
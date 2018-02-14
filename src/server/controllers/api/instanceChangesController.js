/**
 * @file instanceChangesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-changes end-point
 */

import async from 'async';

import BaseApiController from './baseApiController';
import ChangeTrackingService from '../../services/changeTrackingService';
import FogService from '../../services/fogService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ********************************************************/

/** Check Change Tracking Changes EndPoint (Get/Post: /api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp) **/
const getChangeTrackingChangesEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},
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
    var changes = {
      config: false,
      version: false,
      reboot: false,
      containerlist: false,
      containerconfig: false,
      routing: false,
      registries: false,
      proxy: false
    };

    if(params.changeTrackingData.config > params.bodyParams.TimeStamp) {
      changes.config = true;
    }

    if(params.changeTrackingData.version > params.bodyParams.TimeStamp) {
      changes.version = true;
    }

    if(params.changeTrackingData.reboot > params.bodyParams.TimeStamp) {
      changes.reboot = true;
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
    params.changes = changes;
    callback (null, params);
  }else{
    callback('Error', 'Error: Cannot find changeTracking data of current iofog instance.')
  }
};

const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.ID',
        updatedFog: {
          lastactive : new Date().getTime(),
        }
      };
  FogService.updateFogInstance(fogInstanceProps, params, callback);
};

export default {
  getChangeTrackingChangesEndPoint: getChangeTrackingChangesEndPoint
};
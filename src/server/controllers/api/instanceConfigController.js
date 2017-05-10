/**
 * @file instanceConfigController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of instance-config and config-changes end-points
 */
import async from 'async';

import BaseApiController from './baseApiController';
import FogService from '../../services/fogService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import Constants from '../../constants.js';

/********************************************* EndPoints ******************************************************/

/********* Instance Configurations EndPoint (Get/Post: /api/v2/instance/config/id/:ID/token/:Token) **********/
const instanceConfigEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},

    fogProps = {
      fogId: 'bodyParams.ID',
      setProperty: 'fogData'
    };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(FogService.getFogInstance, fogProps, params),
    processConfigData

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'config', params.config, result);
  })
};

/***** Instance Configuration Changes EndPoint (Post: /api/v2/instance/config/changes/id/:ID/token/:Token) ******/
const instanceConfigChangesEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {};

  params.bodyParams = req.body;
  params.bodyParams.instanceId = req.params.ID;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(updateFogInstance, params)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};


/************************************* Extra Functions **************************************************/
const processConfigData = function(params, callback){
  var config = {
      networkinterface: params.fogData.networkinterface,
      dockerurl: params.fogData.dockerurl,
      disklimit: params.fogData.disklimit,
      diskdirectory: params.fogData.diskdirectory,
      memorylimit: params.fogData.memorylimit,
      cpulimit: params.fogData.cpulimit,
      loglimit: params.fogData.loglimit,
      logdirectory: params.fogData.logdirectory,
      logfilecount: params.fogData.logfilecount,
      statusfrequency: params.fogData.statusfrequency,
      changefrequency: params.fogData.changefrequency
    };

    params.config = config;
    callback (null, params);
}

const updateFogInstance = function(params, callback){

   var fogConfigProps = {
      instanceId: 'bodyParams.instanceId',
      updatedFog: {
        networkinterface: params.bodyParams.networkInterface,
        dockerurl: params.bodyParams.dockerUrl,
        disklimit: params.bodyParams.diskLimit,
        diskdirectory: params.bodyParams.diskDirectory,
        memorylimit: params.bodyParams.memoryLimit,
        cpulimit: params.bodyParams.cpuLimit,
        loglimit: params.bodyParams.logLimit,
        logdirectory: params.bodyParams.logDirectory,
        logfilecount: params.bodyParams.logFileCount,
        statusfrequency: params.bodyParams.statusFrequency,
        changefrequency: params.bodyParams.changeFrequency
      }
    };
  FogService.updateFogInstance(fogConfigProps, params, callback);
}

export default {
  instanceConfigEndPoint: instanceConfigEndPoint,
  instanceConfigChangesEndPoint: instanceConfigChangesEndPoint
};
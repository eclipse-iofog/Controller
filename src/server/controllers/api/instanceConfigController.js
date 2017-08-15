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
      disklimit: params.fogData.disklimit.toString(),
      diskdirectory: params.fogData.diskdirectory,
      memorylimit: params.fogData.memorylimit.toString(),
      cpulimit: params.fogData.cpulimit.toString(),
      loglimit: params.fogData.loglimit.toString(),
      logdirectory: params.fogData.logdirectory,
      logfilecount: params.fogData.logfilecount.toString(),
      statusfrequency: params.fogData.statusfrequency.toString(),
      changefrequency: params.fogData.changefrequency.toString()
    };

    params.config = config;
    callback (null, params);
}

const updateFogInstance = function(params, callback){

   var fogConfigProps = {
      instanceId: 'bodyParams.instanceId',
      updatedFog: {
        networkinterface: params.bodyParams.networkinterface,
        dockerurl: params.bodyParams.dockerurl,
        disklimit: params.bodyParams.disklimit,
        diskdirectory: params.bodyParams.diskdirectory,
        memorylimit: params.bodyParams.memorylimit,
        cpulimit: params.bodyParams.cpulimit,
        loglimit: params.bodyParams.loglimit,
        logdirectory: params.bodyParams.logdirectory,
        logfilecount: params.bodyParams.logfilecount,
        statusfrequency: params.bodyParams.poststatusfreq,
        changefrequency: params.bodyParams.getchangesfreq
      }
    };
  FogService.updateFogInstance(fogConfigProps, params, callback);
}

export default {
  instanceConfigEndPoint: instanceConfigEndPoint,
  instanceConfigChangesEndPoint: instanceConfigChangesEndPoint
};
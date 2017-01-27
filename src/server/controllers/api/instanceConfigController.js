/**
 * @file instanceConfigController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of instance-config and config-changes end-points
 */
import async from 'async';
import express from 'express';
const router = express.Router();
import BaseApiController from './baseApiController';

import FogService from '../../services/fogService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import Constants from '../../constants.js';

router.get('/api/v2/instance/config/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  instanceConfig (req, res);
});

router.post('/api/v2/instance/config/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  instanceConfig (req, res);
});

const instanceConfig = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {},

    fogProps = {
      fogId: 'bodyParams.ID',
      setProperty: 'fogData'
    };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(FogService.getFogInstance, fogProps, params),
    processConfigData

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'config', params.config, result);
  })
};

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
      logfilecount: params.fogData.logfilecount
    };

    params.config = config;
    callback (null, params);
}

router.post('/api/v2/instance/config/changes/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {};

  params.bodyParams = req.body;
  params.bodyParams.instanceId = req.params.ID;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));
  
  async.waterfall([
    async.apply(updateFogInstance, params)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
});

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
      logfilecount: params.bodyParams.logFileCount
      }
    };
  FogService.updateFogInstance(fogConfigProps, params, callback);
}

export default router;
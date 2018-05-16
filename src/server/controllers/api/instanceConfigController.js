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
 * @file instanceConfigController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of instance-config and config-changes end-points
 */
import async from 'async';

import BaseApiController from './baseApiController';
import FogService from '../../services/fogService';
import AppUtils from '../../utils/appUtils';
import GpsUtils from '../../utils/gpsUtils';
import logger from '../../utils/winstonLogs';
import Constants from '../../constants.js';

/********************************************* EndPoints ******************************************************/

/********* Instance Configurations EndPoint (Get/Post: /api/v2/instance/config/id/:ID/token/:Token) **********/
const instanceConfigEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

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
  let params = {};

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
  let config = {
      networkinterface: params.fogData.networkinterface,
      dockerurl: params.fogData.dockerurl,
      disklimit: params.fogData.disklimit.toString(),
      diskdirectory: params.fogData.diskdirectory,
      memorylimit: params.fogData.memorylimit.toString(),
      cpulimit: params.fogData.cpulimit.toString(),
      loglimit: params.fogData.loglimit.toString(),
      logdirectory: params.fogData.logdirectory,
      logfilecount: params.fogData.logfilecount.toString(),
      poststatusfreq: params.fogData.statusfrequency.toString(),
      getchangesfreq: params.fogData.changefrequency.toString(),
      scandevicesfreq: params.fogData.scanfrequency.toString(),
      isolateddockercontainer: params.fogData.isolateddockercontainer === 1 ? 'on' : 'off',
      gpscoordinates: params.fogData.latitude + ',' + params.fogData.longitude
    };

    params.config = config;
    callback (null, params);
};

const updateFogInstance = function(params, callback){

   let fogConfigProps = {
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
        changefrequency: params.bodyParams.getchangesfreq,
        scanfrequency: params.bodyParams.scandevicesfreq,
        isolatedDockerContainer: params.bodyParams.isolateddockercontainer,
        gpsmode: params.bodyParams.gpsmode,
        latitude: GpsUtils.getGpsCoordinates(params.bodyParams.gpscoordinates).lat,
        longitude: GpsUtils.getGpsCoordinates(params.bodyParams.gpscoordinates).lon,
      }
    };
  FogService.updateFogInstance(fogConfigProps, params, callback);
};

export default {
  instanceConfigEndPoint: instanceConfigEndPoint,
  instanceConfigChangesEndPoint: instanceConfigChangesEndPoint
};
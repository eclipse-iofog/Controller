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
 * @file instanceStatusController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-status end-point
 */
const async = require('async');

const BaseApiController = require('./baseApiController');
const FogService = require('../../services/fogService');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const ElemetInstanceStatusService = require('../../services/elementInstanceStatusService');


/********************************************* EndPoints ******************************************************/

/*************** Instance Status EndPoint (Post: /api/v2/instance/status/id/:ID/token/:Token) *****************/
  const instanceStatusEndPoint = function(req, res){

  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {};

  params.bodyParams = req.body;
  params.bodyParams.instanceId = req.params.ID;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
      async.apply(upsertStatus, params),
      updateFogInstance,
  ], function(err, result) {
    AppUtils.sendResponse(res, err,'','', result);
  })
};

/*********************************** Extra Functions ***************************************************/
const upsertStatus = function (params, callback) {
    let statusObjArr = JSON.parse(params.bodyParams.elementstatus);
    async.each(statusObjArr, function (statusObj, callback) {
        ElemetInstanceStatusService.upsertStatus(statusObj, params, callback);
    }, function (err, result) {
        callback(null, params);
    });
};

const updateFogInstance = function(params, callback){

  let fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          daemonstatus: params.bodyParams.daemonstatus,
          daemonoperatingduration : params.bodyParams.daemonoperatingduration,
          daemonlaststart : params.bodyParams.daemonlaststart,
          memoryusage : params.bodyParams.memoryusage,
          diskusage : params.bodyParams.diskusage,
          cpuusage : params.bodyParams.cpuusage,
          memoryviolation : params.bodyParams.memoryviolation,
          diskviolation: params.bodyParams.diskviolation,
          cpuviolation : params.bodyParams.cpuviolation,
          elementstatus: params.bodyParams.elementstatus,
          repositorycount : params.bodyParams.repositorycount,
          repositorystatus : params.bodyParams.repositorystatus,
          systemtime : params.bodyParams.systemtime,
          laststatustime : params.bodyParams.laststatustime,
          ipaddress : params.bodyParams.ipaddress,
          processedmessages : params.bodyParams.processedmessages,
          elementmessagecounts: params.bodyParams.elementmessagecounts,
          messagespeed : params.bodyParams.messagespeed,
          lastcommandtime : params.bodyParams.lastcommandtime,
          proxy : params.bodyParams.proxystatus,
          version: params.bodyParams.version || '1.0',
          isReadyToUpgrade: params.bodyParams.isreadytoupgrade,
          isReadyToRollback: params.bodyParams.isreadytorollback
        }
      };
    FogService.updateFogInstance(fogInstanceProps, params, callback);
};

module.exports {
  instanceStatusEndPoint: instanceStatusEndPoint
};
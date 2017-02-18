/**
 * @file instanceStatusController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-status end-point
 */
import async from 'async';

import BaseApiController from './baseApiController';
import FogService from '../../services/fogService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';


/********************************************* EndPoints ******************************************************/

/*************** Instance Status EndPoint (Post: /api/v2/instance/status/id/:ID/token/:Token) *****************/

  const instanceStatusEndPoint = function(req, res){

  logger.info("Endpoint hitted: "+ req.originalUrl);

  var params = {};
 
  params.bodyParams = req.body;
  params.bodyParams.instanceId = req.params.ID;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(updateFogInstance,params)

  ], function(err, result) {
    AppUtils.sendResponse(res, err,'','', result);
  })
};

/*********************************** Extra Functions ***************************************************/
const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          name : params.bodyParams.name,
          location : params.bodyParams.location,
          latitude : params.bodyParams.latitude,
          longitude : params.bodyParams.longitude,
          description : params.bodyParams.description,
          lastactive : new Date().getTime(),
          daemonstatus: params.bodyParams.daemonStatus,
          daemonoperatingduration : params.bodyParams.daemonOperatingDuration,
          daemonlaststart : params.bodyParams.daemonLastStart,
          memoryusage : params.bodyParams.memoryUsage,
          diskusage : params.bodyParams.diskUsage,
          cpuusage : params.bodyParams.cpuUsage,
          memoryviolation : params.bodyParams.memoryViolation,
          diskviolation : params.bodyParams.diskViolation, 
          cpuviolation : params.bodyParams.cpuViolation,
          elementstatus : params.bodyParams.elementStatus, 
          repositorycount : params.bodyParams.repositoryCount,
          repositorystatus : params.bodyParams.repositoryStatus,
          systemtime : params.bodyParams.systemTime,
          laststatustime : params.bodyParams.lastStatusTime,
          ipaddress : params.bodyParams.ipAddress,
          processedmessages : params.bodyParams.processedMessages,
          elementmessagecounts : params.bodyParams.elementMessageCounts, 
          messagespeed : params.bodyParams.messageSpeed,
          lastcommandtime : params.bodyParams.lastCommandTime,
          version: params.bodyParams.version || '1.0'
        }
      };
    FogService.updateFogInstance(fogInstanceProps, params, callback);
}

export default {
  instanceStatusEndPoint: instanceStatusEndPoint
};
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

  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {};
 
  params.bodyParams = req.body;
  params.bodyParams.instanceId = req.params.ID;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(updateFogInstance, params)

  ], function(err, result) {
    AppUtils.sendResponse(res, err,'','', result);
  })
};

/*********************************** Extra Functions ***************************************************/
const updateFogInstance = function(params, callback){
  var fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          daemonstatus: params.bodyParams.daemonstatus,
          daemonoperatingduration : params.bodyParams.daemonoperatingduration,
          daemonlaststart : params.bodyParams.daemonlaststart,
          memoryusage : params.bodyParams.memoryusage,
          diskusage : params.bodyParams.diskusage,
          cpuusage : params.bodyParams.cpuusage,
          memoryviolation : params.bodyParams.memoryviolation,
          diskviolation : params.bodyParams.diskviolation, 
          cpuviolation : params.bodyParams.cpuviolation,
          elementstatus : params.bodyParams.elementstatus, 
          repositorycount : params.bodyParams.repositorycount,
          repositorystatus : params.bodyParams.repositorystatus,
          systemtime : params.bodyParams.systemtime,
          laststatustime : params.bodyParams.laststatustime,
          ipaddress : params.bodyParams.ipaddress,
          processedmessages : params.bodyParams.processedmessages,
          elementmessagecounts : params.bodyParams.elementmessagecounts, 
          messagespeed : params.bodyParams.messagespeed,
          lastcommandtime : params.bodyParams.lastcommandtime,
          proxystatus : params.bodyParams.proxystatus,
          version: params.bodyParams.version || '1.0'
        }
      };
    FogService.updateFogInstance(fogInstanceProps, params, callback);
}

export default {
  instanceStatusEndPoint: instanceStatusEndPoint
};
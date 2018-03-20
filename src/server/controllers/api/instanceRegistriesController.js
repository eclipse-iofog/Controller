/**
 * @file instanceRegistriesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-registries end-point
 */
import async from 'async';

import BaseApiController from './baseApiController';
import RegistryService from '../../services/registryService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/

/********* Instance Registries EndPoint (Get/Post: /api/v2/instance/registries/id/:ID/token/:Token) **********/
const instanceRegistriesEndPoint = function (req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
    instanceProps = {
    instanceId: 'bodyParams.ID',
    setProperty: 'registry'
  };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
    async.apply(RegistryService.findRegistriesByInstanceId, instanceProps, params)
  
  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'registries', params.registry, result);  
  });
};

export default {
  instanceRegistriesEndPoint: instanceRegistriesEndPoint
};
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
import FogAccessTokenService from "../../services/fogAccessTokenService";

/********************************************* EndPoints ******************************************************/

/********* Instance Registries EndPoint (Get/Post: /api/v2/instance/registries/id/:ID/token/:Token) **********/
const instanceRegistriesEndPoint = function (req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
    let params = {},
        instanceProps = {
            token: 'bodyParams.Token',
            fogId: 'bodyParams.ID',
            setProperty: 'fogAccessToken'
        },
        regProps = {
            userId: 'fogAccessToken.userId',
            setProperty: 'registry'
        };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(BaseApiController.checkUserExistance, req, res),
      async.apply(FogAccessTokenService.findFogAccessTokenByTokenAndFogId, instanceProps, params),
      async.apply(RegistryService.findRegistriesByUserId, regProps, params)
  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'registries', params.registry, result);  
  });
};

export default {
  instanceRegistriesEndPoint: instanceRegistriesEndPoint
};
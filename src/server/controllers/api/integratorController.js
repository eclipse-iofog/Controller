/**
 * @file IntegratorController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the Integrator instance
 */
import async from 'async';

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import ConsoleService from '../../services/consoleService';
import ElementService from '../../services/elementService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import FogUserService from '../../services/fogUserService';
import NetworkPairingService from '../../services/networkPairingService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/

/*************** Integrator Instance Create EndPoint (Post: /api/v2/authoring/integrator/instance/create     
                                                          : /api/v2/authoring/fabric/instance/create) ************/
const integratorInstanceCreateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    createFogProps = {
      name: 'bodyParams.name',
      location: 'bodyParams.location',
        //TODO from MaksimChepelev: now lon and lat comes only from fog agent, but later it could comes from ui
      // latitude: 'bodyParams.latitude',
      // longitude: 'bodyParams.longitude',
      description: 'bodyParams.description',
      fogType: 'bodyParams.fabricType',
      setProperty: 'fogInstance'
    },
    
    createFogUserProps = {
      userId: 'user.id',
      instanceId: 'fogInstance.uuid',
      setProperty: null
    },

    fogTypeProps = {
      fogTypeId: 'bodyParams.fabricType',
      setProperty: 'fogType'
    },
    createChangeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      setProperty: null
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
    async.apply(FogService.createFogInstance, createFogProps),
    async.apply(ChangeTrackingService.createFogChangeTracking, createChangeTrackingProps),
    async.apply(FogUserService.createFogUser, createFogUserProps)
  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'instance', params.fogInstance, result);
  });
};

/*********** Integrator Instance Update EndPoint (Post: /api/v2/authoring/integrator/instance/update) *********/
const integratorInstanceUpdateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },

      fogInstanceProps = {
        fogId: 'bodyParams.instanceId',
        setProperty: 'fogInstance'
      };
  
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.getFogInstance, fogInstanceProps),
    updateFogInstance

  ], function(err, result) {
    let errMsg = 'Internal error: There was a problem updating Fog instance.' + result
    AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
  });
};

/************************************* Extra Functions **************************************************/
const updateFogInstance = function(params, callback){
  let fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
          name : params.bodyParams.name,
          location : params.bodyParams.location,
            //TODO from MaksimChepelev:now lon and lat comes only from fog agent, but later it could comes from ui
          // latitude : params.bodyParams.latitude,
          // longitude : params.bodyParams.longitude,
          description : params.bodyParams.description
        }
      };
  FogService.updateFogInstance(fogInstanceProps, params, callback);
};

export default {
  integratorInstanceCreateEndPoint: integratorInstanceCreateEndPoint,
  integratorInstanceUpdateEndPoint: integratorInstanceUpdateEndPoint
};
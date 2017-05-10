/**
 * @file trackController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */
import async from 'async';

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import DataTracksService from '../../services/dataTracksService';
import ElementInstanceConnectionsService from '../../services/elementInstanceConnectionsService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceService from '../../services/elementInstanceService';
import FogService from '../../services/fogService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/

/***************** Create Track User EndPoint (Post: /api/v2/authoring/user/track/create) **************/
const userTrackCreateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    };

  params.bodyParams = req.body;

  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    validateFogInstance,
    createDataTrack

  ], function(err, result) {
    var trackId;
    if (params.dataTrack){
      trackId = params.dataTrack.id;
    }

    AppUtils.sendResponse(res, err, 'trackId', trackId, result);
  })
};

const validateFogInstance = function(params, callback){
  var fogProps = {
    fogId: 'bodyParams.fogInstanceId',
    setProperty: 'fogData'
  }
  if (params.bodyParams.fogInstanceId == 'NONE'){
    callback(null, params);
  }else{
    FogService.getFogInstance(fogProps, params, callback);
  }
}
/***************** Fog Track List EndPoint (Get: /api/v2/authoring/fabric/track/list/:instanceId) **************/
const fogTrackListEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    fogInstanceProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fogData'
    },
    
    dataTrackProps = {
      instanceId: 'bodyParams.instanceId',
      setProperty: 'dataTracks'
    };

  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FogService.getFogInstance, fogInstanceProps),
    async.apply(DataTracksService.getDataTrackByInstanceId, dataTrackProps)
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'tracks', params.dataTracks, result);
  })
};

/***************** Fog Track Update EndPoint (Post: /api/v2/authoring/fabric/track/update) **************/
const fogTrackUpdateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    getFogInstance,
    updateDataTrackById

  ], function(err, result) {
    var trackId;

    if (params.bodyParams){
      trackId = params.bodyParams.trackId;
    }

    AppUtils.sendResponse(res, err, 'trackId', params.bodyParams.trackId, result);
  })
};

/***************** Fog Track Delete EndPoint (Post: /api/v2/authoring/fabric/track/delete) **************/
const fogTrackDeleteEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },

    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    },

    elementInstanceProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'trackElementInstances'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    async.apply(ElementInstanceService.getElementInstancesByTrackId, elementInstanceProps),
    deleteElementInstances,
    async.apply(DataTracksService.deleteTrackById, dataTrackProps)
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem deleting the track : ' + result

    AppUtils.sendResponse(res, err, 'trackId', params.bodyParams.trackId, errMsg);
  });
};

/********** Get Track Data for User EndPoint (Get: /api/v2/authoring/user/track/list/:userId) *******/
const getTracksForUser = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    trackProps = {
      userId: 'user.id',
      setProperty: 'dataTracks'
    };
    
    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getTracksByUserId, trackProps)

  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'dataTracks', params.dataTracks, result);
  })
};

/***************** User Track Update EndPoint (Post: /api/v2/authoring/user/track/update) **************/
const userTrackUpdateEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    
    dataTrackProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'dataTrack'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    resetSelectedActivatedAndName,
    findElementInstanceByTrackId,
    updateChangeTracking,
    updateDataTrackById

  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'trackId', params.bodyParams.trackId, result);
  })
};
/***************** User Track Delete EndPoint (Post: /api/v2/authoring/user/track/delete) **************/
const userTrackDeleteEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    
    dataTrackProps = {
      trackId: 'bodyParams.trackId'
     // setProperty: 'dataTrack'
    },
    elementInstanceProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'elementInstances'
    },
    elementInstanceDataProps = {
      elementInstanceData: 'elementInstances',
      field: 'uuid'
    },
    networkPairingProps = {
      elementInstanceData: 'elementInstances',
      field: 'uuid',
      setProperty: 'networkPairingData'
    },
    satellitePortProps = {
      satellitePortIds: 'networkPairingData',
      field: 'satellitePortId'
    },
    deleteNetworkElementInstanceProps = {
      elementInstanceData: 'networkPairingData',
      field1: 'networkElementId1',
      field2: 'networkElementId2'
    },
    elementInstanceConnectionProps = {
     elementInstanceData: 'elementInstances',
      field: 'uuid'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(DataTracksService.getDataTrackById, dataTrackProps),
    async.apply(DataTracksService.deleteTrackById,dataTrackProps),
    async.apply(ElementInstanceService.findElementInstancesByTrackId, elementInstanceProps),
    async.apply(ElementInstancePortService.deleteElementInstancePortsByElementIds, elementInstanceDataProps),
    async.apply(NetworkPairingService.findByElementInstanceIds, networkPairingProps),
    async.apply(SatellitePortService.deleteSatellitePortByIds, satellitePortProps),
    async.apply(ElementInstanceService.deleteNetworkElementInstances, deleteNetworkElementInstanceProps),
    async.apply(NetworkPairingService.deleteNetworkPairingByElementId1, networkPairingProps),
    async.apply(ElementInstanceConnectionsService.deleteElementInstanceConnection, elementInstanceDataProps),
    async.apply(RoutingService.deleteByPublishingOrDestinationElementId, elementInstanceDataProps),
    updateFogChangeTracking,
    async.apply(ElementInstanceService.deleteElementInstances, elementInstanceDataProps)

  ], function(err, result) {
    var successLabelArr= ['trackId', 'elementInstances'],
      successValueArr= [params.bodyParams.trackId, params.elementInstances];
      
    AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  })
};

/************************************* Extra Functions ********************************************/
const updateFogChangeTracking = function(params, callback){
  var changeTrackingProps = {
    elementInstanceData: 'elementInstances',
    field: 'iofog_uuid',
    changeObject: {
      containerList: new Date().getTime()
    }
  };
    
  ChangeTrackingService.updateChangeTrackingData(changeTrackingProps, params, callback);
}

// const deleteDataTrack = function(params, callback){
//   if (params.dataTrack.updatedBy == params.user.id){
//     var dataTrackProps = {
//       trackId :'bodyParams.trackId'
//     };
  
//     DataTracksService.deleteTrackById(dataTrackProps, params, callback);

//   }else{
//     callback('err', 'Permission error: You are not authorized to delete this track.');
//   }
// }

const deleteElement = function(params, callback) {
  var deleteElementProps = {
        elementId: 'bodyParams.elementId'
      },
      portPasscodeProps = {
        elementId: 'bodyParams.elementId',
        setProperty: 'portPasscode'
      };

  async.waterfall([
    async.apply(ElementInstancePortService.deleteElementInstancePort,deleteElementProps, params),
    async.apply(RoutingService.deleteElementInstanceRouting,deleteElementProps),
    async.apply(RoutingService.deleteNetworkElementRouting,deleteElementProps),
    async.apply(ElementInstanceService.deleteNetworkElementInstance, deleteElementProps),
    async.apply(SatellitePortService.getPasscodeForNetworkElements, portPasscodeProps),
    ComsatService.closePortsOnComsat,
    async.apply(NetworkPairingService.deleteNetworkPairing, deleteElementProps),
    async.apply(SatellitePortService.deletePortsForNetworkElements, deleteElementProps),
    async.apply(ElementInstanceService.deleteElementInstance, deleteElementProps)
  ], function(err, result) {
    console.log(err);
    callback();
  });
}

const createDataTrack = function(params, callback){
  var dataTrackProps = {
    dataTrackObj: {
      name: params.bodyParams.trackName,
      instanceId: params.bodyParams.fogInstanceId,
      updatedBy: params.user.id,
      isSelected: 0,
      isActivated: 0,
      user_id: params.user.id
    },
    setProperty: 'dataTrack'
  };
  
  DataTracksService.createDataTrack(dataTrackProps, params, callback);
}

const resetSelectedActivatedAndName= function(params, callback) {

  if (params.bodyParams.isSelected == -1 || params.bodyParams.isSelected == '')
    params.bodyParams.isSelected = params.dataTrack.isSelected;

  if (params.bodyParams.isActivated == -1 || params.bodyParams.isActivated == '')
    params.bodyParams.isActivated = params.dataTrack.isActivated;

  if (!params.bodyParams.trackName)
    params.bodyParams.trackName = params.dataTrack.name;

  callback(null, params);
}

const findElementInstanceByTrackId= function(params, callback) {
    var elementInstanceProps = {
      trackId: 'bodyParams.trackId',
      setProperty: 'elementInstances'
    };
    
  if (params.bodyParams.IsActivated != params.dataTrack.isActivated) {
    ElementInstanceService.findElementInstancesByTrackId(elementInstanceProps, params, callback);
  }
  else{
    callback(null, params);
  }
}

const updateChangeTracking= function(params, callback) {
 var changeTrackingProps = {
    elementInstanceData: 'elementInstances',
    field: 'iofog_uuid',
    changeObject: {
      containerConfig: new Date().getTime(),
      containerList: new Date().getTime()
    }
  };
    
  ChangeTrackingService.updateChangeTrackingData(changeTrackingProps, params, callback);
}

const updateDataTrackById= function(params, callback) {
  var updateDataTrackProps = {
        trackId: 'bodyParams.trackId',
        updatedObj: {
          name: params.bodyParams.trackName,
          description: params.bodyParams.description,
          lastUpdated : new Date(),
          isSelected: params.bodyParams.isSelected,
          isActivated: params.bodyParams.isActivated,
          user_id: params.user.id
      }
    };
  DataTracksService.updateDataTrackById(updateDataTrackProps, params, callback);
}

const getFogInstance = function(params, callback) {
    if (!params.bodyParams.instanceId){
      params.bodyParams.instanceId = params.dataTrack.instanceId;
    }
   var fogInstanceProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fogData'
    };
  FogService.getFogInstance(fogInstanceProps, params, callback)
}

const deleteElementInstances = function(params, callback) {
  if (params.trackElementInstances && params.trackElementInstances.length > 0) {
    async.eachSeries(params.trackElementInstances, function(elementInstance, callback) {
      params.bodyParams.elementId = elementInstance.uuid;
      deleteElement(params, callback);
    }, function(err) {
      params.errormessage = JSON.stringify(err);
      callback(null, params);
    });
  } else {
    callback(null, params);
  }
}

export default {
  fogTrackListEndPoint: fogTrackListEndPoint,
  fogTrackUpdateEndPoint: fogTrackUpdateEndPoint,
  fogTrackDeleteEndPoint: fogTrackDeleteEndPoint,
  getTracksForUser: getTracksForUser,
  userTrackCreateEndPoint: userTrackCreateEndPoint,
  userTrackUpdateEndPoint: userTrackUpdateEndPoint,
  userTrackDeleteEndPoint: userTrackDeleteEndPoint
};
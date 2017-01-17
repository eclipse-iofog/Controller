/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import https from 'https';
import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementAdvertisedPortService from '../../services/elementAdvertisedPortService';
import FabricService from '../../services/fabricService';
import FabricTypeService from '../../services/fabricTypeService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import SatelliteService from '../../services/satelliteService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import _ from 'underscore';


router.get('/api/v2/authoring/fabric/track/element/list/:trackId', (req, res) => {
  var params = {},
      userProps = {
          userId: 'bodyParams.userId',
          setProperty: 'user'
      };

  params.bodyParams = req.params;
  params.bodyParams.userId = req.query.userId;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    ElementInstanceService.findRealElementInstanceByTrackId,
    ElementAdvertisedPortService.findElementAdvertisedPortByElementIds,
    ElementInstancePortService.findElementInstancePortsByElementIds,
    NetworkPairingService.findByElementInstancePortId,
    SatellitePortService.findBySatellitePortIds,
    SatelliteService.findBySatelliteIds,
    RoutingService.findByElementInstanceUuidsAndRoutingDestination,
    RoutingService.extractDifferentRoutingList,
    ElementInstanceService.findIntraTrackByUuids,
    ElementInstanceService.findExtraTrackByUuids,
    NetworkPairingService.findOtherTrackByUuids,
    NetworkPairingService.concatNetwotkElementAndNormalElement,
    ElementInstanceService.findOtherTrackDetailByUuids,
    RoutingService.findOutputRoutingByElementInstanceUuidsAndRoutingPublishing,
    RoutingService.extractDifferentOutputRoutingList,
    ElementInstanceService.findOutputIntraElementInfoByUuids,
    ElementInstanceService.findOutputExtraElementInfoByUuids,
    NetworkPairingService.findOutputOtherElementInfoByUuids,
    NetworkPairingService.concatNetwotkElement2AndNormalElement,
    ElementInstanceService.findOutpuOtherTrackDetailByUuids,
    extractElementsForTrack
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elements', result.response, result);
  })

});

const extractElementsForTrack = function(params, callback) {
  let response = [];
  params.elementInstance.forEach((instance, index) => {

    if (instance.element_key) {

      let elementInstance = {
        elementid: instance.uuid,
        elementkey: instance.element_key,
        config: instance.config,
        name: instance.name,
        elementtypename: instance.element.name,
        category: instance.element.category,
        image: instance.element.containerImage,
        publisher: instance.element.publisher,
        advertisedports: _.where(params.elementAdvertisedPort, {
          element_id: instance.element_key
        }),
        openports: extractOpenPort(params, instance),
        routing: extractRouting(params, instance)
      };
      response.push(elementInstance);
    }
  });
  params.response = response;
  callback(null, params);
}

const extractOpenPort = function(params, elementInstance) {
  let openports = [];
  let elementInstancePort = _.where(params.elementInstancePort, {
    elementId: elementInstance.uuid
  })
  elementInstancePort.forEach((instancePort, index) => {
    let networkpairing = _.findWhere(params.networkPairing, {
      elemen1PortId: instancePort.id
    })
    let accessurl, networkpairingid;

    if (networkpairing != null) {

      let satellitePort = _.findWhere(params.satellitePort, {
        id: networkpairing.satellitePortId
      });

      let satellite = _.findWhere(params.satellite, {
        id: satellitePort.satellite_id
      });

      accessurl = 'https://' + satellite.domain + ':' + satellitePort.port2;
      networkpairingid = networkpairing.id;
    } else {
      accessurl = '';
      networkpairingid = 0;
    }

    let openPort = {
      portid: instancePort.id,
      internalport: instancePort.portinternal,
      externalport: instancePort.portexternal,
      accessurl: accessurl,
      networkpairingid: networkpairingid
    }

    openports.push(openPort);
  });

  return openports;
}

const extractRouting = function(params, elementInstance) {

  let inputs, outputs;

  let inputIntraTrack = _.where(params.intraTracks, {
    elementid: elementInstance.uuid
  });
  let inputExtraTrack = _.where(params.extraTracks, {
    elementid: elementInstance.uuid
  });
  let inputExtraIntegrator = _.where(params.extraintegrator, {
    elementid: elementInstance.uuid
  });

  let outputIntraTrack = _.where(params.outputIntraTracks, {
    elementid: elementInstance.uuid
  });
  let outputExtraTrack = _.where(params.outPutExtraTracks, {
    elementid: elementInstance.uuid
  });
  let outputExtraIntegrator = _.where(params.outPutExtraintegrator, {
    elementid: elementInstance.uuid
  });

  return {
    inputs: {
      intratrack: inputIntraTrack,
      extratrack: inputExtraTrack,
      extraintegrator: inputExtraIntegrator,
    },
    outputs: {
      intratrack: outputIntraTrack,
      extratrack: outputExtraTrack,
      extraintegrator: outputExtraIntegrator,
    }
  }
}

router.post('/api/v2/authoring/element/instance/create', (req, res) => {
  var params = {},
    userProps,
    elementProps,
    elementInstanceProps,
    changeTrackingProps,
    newElementInstanceProps;

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  userProps = {
          userId: 'bodyParams.userId',
          setProperty: 'user'
      },
  elementProps = {
      elementId: 'bodyParams.elementKey',
      setProperty: 'element'
    },
    newElementInstanceProps = {
      userId: 'user.id',
      trackId: 'bodyParams.trackId',
      name: 'bodyParams.name',
      logSize: 'bodyParams.logSize',
      config: 'bodyParams.config',
      fogInstanceId: 'bodyParams.fogInstanceId',
      setProperty: 'newElementInstance'
    },
    changeTrackingProps = {
      fogInstanceId: 'bodyParams.fogInstanceId',
      changeObject: {
        containerConfig: params.milliseconds,
        containerList: params.milliseconds
      }
    };
  elementInstanceProps = {
    elementInstanceId: 'newElementInstance.uuid',
    setProperty: 'elementInstance'
  };

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getElementById, elementProps),
    async.apply(ElementInstanceService.createElementInstance, newElementInstanceProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
    convertToArr,
    ElementAdvertisedPortService.findElementAdvertisedPortByElementIds,
    ElementInstancePortService.findElementInstancePortsByElementIds,
    NetworkPairingService.findByElementInstancePortId,
    SatellitePortService.findBySatellitePortIds,
    SatelliteService.findBySatelliteIds,
    RoutingService.findByElementInstanceUuidsAndRoutingDestination,
    RoutingService.extractDifferentRoutingList,
    ElementInstanceService.findIntraTrackByUuids,
    ElementInstanceService.findExtraTrackByUuids,
    NetworkPairingService.findOtherTrackByUuids,
    NetworkPairingService.concatNetwotkElementAndNormalElement,
    ElementInstanceService.findOtherTrackDetailByUuids,
    RoutingService.findOutputRoutingByElementInstanceUuidsAndRoutingPublishing,
    RoutingService.extractDifferentOutputRoutingList,
    ElementInstanceService.findOutputIntraElementInfoByUuids,
    ElementInstanceService.findOutputExtraElementInfoByUuids,
    NetworkPairingService.findOutputOtherElementInfoByUuids,
    NetworkPairingService.concatNetwotkElement2AndNormalElement,
    ElementInstanceService.findOutpuOtherTrackDetailByUuids,
    getElementDetails

  ], function(err, result) {
    var errMsg = 'Internal error: ' + result
    AppUtils.sendResponse(res, err, 'elementDetails', params.elementInstanceDetails, errMsg);
  });
});

const convertToArr = function(params, callback) {
  var elementInstance = [];

  elementInstance.push(params.newElementInstance);
  params.elementInstance = elementInstance;

  callback(null, params);
}

const getElementDetails = function(params, callback) {

  let elementInstanceDetails = {
    elementId: params.elementInstance[0].uuid,
    elementKey: params.elementInstance[0].element_key,
    config: params.elementInstance[0].config,
    name: params.elementInstance[0].name,
    elementTypeName: params.element.name,
    category: params.element.category,
    image: params.element.containerImage,
    publisher: params.element.publisher,
    advertisedPorts: _.where(params.elementAdvertisedPort, {
      element_id: params.elementInstance[0].element_key
    }),
    openPorts: extractOpenPort(params, params.elementInstance[0]),
    routing: extractRouting(params, params.elementInstance[0])
  };

  params.elementInstanceDetails = elementInstanceDetails;
  callback(null, params);
}


/**
 * @desc - this end-point creates a new elementInstance
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/build/element/instance/create', (req, res) => {
  var params = {},
    userProps,
    elementProps,
    elementInstanceProps;

  params.bodyParams = req.body;

  userProps = {
          userId: 'bodyParams.userId',
          setProperty: 'user'
      },
      
  elementProps = {
      elementId: 'bodyParams.elementKey',
      setProperty: 'element'
    },

  elementInstanceProps = {
      userId: 'user.id',
      trackId: 'bodyParams.trackId',
      name: 'bodyParams.name',
      logSize: 'bodyParams.logSize',
      config: 'bodyParams.config',
      fogInstanceId: 'bodyParams.fogInstanceId',
      setProperty: 'elementInstance'
    };

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getElementById, elementProps),
    async.apply(ElementInstanceService.createElementInstance, elementInstanceProps)

  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem creating the ioElement instance.' + result;
    AppUtils.sendResponse(res, err, 'elementInstance', result.elementInstance, errMsg);
  });
});


router.post('/api/v2/authoring/element/instance/update', (req, res) => {
  var params = {},
      userProps = {
        userId: 'bodyParams.userId',
        setProperty: 'user'
      },
      fogProps = {
        fogId: 'bodyParams.fabricInstanceId',
        setProperty: 'fogData'
      },
      elementInstanceProps = {
        elementInstanceId: 'bodyParams.instanceId',
        setProperty: 'elementInstance'
      };

  params.bodyParams = req.body;

    async.waterfall([
      async.apply(UserService.getUser, userProps, params),
      async.apply(FabricService.getFogInstance, fogProps),
      async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      updateElementInstance,
      updateChangeTracking,
      updateChange, 
      updateElement 
    ], function(err, result) {
    AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, result);
    });
});

const updateElementInstance = function (params, callback) {
  var data;

  if (params.elementInstance.iofabric_uuid == params.bodyParams.fabricInstanceId) {
    callback(null, params);
  } 
  else {
    data = {
      iofabric_uuid: params.bodyParams.fabricInstanceId
    };

    var elementProps = {
      elementId:'bodyParams.instanceId',
      updatedData: data
    };
    ElementInstanceService.updateElemInstance(elementProps, params, callback);
  }
}

const updateChangeTracking = function(params, callback) {
  var lastUpdated = new Date().getTime(),
    updateChangeTracking = {},
    updateChange = {},

    updateElementObject = {
      logSize: params.bodyParams.logSize,
      name: params.bodyParams.name,
      config: params.bodyParams.config,
      configLastUpdated: lastUpdated,
      rootHostAccess: params.bodyParams.rootAccess
    };

  if (params.elementInstance.config != params.bodyParams.config) {
    updateElementObject.configLastUpdated = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();
  }
  if (params.elementInstance.iofabric_uuid != params.bodyParams.fabricInstanceId) {

    updateChangeTracking.containerList = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();

    updateChange.containerConfig = new Date().getTime();
    updateChange.containerList = new Date().getTime();

  } else if (params.elementInstance.RootHostAccess != params.bodyParams.rootAccess) {
    updateChange.containerList = new Date().getTime();
  }
  params.updateElementObject = updateElementObject;
  params.updateChange = updateChange;

  var changeTrackingProps = {
    fogInstanceId: 'elementInstance.iofabric_uuid',
    changeObject: updateChangeTracking
  };
  ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
}

const updateChange = function(params, callback) {
  var changeTrackingProps = {
    fogInstanceId: 'bodyParams.fabricInstanceId',
    changeObject: params.updateChange
  };
  ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
}


const updateElement = function(params, callback) {
  var elementInstanceProps = {
    elementId: 'bodyParams.fabricInstanceId',
    updatedData: params.updateElementObject
  };
  ElementInstanceService.updateElemInstance(elementInstanceProps, params, callback);
}


router.post([
  '/api/v2/authoring/element/instance/config/update',
  '/api/v2/authoring/element/instance/name/update',
], (req, res) => {

  var params = {},
    userProps,
    elementInstanceProps;

  params.bodyParams = req.body;

  userProps = {
    userId: 'bodyParams.userId',
    setProperty: 'user'
  },

  elementInstanceProps = {
    elementInstanceId: 'bodyParams.elementId',
    setProperty: 'elementInstance'
  };

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
    updateElementInstanceConfig,
    ChangeTrackingService.updateConfigTracking,
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem updating ioElement instance.' + result

    AppUtils.sendResponse(res, err, 'element', params.bodyParams.elementId, errMsg);
  });
});

const updateElementInstanceConfig = function(params, callback){
  var updatedData = {};

  if (params.bodyParams.config) {
    updatedData.config = params.bodyParams.config;
    updatedData.configLastUpdated = new Date().getTime();
    params.isConfigChanged = true;
  }
  updatedData.name = params.bodyParams.name

  var updateElementInstanceProps ={
    elementId: 'bodyParams.elementId',
    updatedData: updatedData
  };

  ElementInstanceService.updateElemInstance(updateElementInstanceProps, params, callback);
}

router.post('/api/v2/authoring/element/instance/delete', (req, res) => {
  var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
      },

    deleteElementProps = {
      elementId: 'bodyParams.elementId'
    };

  params.bodyParams = req.body;
  params.milliseconds = new Date().getTime();

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    ElementInstancePortService.deleteElementInstancePort,
    RoutingService.deleteElementInstanceRouting,
    RoutingService.deleteNetworkElementRouting,
    ElementInstanceService.deleteNetworkElementInstance,
    SatellitePortService.getPasscodeForNetworkElements,
    ComsatService.closePortsOnComsat,
    NetworkPairingService.deleteNetworkPairing,
    SatellitePortService.deletePortsForNetworkElements,
    async.apply(ElementInstanceService.deleteElementInstance, deleteElementProps)
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem deleting ioElement instance.' + result;

    AppUtils.sendResponse(res, err, 'element', params.bodyParams.elementId, errMsg);
  });
});

router.post('/api/v2/authoring/element/instance/comsat/pipe/create', (req, res) => {
  var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    fogTypeProps = {
      fogTypeId: 'fabricInstance.typeKey',
      setProperty: 'fabricType'
    },

    elementInstanceProps = {
      portId: 'bodyParams.portId',
      setProperty: 'elementInstancePort'
    },

    networkPairingProps = {
      instanceId1: 'fabricInstance.uuid',
      instanceId2: null,
      elementId1: 'streamViewer.uuid',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'networkPairingObj'
    },

    changeTrackingCLProps = {
      fogInstanceId: 'fabricInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    fogProps = {
      fogId: 'bodyParams.instanceId',
      setProperty: 'fabricInstance'
    },

    networkElementProps = {
      networkElementId: 'fabricType.networkElementKey',
      setProperty: 'networkElement'
    },

    networkElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fabricInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'userId',
      networkName: null,
      networkPort: 0,
      isPublic: true,
      setProperty: 'networkElementInstance'
    };

  params.bodyParams = req.body;
  // elementId is used as params.streamViewer.uuid in NetworkPairingService->createNetworkPairing method
  params.streamViewer = {};
  params.streamViewer.uuid = params.bodyParams.elementId;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(FabricService.getFogInstance, fogProps),
    async.apply(FabricTypeService.getFabricTypeDetail, fogTypeProps),
    async.apply(ElementInstancePortService.getElementInstancePort, elementInstanceProps),
    ComsatService.openPortOnRadomComsat,
    SatellitePortService.createSatellitePort,
    async.apply(ElementService.getNetworkElement, networkElementProps),
    async.apply(ElementInstanceService.createNetworkElementInstance, networkElementInstanceProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
    async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps)
  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem trying to create the Comsat Pipe.' + result;
     if (params.satellite){
      var outputObj = {
        'accessUrl': 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
        'networkPairingId': params.networkPairingObj.id
      };
    }
    AppUtils.sendResponse(res, err, 'connection', outputObj, errMsg);
  });
});

router.post('/api/v2/authoring/element/instance/comsat/pipe/delete', (req, res) => {
  var params = {},

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    changeTrackingProps = {
      fogInstanceId: 'networkPairing.instanceId1',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    satellitePortProps = {
      satellitePortId: 'networkPairing.satellitePortId',
      setProperty: 'satellitePort'
    },

    satelliteProps = {
      satelliteId: 'satellitePort.satellite_id',
      setProperty: 'satellite'
    },

    deleteSatelliteProps = {
      satellitePortId: 'satellitePort.id'
    },

    networkPairingProps = {
      networkPairingId: 'networkPairing.id'
    };

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    NetworkPairingService.getNetworkPairing,
    async.apply(SatellitePortService.getSatellitePort, satellitePortProps),
    async.apply(SatelliteService.getSatelliteById, satelliteProps),
    ComsatService.closePortOnComsat,
    async.apply(SatellitePortService.deleteSatellitePort, deleteSatelliteProps),
    ElementInstanceService.deleteElementInstanceByNetworkPairing,
    async.apply(NetworkPairingService.deleteNetworkPairingById, networkPairingProps),
    async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)

  ], function(err, result) {
    var errMsg = 'Internal error: There was a problem trying to delete the Comsat Pipe.' + result;

    AppUtils.sendResponse(res, err, 'networkPairingId', params.bodyParams.networkPairingId, errMsg);
  });
});

router.post('/api/v2/authoring/element/instance/port/create', (req, res) => {
  var params = {},
    waterfallMethods = [],

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    elementInstancePortProps = {
      userId: 'bodyParams.userId',
      internalPort: 'bodyParams.internalPort',
      externalPort: 'bodyParams.externalPort',
      elementId: 'bodyParams.elementId',
      setProperty: 'elementInstancePort'
    },

    elementInstanceProps = {
      elementInstanceId: 'bodyParams.elementId',
      setProperty: 'elementInstance'
    },

    elementInstanceUpdateProps = {
      elementId: 'bodyParams.elementId',
      userId: 'user.id'
    },

    fogProps = {
      fogId: 'elementInstance.iofabric_uuid',
      setProperty: 'fogInstance'
    },

    changeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },

    fogTypeProps = {
      fogTypeId: 'fogInstance.typeKey',
      setProperty: 'fogType'
    },

    networkPairingProps = {
      instanceId1: 'fogInstance.uuid',
      instanceId2: null,
      elementId1: 'streamViewer.uuid',
      elementId2: null,
      networkElementId1: 'networkElementInstance.uuid',
      networkElementId2: null,
      isPublic: true,
      elementPortId: 'elementInstancePort.id',
      satellitePortId: 'satellitePort.id',
      setProperty: 'networkPairingObj'
    },

    changeTrackingCLProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    },

    networkElementProps = {
      networkElementId: 'fogType.networkElementKey',
      setProperty: 'networkElement'
    },

    networkElementInstanceProps = {
      networkElement: 'networkElement',
      fogInstanceId: 'fogInstance.uuid',
      satellitePort: 'satellitePort.port1',
      satelliteDomain: 'satellite.domain',
      trackId: null,
      userId: 'userId',
      networkName: null,
      networkPort: 0,
      isPublic: true,
      setProperty: 'networkElementInstance'
    };


  params.bodyParams = req.body;

  if (params.bodyParams.publicAccess == 1) {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.createElementInstancePort, elementInstancePortProps),
      async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      async.apply(ElementInstanceService.updateElementInstance, elementInstanceUpdateProps),
      async.apply(FabricService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),

      async.apply(FabricTypeService.getFabricTypeDetail, fogTypeProps),
      ComsatService.openPortOnRadomComsat,
      SatellitePortService.createSatellitePort,
      async.apply(ElementService.getNetworkElement, networkElementProps),
      async.apply(ElementInstanceService.createNetworkElementInstance, networkElementInstanceProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingCLProps),
      async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
      getOutputDetails
    ];
  } else {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.createElementInstancePort, elementInstancePortProps),
      async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
      async.apply(ElementInstanceService.updateElementInstance, elementInstanceUpdateProps),
      async.apply(FabricService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      getOutputDetails
    ];
  }

  async.waterfall(waterfallMethods, function(err, result) {
    var errMsg = 'Internal error: There was a problem trying to delete the Comsat Pipe.' + result;

    AppUtils.sendResponse(res, err, 'port', params.output, errMsg);
  });
});

const getOutputDetails = function(params, callback) {
  params.output = {
    portId: params.elementInstancePort.id,
    internalPort: params.bodyParams.internalPort,
    externalPort: params.bodyParams.externalPort,
    networkPairingId: ''
  };

  if (params.bodyParams.publicAccess == 1) {
    params.output.accessUrl = "https://" + params.satellite.domain + ":" + params.satellitePort.port2;
    params.networkPairingId = params.networkPairingObj.id;
  }

  callback(null, params);

}

router.post('/api/v2/authoring/element/instance/port/delete', (req, res) => {
  var params = {},
    waterfallMethods = [],

    userProps = {
      userId: 'bodyParams.userId',
      setProperty: 'user'
    },

    elementInstancePortProps = {
      portId: 'bodyParams.portId',
      setProperty: 'elementInstancePort'
    },

    elementInstanceProps = {
      elementId: 'elementInstancePort.elementId',
      userId: 'user.id'
    },

    readElementInstanceProps = {
      elementInstanceId: 'elementInstancePort.elementId',
      setProperty: 'elementInstance'
    },

    fogProps = {
      fogId: 'elementInstance.iofabric_uuid',
      setProperty: 'fogInstance'
    },

    changeTrackingProps = {
      fogInstanceId: 'fogInstance.uuid',
      changeObject: {
        'containerList': new Date().getTime()
      }
    },

    delElementInstancePortProps = {
      elementPortId: 'elementInstancePort.id'
    },

    satellitePortProps = {
      satellitePortId: 'networkPairing.satellitePortId',
      setProperty: 'satellitePort'
    },

    satelliteProps = {
      satelliteId: 'satellitePort.satellite_id',
      setProperty: 'satellite'
    },

    deleteSatelliteProps = {
      satellitePortId: 'satellitePort.id'
    },

    networkPairingProps = {
      networkPairingId: 'networkPairing.id'
    },

    changeTrackingProps2 = {
      fogInstanceId: 'networkPairing.instanceId1',
      changeObject: {
        'containerList': new Date().getTime(),
        'containerConfig': new Date().getTime()
      }
    };


  params.bodyParams = req.body;

  if (params.bodyParams.networkPairingId > 0) {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.getElementInstancePort, elementInstancePortProps),
      async.apply(ElementInstanceService.updateElementInstance, elementInstanceProps),
      async.apply(ElementInstanceService.getElementInstance, readElementInstanceProps),
      async.apply(FabricService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.deleteElementInstancePortById, delElementInstancePortProps),

      NetworkPairingService.getNetworkPairing,
      async.apply(SatellitePortService.getSatellitePort, satellitePortProps),
      async.apply(SatelliteService.getSatelliteById, satelliteProps),
      ComsatService.closePortOnComsat,
      async.apply(SatellitePortService.deleteSatellitePort, deleteSatelliteProps),
      ElementInstanceService.deleteElementInstanceByNetworkPairing,
      async.apply(NetworkPairingService.deleteNetworkPairingById, networkPairingProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps2)
    ];
  } else {
    waterfallMethods = [
      async.apply(UserService.getUser, userProps, params),
      async.apply(ElementInstancePortService.getElementInstancePort, elementInstancePortProps),
      async.apply(ElementInstanceService.updateElementInstance, elementInstanceProps),
      async.apply(ElementInstanceService.getElementInstance, readElementInstanceProps),
      async.apply(FabricService.getFogInstance, fogProps),
      async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
      async.apply(ElementInstancePortService.deleteElementInstancePortById, delElementInstancePortProps)
    ];
  }

  async.waterfall(waterfallMethods, function(err, result) {
    var errMsg = 'Internal error: There was a problem trying to delete the Comsat Pipe.' + result;

    AppUtils.sendResponse(res, err, 'portId', params.bodyParams.portId, errMsg);
  });
});

export default router;
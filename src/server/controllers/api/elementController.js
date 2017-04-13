/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';


import ChangeTrackingService from '../../services/changeTrackingService';
import ElementFogTypeService from '../../services/elementFogTypeService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceConnectionsService from '../../services/elementInstanceConnectionsService';
import ElementInputTypeService from '../../services/elementInputTypeService';
import ElementOutputTypeService from '../../services/elementOutputTypeService';
import NetworkPairingService from '../../services/networkPairingService';
import RoutingService from '../../services/routingService';
import SatellitePortService from '../../services/satellitePortService';
import UserService from '../../services/userService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';


/*********************************************** EndPoints **************************************************************/
/************ Get Element Details EndPoint (Get: /api/v2/authoring/element/module/details/moduleid/:moduleId) ************/
 const getElementDetailsEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementProps = {
        elementId: 'bodyParams.moduleId',
        setProperty: 'elementData'
      };
  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getElementDetails, elementProps)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'module', params.elementData, result);
  });
};
/************ Create Element For User EndPoint (Post: /api/v2/authoring/element/module/create) ************/
 const createElementForUserEndPoint = function(req, res) {
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
    createElementForUser,
    createElementFogType,
    createElementInputType,
    createElementOutputType

  ], function(err, result) {
   var successLabelArr,
       successValueArr,
       elementData = {};

    if (params.element && params.elementFogData){
      elementData.id = params.element.id;
      successLabelArr= ['elementFogType', 'module'],
      successValueArr= [params.elementFogData.iofog_type_id, elementData];
    }
    AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
  })
};

/*************** Create Element EndPoint (Post) *****************/
 const createElementEndPoint = function(req, res) {
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
    createElement,
    createElementFogTypes

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.element, result);
  })
};

/*************** Update Element EndPoint (Post) *****************/
 const updateElementEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    
    elementProps = {
      networkElementId: 'bodyParams.id',
      setProperty: 'element'
    },

    fogTypeProps = {
      elementId: 'bodyParams.id',
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    updateElement,
    async.apply(ElementFogTypeService.deleteElementFogType, fogTypeProps),
    createElementFogTypes,

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.bodyParams.id, result);
  })
};

/*************** Update Element For User EndPoint (Post: /api/v2/authoring/element/module/update) ***********************/
 const updateElementForUserEndPoint= function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    
    elementProps = {
      networkElementId: 'bodyParams.id',
      setProperty: 'element'
    },

    fogTypeProps = {
      elementId: 'bodyParams.id',
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    updateElement,
    updateElementInputType,
    updateElementOutputType

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};

/*************** Delete Element EndPoint (Post) *****************/
 const deleteElementEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  
  var params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      },
      elementProps = {
        elementId: 'bodyParams.id',
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.deleteElementById, elementProps),
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elementId', params.bodyParams.id, result);
  })
};

/*************** Delete Element For User EndPoint (Get: /api/v2/authoring/element/module/delete/moduleid/:moduleId) **************/
 const deleteElementForUserEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  
  var params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    elementProps = {
      elementKey: 'bodyParams.moduleId',
      setProperty: 'elementInstanceData'
    },
    elementIdProps = {
      elementId: 'bodyParams.moduleId'
    };

  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.findElementInstancesByElementKey, elementProps),
    deleteElementInstanceData,
    async.apply(ElementFogTypeService.deleteElementFogType, elementIdProps),
    async.apply(ElementInputTypeService.deleteElementInputType, elementProps),
    async.apply(ElementOutputTypeService.deleteElementOutputType, elementProps),
    async.apply(ElementService.deleteElementById, elementIdProps)
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'moduleId', params.bodyParams.moduleId, result);
  });
};

const updateFogChangeTracking = function(params, callback){
  var changeTrackingProps = {
    elementInstanceData: 'elementInstancesData',
    field: 'iofog_uuid',
    changeObject: {
      containerList: new Date().getTime()
    }
  };  
  ChangeTrackingService.updateChangeTrackingData(changeTrackingProps, params, callback);
}

/************* Get Element Catalog EndPoint (Get: api/v2/authoring/element/catalog/get) ***********/
const getCatalogOfElements = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
      userProps = {
          userId: 'bodyParams.t',
          setProperty: 'user'
      },
      getElementCatalogProps = {
        setProperty: 'elementCatalog'
      };
  
  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;

  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getElementCatalog, getElementCatalogProps)

  ], function(err, result) {
      AppUtils.sendResponse(res, err, 'elementCatalog', params.elementCatalog, result);
  })
};

/************* Get Elements For Publishing EndPoint (Get: api/v2/authoring/element/get) ***********/
const getElementsForPublishingEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  var params = {},
      userProps = {
          userId: 'bodyParams.t',
          setProperty: 'user'
      },
      elementProps = {
        setProperty: 'elementCatalog'
      };
  
  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;

  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getElementForPublish, elementProps)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elementCatalog', params.elementCatalog, result);
  })
};

/*************************************** Extra Functions *************************************************/
const createElement = function(params, callback) {
  var elementProps = {
        element : {
          name: params.bodyParams.name,
          description: params.bodyParams.description,
          config: params.bodyParams.config,
          category: params.bodyParams.category,
          containerImage: params.bodyParams.containerImage,
          publisher: params.bodyParams.publisher,
          diskRequired: false,
          ramRequired: false,
          picture: params.bodyParams.picture,
          isPublic: false,
          registry_id: 1
        },
        setProperty: 'element'
      };
  ElementService.createElement(elementProps, params, callback);
}

const createElementFogTypes = function(params, callback) {
  var fogTypeIds = 0;

  if(params.bodyParams.fabricTypeIds){
    fogTypeIds = params.bodyParams.fabricTypeIds.split(',')
  }
  
  if (fogTypeIds.length) {
    for (let i = 0; i < fogTypeIds.length; i++) {
      var elementFogTypeProps = {
            elementType: {
              element_id: params.element.id,
              iofog_type_id: fogTypeIds[i]
            }
          };
      ElementFogTypeService.createElementFogTypes(elementFogTypeProps, params);
    }
  }
  callback(null, params);
}

const createElementInputType = function(params, callback) {
  var elementInputTypeProps = {
        elementInputType : {
          elementKey: params.element.id,
          infoType: '',
          infoFormat: ''
        },
        setProperty: 'elementInputType'
      };

  ElementInputTypeService.createElementInputType(elementInputTypeProps, params, callback);
}

const createElementOutputType = function(params, callback) {
  var elementOutputTypeProps = {
        elementOutputType : {
          elementKey: params.element.id,
          infoType: '',
          infoFormat: ''
        },
        setProperty: 'elementOutputType'
      };

  ElementOutputTypeService.createElementOutputType(elementOutputTypeProps, params, callback);
}

const createElementForUser = function(params, callback) {
  var elementProps = {
        element : {
          name: '',
          description: '',
          category: '',
          containerImage: '',
          publisher: '',
          config: '',
          diskRequired: false,
          ramRequired: false,
          picture: 'images/shared/default.png',
          isPublic: false,
          registry_id: 1
        },
        setProperty: 'element'
      };
  ElementService.createElement(elementProps, params, callback);
}

const createElementFogType = function(params, callback) {
  if (params.bodyParams.fabricType){
      var elementFogTypeProps = {
            elementType: {
              element_id: params.element.id,
              iofog_type_id: params.bodyParams.fabricType
            },
            setProperty: 'elementFogData'
          };
      ElementFogTypeService.createElementFogType(elementFogTypeProps, params, callback);
    }
}

const updateElement = function(params, callback) {
  var elementProps = {
        elementId: 'bodyParams.id',
        updatedElement : {
          name: params.bodyParams.name,
          description: params.bodyParams.description,
          config: params.bodyParams.config,
          category: params.bodyParams.category,
          containerImage: params.bodyParams.containerImage,
          publisher: params.bodyParams.publisher,
          diskRequired: params.bodyParams.diskRequired ? params.bodyParams.diskRequired : false,
          ramRequired: params.bodyParams.ramRequired ? params.bodyParams.ramRequired : false,
          picture: params.bodyParams.picture,
          isPublic: false,
          registry_id: 1
        }
      };

  ElementService.updateElement(elementProps, params, callback);
}

const updateElementInputType = function(params, callback) {
  var elementInputTypeProps = {
        elementKey: 'bodyParams.id',
        updatedData : {
          infoType: params.bodyParams.inputType,
          infoFormat: params.bodyParams.inputFormat,
        }
      };

  ElementInputTypeService.updateElementInputType(elementInputTypeProps, params, callback);
}

const updateElementOutputType = function(params, callback) {
    var elementOutputTypeProps = {
        elementKey: 'bodyParams.id',
        updatedData : {
          infoType: params.bodyParams.outputType,
          infoFormat: params.bodyParams.outputFormat,
        }
      };

  ElementOutputTypeService.updateElementOutputType(elementOutputTypeProps, params, callback);
}

const deleteElementInstanceData = function(params, callback) {
  if (params.elementInstanceData.length){
    var elementInstanceDataProps = {
      elementInstanceData: 'elementInstanceData',
      field: 'uuid'
    },
    networkPairingProps = {
      elementInstanceData: 'elementInstanceData',
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
    };

    async.waterfall([
      async.apply(ElementInstancePortService.deleteElementInstancePortsByElementIds, elementInstanceDataProps, params),
      async.apply(NetworkPairingService.findByElementInstanceIds, networkPairingProps),
      async.apply(SatellitePortService.deleteSatellitePortByIds, satellitePortProps),
      async.apply(ElementInstanceService.deleteNetworkElementInstances, deleteNetworkElementInstanceProps),
      async.apply(NetworkPairingService.deleteNetworkPairingByElementId1, networkPairingProps),
      async.apply(ElementInstanceConnectionsService.deleteElementInstanceConnection, elementInstanceDataProps),
      async.apply(RoutingService.deleteByPublishingOrDestinationElementId, elementInstanceDataProps),
      updateFogChangeTracking,
      async.apply(ElementInstanceService.deleteElementInstances, elementInstanceDataProps)
    ], function(err, result) {
      callback(null, params);
    });
  }else{
    callback(null, params);
  }
}

export default {
  createElementEndPoint: createElementEndPoint,
  createElementForUserEndPoint: createElementForUserEndPoint,
  updateElementEndPoint: updateElementEndPoint,
  updateElementForUserEndPoint: updateElementForUserEndPoint,
  deleteElementEndPoint: deleteElementEndPoint,
  getCatalogOfElements: getCatalogOfElements,
  getElementsForPublishingEndPoint: getElementsForPublishingEndPoint,
  getElementDetailsEndPoint: getElementDetailsEndPoint,
  deleteElementForUserEndPoint: deleteElementForUserEndPoint
};
/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';


import ChangeTrackingService from '../../services/changeTrackingService';
import ElementImageService from '../../services/elementImageService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import ElementInstanceConnectionsService from '../../services/elementInstanceConnectionsService';
import ElementInputTypeService from '../../services/elementInputTypeService';
import ElementOutputTypeService from '../../services/elementOutputTypeService';
import FogTypeService from '../../services/fogTypeService';
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

  let params = {},
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

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    createElementForUser,
    createElementInputType,
    createElementOutputType

  ], function(err, result) {
   let elementData = {};

    if (params.element){
      elementData.id = params.element.id;
    }

    AppUtils.sendResponse(res, err, 'module', elementData, 'unable to create new element instance');
  })
};

/*
//Deprecated code
/!*************** Create Element EndPoint (Post) *****************!/
 const createElementEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        userId: 'bodyParams.t',
        setProperty: 'user'
      };
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    createElement,

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.element, result);
  })
};
*/

/*
//Deprecated code
/!*************** Update Element EndPoint (Post) *****************!/
 const updateElementEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
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
    checkFogTypes,
    updateElement,
    async.apply(ElementImageService.deleteElementImage, fogTypeProps),

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.bodyParams.id, result);
  })
};
*/

const checkFogTypes = function(params, callback) {
 let fogTypeIds = [];
  
  if(params.bodyParams.fabricTypeIds){
    fogTypeIds = params.bodyParams.fabricTypeIds.split(',')
  }
  params.fogTypeIds = fogTypeIds;
  if (fogTypeIds.length) {
    async.eachOfSeries(params.fogTypeIds, function (value, key, cb) {
      let fogTypeProps = {
        fogTypeId: value
      };
      
      FogTypeService.getFogTypeDetails(fogTypeProps, params, cb);

    }, function (err) {
      if(!err){
        callback(null, params);
      }else{
        callback('Error', 'Error: Unable to find fogType details');
      }
    });
  }else{
    callback(null, params);
  }
}

/*************** Update Element For User EndPoint (Post: /api/v2/authoring/element/module/update) ***********************/
 const updateElementForUserEndPoint= function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    elementProps = {
      networkElementId: 'bodyParams.id',
      setProperty: 'element'
    },

    elementImageProps = {
      elementId: 'bodyParams.id',
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    updateElement,
    updateElementImages,
    updateElementInputType,
    updateElementOutputType

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};

/*
////Deprecated code
/!*************** Delete Element EndPoint (Post: /api/v2/authoring/organization/element/delete) *****************!/
 const deleteElementEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  
  let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    elementProps = {
      elementKey: 'bodyParams.id',
      setProperty: 'elementInstanceData'
    },
    deleteElementProps = {
      elementId: 'bodyParams.id',
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementInstanceService.findElementInstancesByElementKey, elementProps),
    deleteElementInstanceData,
    async.apply(ElementService.deleteElementById, deleteElementProps)
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elementId', params.bodyParams.id, result);
  })
};
*/

/*************** Delete Element For User EndPoint (Get: /api/v2/authoring/element/module/delete/moduleid/:moduleId) **************/
 const deleteElementForUserEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  
  let params = {},
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
    },
    elementKeyProps = {
      networkElementId: 'bodyParams.moduleId',
      setProperty: 'elementData'
    };

  params.bodyParams = req.params;
  params.bodyParams.t = req.query.t;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementKeyProps), 
    async.apply(ElementInstanceService.findElementInstancesByElementKey, elementProps),
    deleteElementInstanceData,
    async.apply(ElementImageService.deleteElementImage, elementIdProps),
    async.apply(ElementInputTypeService.deleteElementInputType, elementProps),
    async.apply(ElementOutputTypeService.deleteElementOutputType, elementProps),
    async.apply(ElementService.deleteElementById, elementIdProps)
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'moduleId', params.bodyParams.moduleId, result);
  });
};

const updateFogChangeTracking = function(params, callback){
  let changeTrackingProps = {
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

  let params = {},
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

  let params = {},
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
    let elementProps = {
        element : {
          name: params.bodyParams.name,
          description: params.bodyParams.description,
          config: params.bodyParams.config,
          category: params.bodyParams.category,
          registry: params.bodyParams.registry,
          publisher: params.bodyParams.publisher,
          diskRequired: false,
          ramRequired: false,
          picture: params.bodyParams.picture,
          isPublic: false
        },
        setProperty: 'element'
      };
  ElementService.createElement(elementProps, params, callback);
}

const createElementInputType = function(params, callback) {
  let elementInputTypeProps = {
        elementInputType : {
          elementKey: params.element.id,
          infoType: params.bodyParams.infoType || '',
          infoFormat: params.bodyParams.infoFormat || ''
        },
        setProperty: 'elementInputType'
      };

  ElementInputTypeService.createElementInputType(elementInputTypeProps, params, callback);
}

const createElementOutputType = function(params, callback) {
  let elementOutputTypeProps = {
        elementOutputType : {
          elementKey: params.element.id,
          infoType: params.bodyParams.infoType || '',
          infoFormat: params.bodyParams.infoFormat || ''
        },
        setProperty: 'elementOutputType'
      };

  ElementOutputTypeService.createElementOutputType(elementOutputTypeProps, params, callback);
}

const createElementForUser = function(params, callback) {
    let elementProps = {
        element : {
          name: params.bodyParams.name || '',
          description: params.bodyParams.description || '',
          category: params.bodyParams.category || '',
          publisher: params.bodyParams.publisher || '',
          config: params.bodyParams.config || '',
          diskRequired: params.bodyParams.diskRequired || false,
          ramRequired: params.bodyParams.ramRequired || false,
          picture: params.bodyParams.picture || 'images/shared/default.png',
          isPublic: params.bodyParams.isPublic || false,
          registryId: params.bodyParams.registryId || 1,
        },
        setProperty: 'element'
      };
  ElementService.createElement(elementProps, params, callback);
}

const updateElement = function(params, callback) {
    let elementProps = {
        elementId: 'bodyParams.id',
        updatedElement : {
          name: params.bodyParams.name,
          description: params.bodyParams.description,
          config: params.bodyParams.config,
          category: params.bodyParams.category,
            registry_id: params.bodyParams.registry,
          publisher: params.bodyParams.publisher,
          diskRequired: params.bodyParams.diskRequired ? params.bodyParams.diskRequired : false,
          ramRequired: params.bodyParams.ramRequired ? params.bodyParams.ramRequired : false,
          picture: params.bodyParams.picture,
          isPublic: false
        }
      };

  ElementService.updateElement(elementProps, params, callback);
}

const updateElementImages = function(params, callback) {
    let elementImages = [];

    if(params.bodyParams.images){
        elementImages = params.bodyParams.images
    }
    if (elementImages.length) {
        async.eachOfSeries(elementImages, function (value, key, cb) {
            let elementImage = {
                element_id: params.bodyParams.id,
                iofog_type_id: value.fogTypeId,
                containerImage: value.image
            };
            ElementImageService.updateElementImages(elementImage, params, cb);
        }, function (err) {
            if(!err){
                callback(null, params);
            }else{
                callback('Error', err);
            }
        });
    }else{
        callback(null, params);
    }
};

const updateElementInputType = function(params, callback) {
  let elementInputTypeProps = {
        elementKey: 'bodyParams.id',
        updatedData : {
          infoType: params.bodyParams.inputType,
          infoFormat: params.bodyParams.inputFormat,
        }
      };

  ElementInputTypeService.updateElementInputType(elementInputTypeProps, params, callback);
}

const updateElementOutputType = function(params, callback) {
    let elementOutputTypeProps = {
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
    let elementInstanceDataProps = {
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
  createElementForUserEndPoint: createElementForUserEndPoint,
  updateElementForUserEndPoint: updateElementForUserEndPoint,
  getCatalogOfElements: getCatalogOfElements,
  getElementsForPublishingEndPoint: getElementsForPublishingEndPoint,
  getElementDetailsEndPoint: getElementDetailsEndPoint,
  deleteElementForUserEndPoint: deleteElementForUserEndPoint
};
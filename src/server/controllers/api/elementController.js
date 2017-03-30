/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';

import ElementFogTypeService from '../../services/elementFogTypeService';
import ElementService from '../../services/elementService';
import UserService from '../../services/userService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/************************ EndPoints ******************************/

/*************** Create Element EndPoint (Post) *****************/
 const createElementEndPoint = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);

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
  logger.info("Endpoint hitted: "+ req.originalUrl);

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
    createElementFogTypes

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.bodyParams.id, result);
  })
};

/*************** Delete Element EndPoint (Post) *****************/
 const deleteElementEndPoint = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);
  
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

/************* Get Element Catalog EndPoint (Get: api/v2/authoring/element/catalog/get) ***********/
const getCatalogOfElements = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);

  var params = {},
      getElementCatalogProps = {
        setProperty: 'elementCatalog'
      };
  
  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(ElementService.getElementCatalog, getElementCatalogProps, params)

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
          category: params.bodyParams.category,
          containerImage: params.bodyParams.containerImage,
          publisher: params.bodyParams.publisher,
          diskRequired: false,
          ramRequired: false,
          picture: params.bodyParams.picture,
          isPublic: true,
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
      ElementFogTypeService.createElementFogType(elementFogTypeProps, params);
    }
  }
  callback(null, params);
}

const updateElement = function(params, callback) {
  var elementProps = {
        elementId: 'bodyParams.id',
        updatedElement : {
          name: params.bodyParams.name,
          description: params.bodyParams.description,
          category: params.bodyParams.category,
          containerImage: params.bodyParams.containerImage,
          publisher: params.bodyParams.publisher,
          diskRequired: false,
          ramRequired: false,
          picture: params.bodyParams.picture,
          isPublic: true,
          registry_id: 1
        }
      };

  ElementService.updateElement(elementProps, params, callback);
}

export default {
  createElementEndPoint: createElementEndPoint,
  updateElementEndPoint: updateElementEndPoint,
  deleteElementEndPoint: deleteElementEndPoint,
  getCatalogOfElements: getCatalogOfElements
};
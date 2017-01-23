/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import ElementFogTypeService from '../../services/elementFogTypeService';
import ElementService from '../../services/elementService';
import UserService from '../../services/userService';
import AppUtils from '../../utils/appUtils';

router.post('/api/v2/authoring/organization/element/create', (req, res) => {
  var params = {},
      userProps = {
        userId: 'bodyParams.userId',
        setProperty: 'user'
      };
  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    createElement,
    createElementFogTypes

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.element, result);
  })
});

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

router.post('/api/v2/authoring/organization/element/update', (req, res) => {
  var params = {},
    userProps = {
      userId: 'bodyParams.userId',
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

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.getNetworkElement, elementProps),
    updateElement,
    async.apply(ElementFogTypeService.deleteElementFogType, fogTypeProps),
    createElementFogTypes

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'element', params.bodyParams.id, result);
  })
});

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

router.post('/api/v2/authoring/organization/element/delete', (req, res) => {
  var params = {},
      userProps = {
        userId: 'bodyParams.userId',
        setProperty: 'user'
      },
      elementProps = {
        elementId: 'bodyParams.id',
      };

  params.bodyParams = req.body;

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),
    async.apply(ElementService.deleteElementById, elementProps),
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elementId', params.bodyParams.id, result);
  })
});

export default router;
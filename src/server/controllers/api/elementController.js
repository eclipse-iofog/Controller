/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import _ from 'underscore';
import async from 'async';
import express from 'express';
const router = express.Router();

import ElementManager from '../../managers/elementManager';
import ElementFabricTypeManager from '../../managers/elementFabricTypeManager';
import FabricTypeManager from '../../managers/fabricTypeManager';

import UserService from '../../services/userService';
import ElementService from '../../services/elementService';
import ElementInstanceService from '../../services/elementInstanceService';
import ElementAdvertisedPortService from '../../services/elementAdvertisedPortService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import NetworkPairingService from '../../services/networkPairingService';
import SatellitePortService from '../../services/satellitePortService';
import SatelliteService from '../../services/satelliteService';
import RoutingService from '../../services/routingService';

import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

/**
 * @desc - this end-point creates a new element
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/organization/element/create', (req, res) => {
  var bodyParams = req.body;

  async.waterfall([
    async.apply(createElement, bodyParams),
    createElementFabricTypes
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'element': result
      });
    }
  });
});

// create New Element and return newly created element
function createElement(bodyParams, callback) {
  var element = {
    name: bodyParams.name,
    description: bodyParams.description,
    category: bodyParams.category,
    containerImage: bodyParams.containerImage,
    publisher: bodyParams.publisher,
    diskRequired: false,
    ramRequired: false,
    picture: bodyParams.picture,
    isPublic: true,
    registry_id: 1
  };

  ElementManager.create(element)
    .then((newElement) => {
        if (newElement) {
          callback(null, newElement, bodyParams);
        } else {
          callback('error', "Unable to create Element");
        }
      },
      (err) => {
        console.log(err);
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

function createElementFabricTypes(element, bodyParams, callback) {
  var fabricTypeIds = bodyParams.fabricTypeIds !== null ? bodyParams.fabricTypeIds.split(',') : null;
  if (fabricTypeIds.length) {
    for (let i = 0; i < fabricTypeIds.length; i++) {
      var elementFabricType = {
        element_id: element.id,
        iofabric_type_id: fabricTypeIds[i]
      };
      ElementFabricTypeManager.createElementFabricType(elementFabricType);
    }
  }
  callback(null, {
    element: element
  });
}

/**
 * @desc - this end-point updates the element incase of any-change
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/organization/element/update', (req, res) => {
  var bodyParams = req.body;

  async.waterfall([
    async.apply(updateElement, bodyParams),
    createElementFabricTypes
  ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status': 'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      res.send({
        'status': 'ok',
        'timestamp': new Date().getTime(),
        'element': result.element.id
      });
    }
  });
});

// update Element and return updated element
function updateElement(bodyParams, callback) {
  var element = {
    name: bodyParams.name,
    description: bodyParams.description,
    category: bodyParams.category,
    containerImage: bodyParams.containerImage,
    publisher: bodyParams.publisher,
    diskRequired: false,
    ramRequired: false,
    picture: bodyParams.picture,
    isPublic: true,
    id: bodyParams.id,
    registry_id: 1
  };

  ElementManager.update(element)
    .then((updtedElement) => {
        if (updtedElement) {
          ElementFabricTypeManager.deleteElementFabricTypes(updtedElement.id);
          callback(null, updtedElement, bodyParams);
        } else {
          callback('error', "Unable to create Element");
        }
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this end-point deleted the element
 */
router.post('/api/v2/authoring/organization/element/delete', (req, res) => {
  var bodyParams = req.body;

  ElementManager.deleteById(bodyParams.id)
    .then((element) => {
      res.status(200);
      if (element) {
        res.send({
          'status': 'ok',
          'timestamp': new Date().getTime(),
          'elementId': element.id
        });
      } else {
        res.send({
          'status': 'failure',
          'timestamp': new Date().getTime(),
          'errormessage': result
        });
      }
    });
});

export default router;
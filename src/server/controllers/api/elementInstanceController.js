/**
 * @file elementController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the end-points that deal with elements
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import ElementManager from '../../managers/elementManager';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

/**
 * @desc - this end-point creates a new elementInstance
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/build/element/instance/create', (req, res) => {
  var milliseconds = new Date().getTime();
  var bodyParams = req.body;
  var userId = 1; //USER ID

  console.log(bodyParams);

  async.waterfall([
    async.apply(getElement, bodyParams, userId),
    createElementInstance
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
        'instance Id': result
      });
    }
  });
});

/**
 * @desc - this function gets an element and sets default values for an element instance
 */
function getElement(bodyParams, userId, callback) {

  ElementManager.findElementById(bodyParams.ElementKey)
    .then((element) => {
        if (element) {
          callback(null, bodyParams, userId, element);
        } else callback('error', "error");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this function uses the default values to create a new element instance
 */
function createElementInstance(bodyParams, userId, element, callback) {
  ElementInstanceManager.createElementInstance(element, userId, bodyParams.TrackId, bodyParams.Name, bodyParams.LogSize)
    .then((rowcreated) => {
        console.log(rowcreated);
        if (rowcreated) {
          callback(null, element);
        } else {
          callback('error', "Unable to create ElementInstance");
        }
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this end-point updates the element instance incase of any-change
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/element/instance/update', (req, res) => {
  var userId = 1; // USER ID
  var bodyParams = req.body;
  console.log(bodyParams);

  if (!bodyParams.FabricInstance) {
    res.send({
      'status': 'failure',
      'timestamp': new Date().getTime(),
      'errormessage': 'Fabric Instance Id is required'
    });
  } else {
    async.waterfall([
      async.apply(getElementInstance, bodyParams),
      updateElementInstance, // update the fabric id
      updateChangeTracking, // update the changetracking data based on elementinstance.iofabric_uuid
      updateChange, // update the changetracking data based on the post param Fabric id
      updateElement // update the element data from incoming post params
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
          'instance Id': result
        });
      }
    });
  }
});

/**
 * @desc - this function finds the element instance which was changed
 */
function getElementInstance(bodyParams, callback) {
  console.log(bodyParams);
  ElementInstanceManager.findByUuId(bodyParams.InstanceId)
    .then((elementInstance) => {
        if (elementInstance) {
          callback(null, bodyParams, elementInstance);
        } else callback('error', "Unable to find ElementInstance");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

/**
 * @desc - this function sets this element instance to a fabric
 */
function updateElementInstance(bodyParams, elementInstance, callback) {
  var data;

  if (elementInstance.iofabric_uuid === bodyParams.FabricInstance) {
    callback(null, bodyParams, elementInstance);
  } else {

    data = {
      iofabric_uuid: bodyParams.FabricInstance
    };

    ElementInstanceManager.updateByUUID(bodyParams.InstanceId, data)
      .then((updatedElement) => {
          if (updatedElement > 0) {
            callback(null, bodyParams, elementInstance);
          } else callback('error', "Unable to Update elements fabric id");
        },
        (err) => {
          callback('error', Constants.MSG.SYSTEM_ERROR);
        });
  }
}

/**
 * @desc - this function popultes objects with updated values and updates the changetraking table
 */
function updateChangeTracking(bodyParams, elementInstance, callback) {

  var lastUpdated = new Date().getTime(),
    updateChangeTracking = {},
    updateChange = {},

    updateElementObject = {
      logSize: bodyParams.LogSize,
      name: bodyParams.Name,
      config: bodyParams.Config,
      configLastUpdated: lastUpdated,
      RootHostAccess: bodyParams.RootAccess
    };

  if (elementInstance.config != bodyParams.Config) {
    updateElementObject.configLastUpdated = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();
  }
  if (elementInstance.iofabric_uuid != bodyParams.FabricInstance) {

    updateChangeTracking.containerList = new Date().getTime();
    updateChangeTracking.containerConfig = new Date().getTime();

    updateChange.containerConfig = new Date().getTime();
    updateChange.containerList = new Date().getTime();

  } else if (elementInstance.RootHostAccess != bodyParams.RootAccess) {
    updateChange.containerList = new Date().getTime();
  }

  ChangeTrackingManager.updateByUuid(elementInstance.iofabric_uuid, updateChangeTracking)
    .then((updatedchange) => {
        callback(null, bodyParams, updateChange, updateElementObject);
      },
      (err) => {
        callback(null, bodyParams, updateChange, updateElementObject);
      });
}

/**
 * @desc - this function uses the populated objects to update the database values
 */
function updateChange(bodyParams, updateChange, updateElementObject, callback) {
  ChangeTrackingManager.updateByUuid(bodyParams.FabricInstance, updateChange)
    .then((changeUpdated) => {
        callback(null, bodyParams, updateElementObject);
      },
      (err) => {
        callback(null, bodyParams, updateElementObject);
      });
}
/**
 * @desc - this function updates the element instance with the new updated values
 */
function updateElement(bodyParams, updateElementObject, callback) {

  ElementInstanceManager.updateByUUID(bodyParams.InstanceId, updateElementObject)
    .then((updatedElement) => {
        if (updatedElement > 0) {
          callback(null, bodyParams.InstanceId);
        } else callback('error', "Unable to Update element instance data");
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

export default router;
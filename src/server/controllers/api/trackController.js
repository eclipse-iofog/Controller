/**
 * @file trackController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import DataTracksManager from '../../managers/dataTracksManager';
import ElementInstanceManager from '../../managers/ElementInstanceManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';


/**
 * @desc - This function get tracks for an ioFabric.
 */
router.get('/api/v2/authoring/fabric/track/list/:instanceId', (req, res) => {
  var reqParams = req.params,
    userId = 1;

  async.waterfall([
    async.apply(getFabricByInstanceId, null, reqParams, userId),
    getDataTracksByInstanceId
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
        'tracks': result
      });
    }
  });
});

// return iofabric by instance id
function getFabricByInstanceId(track, bodyParams, userId, callback) {
  var instanceId = bodyParams.instanceId ? bodyParams.instanceId : track.instanceId;
  console.log(instanceId)
  FabricManager.findByInstanceId(instanceId)
    .then((fabric) => {

        if (fabric)
          callback(null, track, bodyParams, userId);
        else if (track === null)
          callback('error', Constants.MSG.ERROR_ACCESS_DENIED_TRACK);
        else
          callback('error', Constants.MSG.ERROR_ACCESS_DENIED_TRACK_UPDATE)
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

// this method returns list of data-tracks by instance id
function getDataTracksByInstanceId(track, bodyParams, userId, callback) {
  DataTracksManager.findByInstanceId(bodyParams.instanceId)
    .then((tracks) => {
        callback(null, tracks);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

router.post('/api/v2/authoring/user/track/update', (req, res) => {
  var bodyParams = req.body,
    userId = 1;

  async.waterfall([
    async.apply(getDataTrackById, bodyParams, userId),
    updateDataTrackForUser
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
        'trackId': result
      });
    }
  });
});

function getDataTrackById(bodyParams, userId, callback) {

  DataTracksManager.findById(bodyParams.trackId)
    .then((track) => {

        if (track)
          callback(null, track, bodyParams, userId);
        else
          callback('error', 'Data Track not found.')
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

function updateDataTrackForUser(track, bodyParams, userId, callback) {
  console.log(bodyParams);
  if (bodyParams.isSelected == -1)
    bodyParams.isSelected = track.isSelected;
  if (bodyParams.isActivated == -1)
    bodyParams.isActivated = track.isActivated;

  if (bodyParams.isActivated != track.isActivated) {

    ElementInstanceManager.findByTrackId(track.id)
      .then((elementInstances) => {

          if (elementInstances) {
            for (let i = 0; i < elementInstances.length; i++) {
              if (elementInstances[i].iofabric_uuid) {
                ChangeTrackingManager.updateByUuid(elementInstances[i].iofabric_uuid, {
                  containerConfig: new Date().getTime(),
                  containerList: new Date().getTime()
                })
              }
            }
          }

          if (bodyParams.trackName === '')
            bodyParams.trackName = track.name;

          track.name = bodyParams.trackName;
          track.lastUpdated = new Date();
          track.user_id = userId;
          track.description = '';
          track.isSelected = bodyParams.isSelected;
          track.isActivated = bodyParams.isActivated;

          DataTracksManager.update(track.dataValues)
            .then((updatedTrack) => {
                callback(null, updatedTrack.id);
              },
              (err) => {
                callback('error', Constants.MSG.SYSTEM_ERROR)
              });

        },
        (err) => {
          callback('error', Constants.MSG.SYSTEM_ERROR)
        });
  }
}

router.post('/api/v2/authoring/fabric/track/update', (req, res) => {
  var bodyParams = req.body,
    userId = 1;

  async.waterfall([
    async.apply(getDataTrackById, bodyParams, userId),
    getFabricByInstanceId,
    updateDataTrack
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
        'trackId': result
      });
    }
  });
});

function updateDataTrack(track, bodyParams, userId, callback) {

  track.name = bodyParams.name;
  track.user_id = userId;
  track.description = bodyParams.description;
  track.isSelected = bodyParams.isSelected;
  track.isActivated = bodyParams.isActivated;

  DataTracksManager.update(track.dataValues)
    .then((updatedTrack) => {
        callback(null, updatedTrack.id);
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR)
      });

}

/*
// ioAuthoring_SDK_2_Delete_Track (api-v2-authoring-integrator-track-delete.php)
router.post('api/v2/authoring/fabric/track/delete', (req, res) => {

});

// ioAuthoring_SDK_2_Delete_Track (api-v2-authoring-integrator-track-delete-for-user.php)
router.post('api/v2/authoring/user/track/delete', (req, res) => {
  var bodyParams = req.body,
    userId = 1,
    trackId = bodyParams.trackId;

});
*/

export default router;
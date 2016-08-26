/**
 * @file instanceChangesController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-changes end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import BaseApiController from './baseApiController';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import FabricManager from '../../managers/fabricManager';
import Constants from '../../constants.js';

/**
 * @desc - if there is changeTracking data present, the data is checked against the timpstamp
 * and the client is responsed with the true values for the changed data and false for unchanged data.
 * @param Integer - instanceId
 * @return - returns and appropriate response to the client
 */

router.get('/api/v2/instance/changes/id/:ID/token/:Token/timestamp/:TimeStamp', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime();
  var instanceId = req.params.ID;
  var timeStamp = req.params.TimeStamp;

  if (timeStamp.length < 1) {
    timeStamp = 0;
  }

  ChangeTrackingManager.findByInstanceId(instanceId)
    .then((changeData) => {

        var changes = {
          config: false,
          containerlist: false,
          containerconfig: false,
          routing: false,
          registeries: false
        };

        if (changeData) {

          if (changeData.config > timeStamp) {
            changes.config = true;
          }

          if (changeData.containerList > timeStamp) {
            changes.containerlist = true;
          }

          if (changeData.containerConfig > timeStamp) {
            changes.containerconfig = true;
          }

          if (changeData.routing > timeStamp) {
            changes.routing = true;
          }

          if (changeData.registeries > timeStamp) {
            changes.registeries = true;
          }

          var newLastActive = new Date().getTime();

          var fabricConfig = {
            lastActive: newLastActive
          };

          // Updates the fabric with the fabricConfig based on the fabrics instanceId
          FabricManager.updateFabricConfig(instanceId, fabricConfig)
            .then(function(rowUpdated) {
              if (rowUpdated > 0) {
                console.log("row Successfully Updated");
              }
            }, function(err) {

            });
        }

        res.status(200);
        res.send({
          "status": "ok",
          "timestamp": new Date().getTime(),
          "changes": changes
        });
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });

});


export default router;
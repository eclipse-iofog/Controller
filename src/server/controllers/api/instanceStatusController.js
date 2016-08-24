/**
 * @file instanceStatusController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-status end-point
 */
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import FabricAccessTokenManager from '../../managers/fabricAccessTokenManager';
import FabricUserManager from '../../managers/fabricUserManager';
import BaseApiController from './baseApiController';


router.post('/api/v2/instance/status/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {

  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID;

  var fabricUpdate = req.body;

  if (fabricUpdate.version == null || fabricUpdate.version == "") {
    fabricUpdate.version = "1.0";
  }
  /**
   * @desc This function Updates the fabric data based on its id and incommming values.
   * @param Integer, JSON object - instanceId, fabricUpdate
   * @return - returns an appropriate response to the client
   */
  FabricManager.updateFabricConfig(instanceId, fabricUpdate)
    .then(function(rowupdated) {
      if (rowupdated > 0) {
        console.log('updated successfully');
        res.status(200);
        res.send({
          "status": "ok",
          "timestamp": milliseconds
        });

      } else {
        res.send({
          "status": "failure",
          "Error": "Update was not Successfull"
        });
      }
    }, function(err) {
      console.log(err);
      res.send({
        "status": "failure",
        "Error": "System Error"
      });

    });


});


export default router;
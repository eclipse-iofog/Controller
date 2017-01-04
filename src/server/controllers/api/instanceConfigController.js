/**
 * @file instanceConfigController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of instance-config and config-changes end-points
 */
import async from 'async';
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import BaseApiController from './baseApiController';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/config/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  instanceConfig (req, res);
});

router.post('/api/v2/instance/config/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  instanceConfig (req, res);
});

const instanceConfig = function(req, res){
  var milliseconds = new Date().getTime();
  var instanceId = req.params.ID;

  /**
   * @desc - if fabric are found, this function sends its Configuration data back to the client
   * @param Integer - instanceId
   * @return - returns an appropriate response to the client
   */
  FabricManager.findByInstanceId(instanceId)
    .then((fabricData) => {
      console.log(fabricData);
      if (fabricData) {

        res.status(200);
        res.send({
          "status": "ok",
          "timestamp": milliseconds,
          "config": {
            "networkinterface": fabricData.networkinterface,
            "dockerurl": fabricData.dockerurl,
            "disklimit": fabricData.disklimit,
            "diskdirectory": fabricData.diskdirectory,
            "memorylimit": fabricData.memorylimit,
            "cpulimit": fabricData.cpulimit,
            "loglimit": fabricData.loglimit,
            "logdirectory": fabricData.logdirectory,
            "logfilecount": fabricData.logfilecount
          }
        });
      } else {

        res.send({
          "status": "failure",
          Error: "Configuration was not available for the instance you specified."
        });

      }
    });
};


router.post('/api/v2/instance/config/changes/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID,
    token = req.params.Token,

    fabricConfig = req.body;
  /**
   * @desc - async.waterfall control flow, sequential calling of an Array of functions.
   * @param Array - [updateFabrics]
   * @return - returns an appropriate response to the client
   */
  async.waterfall([
    async.apply(updateFabrics, instanceId, fabricConfig)
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
        'timestamp': new Date().getTime()
      });
    }
  });
});
/**
 * @desc - updates the fabric with the fabricConfig based on the fabrics instanceId
 * @param - instanceId, fabricConfig, callback
 * @return - none
 */
function updateFabrics(instanceId, fabricConfig, callback) {
  console.log(instanceId);
  FabricManager.updateFabricConfig(instanceId, fabricConfig)
    .then((updatedFabric) => {
        if (updatedFabric) {
          callback(null, updatedFabric);
        } else {
          callback('error', "update failure");
        }
      },
      (err) => {
        callback('error', Constants.MSG.SYSTEM_ERROR);
      });
}

export default router;
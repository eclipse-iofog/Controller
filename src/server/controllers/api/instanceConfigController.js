/**
* @file instanceConfigController.js
* @author Zishan Iqbal
* @description This file includes the implementation of instance-config and config-changes end-points
*/
import async from 'async';
import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import FabricAccessTokenManager from '../../managers/fabricAccessTokenManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import FabricUserManager from '../../managers/fabricUserManager';
import BaseApiController from './baseApiController';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

// Get IoFabric Config
router.get('/api/v2/instance/config/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime();
  var instanceId=req.params.ID;

  	FabricManager.findByInstanceId(instanceId)
  	.then((fabricData) =>{
      console.log(fabricData);
  		if(fabricData){
        
		    res.status(200);
		 	  res.send({"status": "ok", "timestamp" : milliseconds , "config" :
		            {
		                "networkinterface":  fabricData.networkInterface ,
		                "dockerurl": fabricData.dockerURL,
		                "disklimit": fabricData.diskLimit,
		                "diskdirectory": fabricData.diskDirectory,
		                "memorylimit": fabricData.memoryLimit,
		                "cpulimit": fabricData.cpuLimit,
		                "loglimit": fabricData.logLimit,
		                "logdirectory":fabricData.logDirectory,
		                "logfilecount": fabricData.logFileCount
		            }
			  });
	  	}else{

	  		res.send({"status": "failure", Error: "Configuration was not available for the instance you specified."});

	  	}
  	});
});


router.post('/api/v2/instance/config/changes/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
  var milliseconds = new Date().getTime(),
    instanceId = req.params.ID,
    token = req.params.Token,

    fabricConfig = req.body;

    async.waterfall([
    async.apply(updateFabrics, instanceId, fabricConfig)
   ], function(err, result) {
    res.status(200);
    if (err) {
      res.send({
        'status':'failure',
        'timestamp': new Date().getTime(),
        'errormessage': result
      });
    } else {
      res.send({
        'status':'ok',
        'timestamp': new Date().getTime()
      });
    }
  });
});

function updateFabrics (instanceId, fabricConfig, callback) {
  FabricManager.updateFabricConfig(instanceId, fabricConfig)
  .then((updatedFabric) => {
    if(updatedFabric) {
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
/**
 * @file fabricController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import FabricService from '../../services/fabricService';
import UserService from '../../services/userService';
import FabricManager from '../../managers/fabricManager';
import FabricTypeManager from '../../managers/fabricTypeManager';
import FabricUserManager from '../../managers/fabricUserManager';
import StreamViewerManager from '../../managers/streamViewerManager';
import ConsoleManager from '../../managers/consoleManager';
import FabricProvisionKeyManager from '../../managers/fabricProvisionKeyManager';
import ChangeTrackingManager from '../../managers/changeTrackingManager';
import AppUtils from '../../utils/appUtils';



router.get('/api/v2/authoring/integrator/instances/list/:userId', (req, res) => {
  var params = {},
  fogInstanceForUserProps;
  
  params.bodyParams= req.params;

  fogInstanceForUserProps={
  	userId: 'user.id',
  	setProperty: 'fogInstance'
  }
  
 async.waterfall([
    async.apply(UserService.getUser, params),
 	async.apply(FabricService.getFogInstanceForUser, fogInstanceForUserProps)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'elementsInstances', params.fogInstance, result);   
})
});

/**
 * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
 * (Used to check if the server is active)
 * @return - returns and appropriate response to the client
 */
router.get('/api/v2/status', (req, res) => {
	var milliseconds = new Date().getTime();
	res.status(200);
	res.send({
		"status": "ok",
		"timestamp": milliseconds
	});
});

router.get('/api/v2/instance/create/type/:type', (req, res) => {
	var fabricType = req.params.type,
		instanceId = AppUtils.generateRandomString(32);

	var config = {
		uuid: instanceId,
		typeKey: fabricType
	};

	// This function creates a new fabric and inserts its data
	// in to the database, along with the default values
	FabricManager.createFabric(config)
		.then((rowCreated) => {
			console.log(rowCreated);
			if (rowCreated) {
				res.status(200);
				res.send({
					"success": true,
					"timestamp": new Date().getTime(),
					"instance Id": instanceId
				});

			} else {
				res.send({
					"success": false,
					"timestamp": new Date().getTime()
				});
			}
		});
});

router.get('/api/v2/instance/getfabriclist', (req, res) => {

	// this function gets the list of fabrics Order-By TypeKey
	FabricManager.getFabricList()
		.then((fabricList) => {
			console.log(fabricList);
			console.log(fabricList.length);
			if (fabricList && fabricList[0].length > 0) {
				res.send({
					"success": true,
					"fabricList": fabricList[0]
				});

			} else {

				res.send({
					"success": false,
					"error": "fabrics not found"
				});

			}
		});
});

/**
 * @desc - this end-point returns the list of fabricTypes avalible
 * @return - returns and appropriate response to the client
 */
router.get('/api/v2/getfabrictypes', (req, res) => {

	FabricTypeManager.getFabricTypes()
		.then((fabricTypes) => {

			if (fabricTypes && fabricTypes[0].length > 0) {
				res.send({
					"success": true,
					"fabric Types": fabricTypes[0]
				});

			} else {

				res.send({
					"success": false,
					"error": "fabric Types not found"
				});

			}
		});
});

/**
 * @desc - this end-point deletes the iofabric and data regarding it
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/fabric/instance/delete', (req, res) => {
	console.log(req.body);
	var instanceId = req.body.fabric_id;

	async.waterfall([
		async.apply(deleteChangeTracking, instanceId),
		deleteFabricUser,
		deleteStreamViewer,
		deleteConsole,
		deleteProvisionKey,
		deleteFabric
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
 * @desc - this function deletes the change tracking data based on the instance Id
 */
function deleteChangeTracking(instanceId, callback) {
	ChangeTrackingManager.deleteByInstanceId(instanceId)
		.then((deletedTracking) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}
/**
 * @desc - this function deletes the fabric-User relation data based on the instance Id
 */
function deleteFabricUser(instanceId, callback) {
	FabricUserManager.deleteByInstanceId(instanceId)
		.then((deletedFabricUser) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}
/**
 * @desc - this function deletes the stream Viewer data based on the instance Id
 */
function deleteStreamViewer(instanceId, callback) {
	StreamViewerManager.deleteByInstanceId(instanceId)
		.then((deletedStreamViewer) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}
/**
 * @desc - this function deletes the console data based on the instance Id
 */
function deleteConsole(instanceId, callback) {
	ConsoleManager.deleteByInstanceId(instanceId)
		.then((deletedConsole) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}
/**
 * @desc - this function deletes the provision key based on the instance Id
 */
function deleteProvisionKey(instanceId, callback) {
	FabricProvisionKeyManager.deleteByInstanceId(instanceId)
		.then((deletedKey) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}
/**
 * @desc - this function deletes the iofabric based on the instance Id
 */
function deleteFabric(instanceId, callback) {
	FabricManager.deleteByInstanceId(instanceId)
		.then((deletedFabric) => {
				callback(null, instanceId);
			},
			(err) => {
				callback('error', Constants.MSG.SYSTEM_ERROR);
			});
}

export default router;
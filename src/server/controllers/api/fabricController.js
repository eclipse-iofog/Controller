/**
 * @file fabricController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import express from 'express';
const router = express.Router();
import FabricManager from '../../managers/fabricManager';
import AppUtils from '../../utils/appUtils';
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
	var	fabricType = req.params.type,
		instanceId = AppUtils.generateRandomString(22);

	var config = {
		uuid : instanceId,
		typeKey : fabricType
	};
	/**
	* @desc - this function basically creates a new fabric and inserts its data
	* in to the database, along with the default values
	* @param JSON object - config
	* @return - returns and appropriate response to the client
	*/
	FabricManager.createFabric(config)
		.then((rowCreated) => {
			console.log(rowCreated);
			if (rowCreated) {
				res.status(200);
				res.send({
					"success": true,
					"timestamp":  new Date().getTime(),
					"instance Id": instanceId
				});

			} else {
				res.send({
					"success": false,
					"timestamp":  new Date().getTime()
				});
			}
		});
});

router.get('/api/v2/instance/getfabriclist', (req, res) => {
	/**
	* @desc - this function gets the list of fabrics Order-By TypeKey
	* @param - none
	* @return - returns and Array of JSON objects
	*/
	FabricManager.getFabricList()
		.then((fabricList) => {
			console.log(fabricList);
			console.log(fabricList.length);
			if(fabricList && fabricList[0].length > 0){
				res.send({
					"success": true,
					"fabricList":  fabricList[0]
				});

			}else{

				res.send({
					"success": false,
					"error" : "fabrics not found"
				});

			}
		});
});


export default router;
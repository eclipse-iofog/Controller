/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-container-config end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import BaseApiController from './baseApiController';
import ElementInstanceManager from '../../managers/elementInstanceManager';
import DataTracksManager from '../../managers/dataTracksManager';
import AppUtils from '../../utils/appUtils';
import Constants from '../../constants.js';

router.get('/api/v2/instance/containerconfig/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
	var milliseconds = new Date().getTime(),
		instanceId = req.params.ID,
		token = req.params.Token,
		containerList = new Array();
	/**
	 * @desc - if elementInstance are found, this function populates an Array with 
	 * the elements respective id, timestamp and  there configuration and sends the list back to the client
	 * @param Integer - instanceId
	 * @return - returns an appropriate response to the client
	 */
	ElementInstanceManager.findByInstanceId(instanceId)
		.then((outputData) => {
			var i;
			if (outputData && outputData[0] && outputData[0].length > 0) {
				for (i = 0; i < outputData[0].length; i++) {
					var container = outputData[0][i];
					var containerID = container.UUID;

					if (container.is_stream_viewer > 0) {
						containerID = "viewer";
					}

					if (container.is_debug_console > 0) {
						containerID = "debug";
					}

					var containerUpdated = container.config_last_updated * 1000;
					var containerConfig = container.config;
					containerList.push({
						'id': containerID,
						'lastupdatedtimestamp': containerUpdated,
						'config': containerConfig
					});
				}
				res.status(200);
				res.send({
					"status": "ok",
					"timestamp": new Date().getTime(),
					"containerconfig": containerList
				});

			} else {

				res.send({
					"status": "failure",
					"timestamp": new Date().getTime(),
					"error": "Element not found"
				});

			}
		});
});

export default router;
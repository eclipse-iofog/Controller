/**
 * @file instanceContainerListController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the instance-container-config end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();
import BaseApiController from './baseApiController';
import ElementInstanceService from '../../services/elementInstanceService';
import AppUtils from '../../utils/appUtils';


router.get('/api/v2/instance/containerconfig/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
	containerConfig(req, res);
});

router.post('/api/v2/instance/containerconfig/id/:ID/token/:Token', BaseApiController.checkUserExistance, (req, res) => {
	containerConfig(req, res);
});

const containerConfig= function(req, res){
	var params = {},
		instanceProps = {
			instanceId: 'bodyParams.ID',
			setProperty: 'outputData'
		};

	params.bodyParams = req.params;

	async.waterfall([
		async.apply(ElementInstanceService.findByInstanceId, instanceProps, params),
		processOutput

	], function(err, result) {
		AppUtils.sendResponse(res, err, 'containerconfig', params.containerList, result);
	})
};

const processOutput=function (params, callback)
{
	var containerList = new Array();

	for (var i = 0; i < params.outputData.length; i++) {
		var container = params.outputData[i],
			containerID = container.UUID;

		if (container.is_stream_viewer > 0) {
			containerID = "viewer";
		}
		if (container.is_debug_console > 0) {
			containerID = "debug";
		}
		var containerUpdated = container.config_last_updated,
			containerConfig = container.config;
			containerList.push({
				'id': containerID,
				'lastupdatedtimestamp': containerUpdated,
				'config': containerConfig
			});
		params.containerList = containerList;
	}
	callback (null, params);
}

export default router;
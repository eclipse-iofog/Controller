/**
 * @file fabricController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import ChangeTrackingService from '../../services/changeTrackingService';
import ConsoleService from '../../services/consoleService';
import ElementInstanceService from '../../services/elementInstanceService';
import FabricAccessTokenService from '../../services/fabricAccessTokenService';
import FabricProvisionKeyService from '../../services/fabricProvisionKeyService';
import FabricService from '../../services/fabricService';
import FabricTypeService from '../../services/fabricTypeService';
import FabricUserService from '../../services/fabricUserService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';

/**
 * @desc - if this end-point is hit it sends a timeStamp in milliseconds back to the client
 * (Used to check if the server is active)
 * @return - returns and appropriate response to the client
 */
router.get('/api/v2/status', (req, res) => {
	getFogControllerStatus(res);
});

router.post('/api/v2/status', (req, res) => {
	getFogControllerStatus(res);
});

const getFogControllerStatus = function(res){
	var milliseconds = new Date().getTime();
	res.status(200);
	res.send({
		"status": "ok",
		"timestamp": milliseconds
	});
};

router.get('/api/v2/authoring/integrator/instances/list/:userId', (req, res) => {
	var params = {},

		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},

		fogInstanceForUserProps = {
			userId: 'user.id',
			setProperty: 'fogInstance'
		};

	params.bodyParams = req.params;

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FabricService.getFogInstanceForUser, fogInstanceForUserProps)

	], function(err, result) {
		AppUtils.sendResponse(res, err, 'elementsInstances', params.fogInstance, result);
	})
});

router.get('/api/v2/instance/create/type/:type', (req, res) => {
	var params = {},
		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},
    	createFogProps = {
      		fabricType: 'bodyParams.type',
      		setProperty: 'fabricInstance'
    	};

	params.bodyParams = req.params;
	params.bodyParams.userId = req.query.userId;

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FabricService.createFogInstance, createFogProps)
	],
	function(err, result) {
		var output;
		if (!err)
		{
			output = params.fabricInstance.uuid;
		}
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'instanceId', output, errMsg);
	});
});

router.get('/api/v2/instance/getfabriclist', (req, res) => {
	var params = {},
		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},
    	fogListProps = {
      		setProperty: 'fogList'
    	};

	params.bodyParams = req.params;
	params.bodyParams.userId = req.query.userId;

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FabricService.getFogList, fogListProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'fogList', params.fogList, errMsg);
	});
});

/**
 * @desc - this end-point returns the list of fabricTypes avalible
 * @return - returns and appropriate response to the client
 */
router.get('/api/v2/getfabrictypes', (req, res) => {
	var params = {},
		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},
    	fogTypesListProps = {
      		setProperty: 'fogTypesList'
    	};

	params.bodyParams = req.params;
	params.bodyParams.userId = req.query.userId;

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FabricTypeService.getFogTypesList, fogTypesListProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'fogTypesList', params.fogTypesList, errMsg);
	});
});

/**
 * @desc - this end-point deletes the iofabric and data regarding it
 * @return - returns and appropriate response to the client
 */
router.post('/api/v2/authoring/fabric/instance/delete', (req, res) => {
	var params = {},
		userProps = {
			userId : 'bodyParams.userId',
			setProperty: 'user'
		},
		instanceProps = {
			instanceId : 'bodyParams.instanceId'
		};

	params.bodyParams = req.body;	

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(ChangeTrackingService.deleteChangeTracking,instanceProps),
		async.apply(FabricUserService.deleteFogUserByInstanceId, instanceProps),
		async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
		async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
		async.apply(FabricProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
		async.apply(FabricService.deleteFogInstance, instanceProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
	});
});

router.post('/api/v2/authoring/integrator/instance/delete', (req, res) => {
	var params = {},
		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},
		instanceProps = {
			instanceId: 'bodyParams.instanceId',
		},
		updateByFogUuIdProps = {
			fogInstanceId: 'bodyParams.instanceId',
			updatedFogId: null
		},
		fogUserProps = {
			instanceId: 'bodyParams.instanceId',
			setProperty: 'fogUser'
		},
		deleteFogUserProps = {
			userId: 'fogUser.user_id',
			instanceId: 'bodyParams.instanceId'
		};

	params.bodyParams = req.body;

	async.waterfall([
			async.apply(UserService.getUser, userProps, params),
			async.apply(ElementInstanceService.updateElemInstanceByFogUuId, updateByFogUuIdProps),
			async.apply(ChangeTrackingService.deleteChangeTracking, instanceProps),
			async.apply(FabricUserService.getFogUserByInstanceId, fogUserProps),
			async.apply(FabricAccessTokenService.deleteFabricAccessTokenByUserId, instanceProps),
			async.apply(FabricUserService.deleteFogUserByInstanceIdAndUserId, deleteFogUserProps),
			//async.apply(UserService.deleteByUserId, instanceProps),
			async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
			async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
			async.apply(FabricProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
			async.apply(FabricService.deleteFogInstance, instanceProps)
		],
		function(err, result) {
			var errMsg = 'Internal error: ' + result;
			AppUtils.sendResponse(res, err, 'Deleted Fog', params.bodyParams.instanceId, errMsg);
		});
});

export default router;
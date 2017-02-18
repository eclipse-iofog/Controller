/**
 * @file fogController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import ChangeTrackingService from '../../services/changeTrackingService';
import ConsoleService from '../../services/consoleService';
import ElementInstanceService from '../../services/elementInstanceService';
import FogAccessTokenService from '../../services/fogAccessTokenService';
import FogProvisionKeyService from '../../services/fogProvisionKeyService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import FogUserService from '../../services/fogUserService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';


/********************************************* EndPoints ******************************************************/

/**************************** Fog-Controller Status EndPoint (Get: /api/v2/status) ***************************/
const getFogControllerStatusEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
	var milliseconds = new Date().getTime();
	res.status(200);
	res.send({
		"status": "ok",
		"timestamp": milliseconds
	});
};

/******** Fog Instances List By UserID EndPoint (Get: /api/v2/authoring/integrator/instances/list/:userId) *******/
const fogInstancesListEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
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
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogService.getFogInstanceForUser, fogInstanceForUserProps)

	], function(err, result) {
		AppUtils.sendResponse(res, err, 'elementsInstances', params.fogInstance, result);
	})
};

/******************** Fog Instance Create EndPoint (Get: /api/v2/instance/create/type/:type) ******************/
const fogInstanceCreateEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
	var params = {},
		userProps = {
      		userId: 'bodyParams.userId',
      		setProperty: 'user'
    	},
    	fogTypeProps = {
      		fogTypeId: 'bodyParams.type',
      		setProperty: 'fogType'
    	},

    	createFogProps = {
      		fogType: 'bodyParams.type',
      		setProperty: 'fogInstance'
    	},
    	createFogUserProps = {
      		userId: 'user.id',
      		instanceId: 'fogInstance.uuid',
      		setProperty: 'fogUser'
    	};

	params.bodyParams = req.params;
	params.bodyParams.userId = req.query.userId;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
		async.apply(FogService.createFogInstance, createFogProps),
    	async.apply(FogUserService.createFogUser, createFogUserProps),
	],
	function(err, result) {
		var output;
		if (!err){
			output = params.fogInstance.uuid;
		}
		AppUtils.sendResponse(res, err, 'instanceId', output, result);
	});
};

/******************** Get Fog List EndPoint (Get: /api/v2/instance/getfabriclist) ******************/
const getFogListEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
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
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogService.getFogList, fogListProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'fogList', params.fogList, errMsg);
	});
};

/******************** Get Fog Types EndPoint (Get: /api/v2/getfabrictypes) ******************/
const getFogTypesEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
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
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));


	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogTypeService.getFogTypesList, fogTypesListProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'fogTypesList', params.fogTypesList, errMsg);
	});
};

/***************** Fog Instance Delete EndPoint (Post: /api/v2/authoring/fabric/instance/delete) *************/
const fogInstanceDeleteEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);

	var params = {},
		userProps = {
			userId : 'bodyParams.userId',
			setProperty: 'user'
		},
		instanceProps = {
			instanceId : 'bodyParams.instanceId'
		};

	params.bodyParams = req.body;	
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));
	
	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(ChangeTrackingService.deleteChangeTracking,instanceProps),
		async.apply(FogUserService.deleteFogUserByInstanceId, instanceProps),
		async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
		async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
		async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
		async.apply(FogService.deleteFogInstance, instanceProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
	});
};

/*********** Integrator Instance Delete EndPoint (Post: /api/v2/authoring/integrator/instance/delete) **********/
const integratorInstanceDeleteEndPoint = function(req, res){
  logger.info("Endpoint hitted: "+ req.originalUrl);
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
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));
	
	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(ElementInstanceService.updateElemInstanceByFogUuId, updateByFogUuIdProps),
		async.apply(ChangeTrackingService.deleteChangeTracking, instanceProps),
		async.apply(FogUserService.getFogUserByInstanceId, fogUserProps),
		async.apply(FogAccessTokenService.deleteFogAccessTokenByUserId, instanceProps),
		async.apply(FogUserService.deleteFogUserByInstanceIdAndUserId, deleteFogUserProps),
		//async.apply(UserService.deleteByUserId, instanceProps),
		async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
		async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
		async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
		async.apply(FogService.deleteFogInstance, instanceProps)
	],
	function(err, result) {
		var errMsg = 'Internal error: ' + result;
		AppUtils.sendResponse(res, err, 'Deleted Fog', params.bodyParams.instanceId, errMsg);
	});
};

export default {
  getFogControllerStatusEndPoint: getFogControllerStatusEndPoint,
  fogInstancesListEndPoint: fogInstancesListEndPoint,
  fogInstanceCreateEndPoint: fogInstanceCreateEndPoint,
  getFogListEndPoint: getFogListEndPoint,
  getFogTypesEndPoint: getFogTypesEndPoint,
  fogInstanceDeleteEndPoint: fogInstanceDeleteEndPoint,
  integratorInstanceDeleteEndPoint: integratorInstanceDeleteEndPoint
};
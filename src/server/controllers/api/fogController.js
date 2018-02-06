/**
 * @file fogController.js
 * @author Zishan Iqbal
 * @description This file includes the implementation of the status end-point
 */

import async from 'async';
import express from 'express';
const router = express.Router();

import ChangeTrackingService from '../../services/changeTrackingService';
import ComsatService from '../../services/comsatService';
import ConsoleService from '../../services/consoleService';
import ElementService from '../../services/elementService'
import ElementInstanceService from '../../services/elementInstanceService';
import ElementInstancePortService from '../../services/elementInstancePortService';
import FogAccessTokenService from '../../services/fogAccessTokenService';
import FogProvisionKeyService from '../../services/fogProvisionKeyService';
import FogService from '../../services/fogService';
import FogTypeService from '../../services/fogTypeService';
import FogUserService from '../../services/fogUserService';
import NetworkPairingService from '../../services/networkPairingService';
import SatelliteService from '../../services/satelliteService';
import SatellitePortService from '../../services/satellitePortService';
import StreamViewerService from '../../services/streamViewerService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';


/********************************************* EndPoints ******************************************************/

/**************************** Fog-Controller Status EndPoint (Get: /api/v2/status) ***************************/
const getFogControllerStatusEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);
	var milliseconds = new Date().getTime();
	logger.info("Endpoint served successfully");
	res.status(200);
	res.send({
		"status": "ok",
		"timestamp": milliseconds
	});
};

/******** Fog Instances List By UserID EndPoint (Get: /api/v2/authoring/integrator/instances/list/:t 
												 Post: /api/v2/authoring/fabric/instances/list 	) *******/
const fogInstancesListEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);
	var params = {},

		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},

		fogInstanceForUserProps = {
			userId: 'user.id',
			setProperty: 'fogInstance'
		};

	params.bodyParams = req.params;

	if (req.body.t) {
		params.bodyParams = req.body;
	}

	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogService.getFogInstanceForUser, fogInstanceForUserProps)

	], function (err, result) {
		AppUtils.sendResponse(res, err, 'instances', params.fogInstance, result);
	})
};

/******************** Fog Instance Create EndPoint (Get: /api/v2/instance/create/type/:type) ******************/
const fogInstanceCreateEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);
	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		fogTypeProps = {
			fogTypeId: 'bodyParams.type',
			setProperty: 'fogType'
		},

		createFogProps = {
			name: 'bodyParams.name',
			location: 'bodyParams.location',
			latitude: 'bodyParams.latitude',
			longitude: 'bodyParams.longitude',
			description: 'bodyParams.description',
			fogType: 'bodyParams.type',
			setProperty: 'fogInstance'
		},
		createChangeTrackingProps = {
			fogInstanceId: 'fogInstance.uuid',
			setProperty: null
		},

		createFogUserProps = {
			userId: 'user.id',
			instanceId: 'fogInstance.uuid',
			setProperty: 'fogUser'
		};

	params.bodyParams = req.params;
	params.bodyParams.t = req.query.t;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
		async.apply(FogService.createFogInstance, createFogProps),
		async.apply(ChangeTrackingService.createFogChangeTracking, createChangeTrackingProps),
		async.apply(FogUserService.createFogUser, createFogUserProps),
	],
		function (err, result) {
			var output;
			if (!err) {
				output = params.fogInstance.uuid;
			}
			AppUtils.sendResponse(res, err, 'instanceId', output, result);
		});
};

/******************** Get Fog List EndPoint (Get: /api/v2/instance/getfabriclist) ******************/
// const getFogListEndPoint = function(req, res){
//   logger.info("Endpoint hit: "+ req.originalUrl);
// 	var params = {},
// 		userProps = {
//       		userId: 'bodyParams.t',
//       		setProperty: 'user'
//     	},
//     	fogListProps = {
//       		setProperty: 'fogList'
//     	};

// 	params.bodyParams = req.params;
// 	params.bodyParams.t = req.query.t;
// 	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

// 	async.waterfall([
// 		async.apply(UserService.getUser, userProps, params),
// 		async.apply(FogService.getFogList, fogListProps)
// 	],
// 	function(err, result) {
// 		var errMsg = 'Internal error: ' + result;
// 		AppUtils.sendResponse(res, err, 'fogList', params.fogList, errMsg);
// 	});
// };

/******************** Get Fog Types EndPoint (Get: /api/v2/authoring/fabric/types/list) ******************/
const getFogTypesEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);
	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		fogTypesListProps = {
			setProperty: 'fogTypesList'
		};

	params.bodyParams = req.params;
	params.bodyParams.t = req.query.t;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));


	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogTypeService.getFogTypesList, fogTypesListProps)
	],
		function (err, result) {
			var errMsg = 'Internal error: ' + result;
			AppUtils.sendResponse(res, err, 'fogTypes', params.fogTypesList, errMsg);
		});
};

/***************** Fog Instance Delete EndPoint (Post: /api/v2/authoring/fabric/instance/delete) *************/
const fogInstanceDeleteEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);

	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		instanceProps = {
			instanceId: 'bodyParams.instanceId'
		};

	params.bodyParams = req.body;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(ChangeTrackingService.deleteChangeTracking, instanceProps),
		async.apply(FogUserService.deleteFogUserByInstanceId, instanceProps),
		async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
		async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
		async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
		async.apply(FogService.deleteFogInstance, instanceProps)
	],
		function (err, result) {
			var errMsg = 'Internal error: ' + result;
			AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
		});
};

/*********** Integrator Instance Delete EndPoint (Post: /api/v2/authoring/integrator/instance/delete) **********/
const integratorInstanceDeleteEndPoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);
	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		instanceProps = {
			instanceId: 'bodyParams.instanceId'
		},
		updateByFogUuIdProps = {
			fogInstanceId: 'bodyParams.instanceId',
			updatedFogId: null
		},
		fogProps = {
			fogId: 'bodyParams.instanceId'
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
		async.apply(FogService.getFogInstance, fogProps),
		async.apply(ElementInstanceService.updateElemInstanceByFogUuId, updateByFogUuIdProps),
		async.apply(ChangeTrackingService.deleteChangeTracking, instanceProps),
		async.apply(FogUserService.getFogUserByInstanceId, fogUserProps),
		async.apply(FogAccessTokenService.deleteFogAccessTokenByFogId, fogProps),
		async.apply(FogUserService.deleteFogUserByInstanceIdAndUserId, deleteFogUserProps),
		//async.apply(UserService.deleteByUserId, instanceProps),
		async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
		async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
		async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
		async.apply(FogService.deleteFogInstance, instanceProps)
	],
		function (err, result) {
			var errMsg = 'Internal error: ' + result;
			AppUtils.sendResponse(res, err, 'instanceid', params.bodyParams.instanceId, errMsg);
		});
};

/*********** Get Fog Details EndPoint (Post: /api/v2/authoring/fabric/details) **********/
const getFogDetailsEndpoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);

	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		instanceProps = {
			instanceId: 'bodyParams.instanceId',
			setProperty: 'fogInstances'
		};

	params.bodyParams = req.body;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogService.getFogInstanceDetails, instanceProps)
	],
		function (err, result) {
			AppUtils.sendResponse(res, err, 'fog', params.fogInstances, result);
		});
}

/*********** Update Fog settings EndPoint (Post: /api/v2/authoring/fabric/instances/settings/update) **********/
const updateFogSettingsEndpoint = function (req, res) {
	logger.info("Endpoint hit: " + req.originalUrl);

	var params = {},
		userProps = {
			userId: 'bodyParams.t',
			setProperty: 'user'
		},
		instanceProps = {
			fogId: 'bodyParams.instanceId',
			setProperty: 'fogInstance'
		},
		fogTypeProps = {
			fogTypeId: 'fogInstance.typeKey',
			setProperty: 'fogTypeData'
		};

	params.bodyParams = req.body;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(FogService.getFogInstance, instanceProps),
		async.apply(FogTypeService.getFogTypeDetail, fogTypeProps),
		bluetoothElementForFog,
		debugConsoleForFog,
		streamViewerForFog,
		updateFog,
		updateChangeTracking
	],
		function (err, result) {
			if (!err) {
				var successLabelArr, successValueArr;

				successLabelArr = ['ppp', 'ttt'],
					successValueArr = [params.bodyParams.bluetooth, '1'];

				AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
			} else {
				AppUtils.sendResponse(res, err, '', '', result);
			}
		});
}

const updateFog = function (params, callback) {
	var fogProps = {
		instanceId: 'bodyParams.instanceId',
		updatedFog: {
			name: params.bodyParams.name,
			description: params.bodyParams.description,
			location: params.bodyParams.location,
			networkinterface: params.bodyParams.networkInterface,
			dockerurl: params.bodyParams.dockerUrl,
			disklimit: params.bodyParams.diskLimit,
			diskdirectory: params.bodyParams.diskDirectory,
			memorylimit: params.bodyParams.memoryLimit,
			cpulimit: params.bodyParams.cpuLimit,
			loglimit: params.bodyParams.logLimit,
			logdirectory: params.bodyParams.logDirectory,
			logfilecount: params.bodyParams.logFileCount,
			debug: params.bodyParams.debug,
			viewer: params.bodyParams.viewer,
			bluetooth: params.bodyParams.bluetooth,
			statusfrequency: params.bodyParams.statusFrequency,
			changefrequency: params.bodyParams.changeFrequency,
			isolateddockercontainer: params.bodyParams.docker
		}
	};
	FogService.updateFogInstance(fogProps, params, callback);
}

const streamViewerForFog = function (params, callback) {
	if (params.bodyParams.viewer && (params.bodyParams.viewer != params.fogInstance.viewer)) {
		params.isViewer = 1;
		if (params.bodyParams.viewer > 0) {
			var elementProps = {
				networkElementId: 'fogTypeData.streamViewerElementKey',
				setProperty: 'streamViewerElement'
			},
				streamViewerProps = {
					elementKey: 'fogTypeData.streamViewerElementKey',
					userId: 'user.id',
					fogInstanceId: 'fogInstance.uuid',
					registryId: 'streamViewerElement.registry_id',
					setProperty: 'streamViewerElementInstnace'
				},
				streamViewerPortProps = {
					userId: 'user.id',
					internalPort: 80,
					externalPort: 60400,
					elementId: 'streamViewerElementInstnace.uuid',
					setProperty: 'streamViewerPort'
				},
				elementInstanceProps = {
					updatedData: {
						last_updated: new Date().getTime(),
						updatedBy: params.user.id
					},
					elementId: 'streamViewerElementInstnace.uuid'
				},
				changeTrackingProps = {
					fogInstanceId: 'streamViewerElementInstnace.iofog_uuid',
					changeObject: {
						containerList: new Date().getTime()
					}
				},
				satelliteProps = {
					satelliteId: 'streamViewerSatellitePort.satellite_id',
					setProperty: 'streamViewerSatellite'
				},
				networkElementProps = {
					networkElementId: 'fogTypeData.networkElementKey',
					setProperty: 'streamViewerNetworkElement'
				},
				networkPairingProps = {
					instanceId1: 'fogInstance.uuid',
					instanceId2: null,
					elementId1: 'streamViewerElementInstnace.uuid',
					elementId2: null,
					networkElementId1: 'newStreamViewerNetworkElementInstance.uuid',
					networkElementId2: null,
					isPublic: true,
					elementPortId: 'streamViewerPort.id',
					satellitePortId: 'streamViewerSatellitePort.id',
					setProperty: 'streamViewerNetworkPairingObj'
				},
				changeTrackingProps = {
					fogInstanceId: 'bodyParams.instanceId',
					changeObject: {
						containerConfig: new Date().getTime(),
						containerList: new Date().getTime()
					}
				};

			async.waterfall([
				async.apply(ElementService.getNetworkElement, elementProps, params),
				async.apply(ElementInstanceService.createStreamViewerElement, streamViewerProps),
				async.apply(ElementInstancePortService.createElementInstancePortByPortValue, streamViewerPortProps),
				async.apply(ElementInstanceService.updateElemInstance, elementInstanceProps),
				async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
				ComsatService.openPortOnRadomComsat,
				createStreamViewerSatellitePort,
				async.apply(SatelliteService.getSatelliteById, satelliteProps),
				async.apply(ElementService.getNetworkElement, networkElementProps),
				createStreamViewerNetworkElementInstance,
				async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
				createStreamViewerConsole,
				async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)
			],
				function (err, result) {
					if (!err) {
						callback(null, params);
					} else {
						callback('Error', result);
					}
				});
		}
		else {
			var elementInstanceProps = {
				instanceId: 'bodyParams.instanceId',
			};
			async.waterfall([
				async.apply(ElementInstanceService.deleteStreamViewerInstances, elementInstanceProps, params),
				async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, elementInstanceProps)
			],
				function (err, result) {
					if (!err) {
						callback(null, params);
					} else {
						callback('Error', result);
					}
				});
		}
	}
	else {
		callback(null, params);
	}
}
const createStreamViewerConsole = function (params, callback) {
	var createStreamProps = {
		streamViewerObj: {
			version: 1,
			apiBaseUrl: 'https://' + params.streamViewerSatellite.domain + ':' + params.streamViewerSatellitePort.port2,
			accessToken: JSON.parse(params.streamViewerElementInstnace.config).accesstoken,
			elementId: params.streamViewerElementInstnace.uuid,
			iofog_uuid: params.fogInstance.uuid
		}
	};
	StreamViewerService.createStreamViewer(createStreamProps, params, callback);
}

const createStreamViewerNetworkElementInstance = function (params, callback) {
	var config = {
		'mode': 'public',
		'host': params.streamViewerSatellite.domain,
		'port': params.streamViewerSatellitePort.port1,
		'connectioncount': 60,
		'passcode': params.comsatPort.passcode1,
		'localhost': 'iofog',
		'localport': 60400,
		'heartbeatfrequency': 20000,
		'heartbeatabsencethreshold': 60000
	},
		elementInstanceProps = {
			elementInstance: {
				uuid: AppUtils.generateInstanceId(32),
				trackId: 0,
				element_key: params.fogTypeData.networkElementKey,
				config: JSON.stringify(config),
				name: 'Network for Stream Viewer',
				last_updated: new Date().getTime(),
				updatedBy: params.user.id,
				configLastUpdated: new Date().getTime(),
				isStreamViewer: false,
				isDebugConsole: false,
				isManager: false,
				isNetwork: true,
				registryId: params.streamViewerNetworkElement.registry_id,
				rebuild: false,
				rootHostAccess: false,
				logSize: 50,
				iofog_uuid: params.bodyParams.instanceId,
				volumeMappings: '{"volumemappings": []}'
			},
			setProperty: 'newStreamViewerNetworkElementInstance'
		};

	ElementInstanceService.createElementInstanceObj(elementInstanceProps, params, callback);
}

const createStreamViewerSatellitePort = function (params, callback) {
	var satellitePortProps = {
		satellitePortObj: {
			port1: params.comsatPort.port1,
			port2: params.comsatPort.port2,
			maxConnectionsPort1: 60,
			maxConnectionsPort2: 0,
			passcodePort1: params.comsatPort.passcode1,
			passcodePort2: params.comsatPort.passcode2,
			heartBeatAbsenceThresholdPort1: 60000,
			heartBeatAbsenceThresholdPort2: 0,
			satellite_id: params.satellite.id,
			mappingId: params.comsatPort.id
		},
		setProperty: 'streamViewerSatellitePort'
	};
	SatellitePortService.createSatellitePort(satellitePortProps, params, callback);
}

const debugConsoleForFog = function (params, callback) {
	if (params.bodyParams.debug && (params.bodyParams.debug != params.fogInstance.debug)) {
		params.isDebug = 1;
		if (params.bodyParams.debug > 0) {
			var elementProps = {
				networkElementId: 'fogTypeData.consoleElementKey',
				setProperty: 'debugElement'
			},
				debugConsoleProps = {
					elementKey: 'fogTypeData.consoleElementKey',
					userId: 'user.id',
					fogInstanceId: 'fogInstance.uuid',
					registryId: 'debugElement.registry_id',
					setProperty: 'debugConsole'
				},
				debugConsolePortProps = {
					userId: 'user.id',
					internalPort: 80,
					externalPort: 60401,
					elementId: 'debugConsole.uuid',
					setProperty: 'debugConsolePort'
				},
				elementInstanceProps = {
					updatedData: {
						last_updated: new Date().getTime(),
						updatedBy: params.user.id
					},
					elementId: 'debugConsole.uuid'
				},
				changeTrackingProps = {
					fogInstanceId: 'debugConsole.iofog_uuid',
					changeObject: {
						containerList: new Date().getTime()
					}
				},
				satelliteProps = {
					satelliteId: 'satellitePort.satellite_id',
					setProperty: 'satellite'
				},
				networkElementProps = {
					networkElementId: 'fogTypeData.networkElementKey',
					setProperty: 'networkElement'
				},
				networkPairingProps = {
					instanceId1: 'fogInstance.uuid',
					instanceId2: null,
					elementId1: 'debugConsole.uuid',
					elementId2: null,
					networkElementId1: 'newNetworkElementInstance.uuid',
					networkElementId2: null,
					isPublic: true,
					elementPortId: 'debugConsolePort.id',
					satellitePortId: 'satellitePort.id',
					setProperty: 'networkPairingObj'
				},
				changeTrackingProps = {
					fogInstanceId: 'bodyParams.instanceId',
					changeObject: {
						containerConfig: new Date().getTime(),
						containerList: new Date().getTime()
					}
				};

			async.waterfall([
				async.apply(ElementService.getNetworkElement, elementProps, params),
				async.apply(ElementInstanceService.createDebugConsole, debugConsoleProps),
				async.apply(ElementInstancePortService.createElementInstancePortByPortValue, debugConsolePortProps),
				async.apply(ElementInstanceService.updateElemInstance, elementInstanceProps),
				async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
				ComsatService.openPortOnRadomComsat,
				createSatellitePort,
				async.apply(SatelliteService.getSatelliteById, satelliteProps),
				async.apply(ElementService.getNetworkElement, networkElementProps),
				createNetworkElementInstance,
				async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),
				createConsole,
				async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)

			],
				function (err, result) {
					if (!err) {
						callback(null, params);
					} else {
						callback('Error', result);
					}
				});
		}
		else {
			var elementInstanceProps = {
				instanceId: 'bodyParams.instanceId',
			};

			async.waterfall([
				async.apply(ElementInstanceService.deleteDebugConsoleInstances, elementInstanceProps, params),
				async.apply(ConsoleService.deleteConsoleByFogInstanceId, elementInstanceProps)
			],
				function (err, result) {
					if (!err) {
						callback(null, params);
					} else {
						callback('Error', result);
					}
				});
		}
	}
	else {
		callback(null, params);
	}
}

const createConsole = function (params, callback) {
	var createConsoleProps = {
		consoleObj: {
			version: 1,
			apiBaseUrl: 'https://' + params.satellite.domain + ':' + params.satellitePort.port2,
			accessToken: JSON.parse(params.debugConsole.config).accesstoken,
			elementId: params.debugConsole.uuid,
			iofog_uuid: params.fogInstance.uuid
		}
	};
	ConsoleService.createConsole(createConsoleProps, params, callback)
}

const createNetworkElementInstance = function (params, callback) {
	var config = {
		'mode': 'public',
		'host': params.satellite.domain,
		'port': params.satellitePort.port1,
		'connectioncount': 60,
		'passcode': params.comsatPort.passcode1,
		'localhost': 'iofog',
		'localport': 60401,
		'heartbeatfrequency': 20000,
		'heartbeatabsencethreshold': 60000
	},
		elementInstanceProps = {
			elementInstance: {
				uuid: AppUtils.generateInstanceId(32),
				trackId: 0,
				element_key: params.fogTypeData.networkElementKey,
				config: JSON.stringify(config),
				name: 'Network for Debug Console',
				last_updated: new Date().getTime(),
				updatedBy: params.user.id,
				configLastUpdated: new Date().getTime(),
				isStreamViewer: false,
				isDebugConsole: false,
				isManager: false,
				isNetwork: true,
				registryId: params.networkElement.registry_id,
				rebuild: false,
				rootHostAccess: false,
				logSize: 50,
				iofog_uuid: params.bodyParams.instanceId,
				volumeMappings: '{"volumemappings": []}'
			},
			setProperty: 'newNetworkElementInstance'
		};

	ElementInstanceService.createElementInstanceObj(elementInstanceProps, params, callback);
}


const createSatellitePort = function (params, callback) {
	var satellitePortProps = {
		satellitePortObj: {
			port1: params.comsatPort.port1,
			port2: params.comsatPort.port2,
			maxConnectionsPort1: 60,
			maxConnectionsPort2: 0,
			passcodePort1: params.comsatPort.passcode1,
			passcodePort2: params.comsatPort.passcode2,
			heartBeatAbsenceThresholdPort1: 60000,
			heartBeatAbsenceThresholdPort2: 0,
			satellite_id: params.satellite.id,
			mappingId: params.comsatPort.id
		},
		setProperty: 'satellitePort'
	};
	SatellitePortService.createSatellitePort(satellitePortProps, params, callback);
}

const bluetoothElementForFog = function (params, callback) {
	if (params.bodyParams.bluetooth != params.fogInstance.bluetooth) {
		params.isBluetooth = 1;
		if (params.bodyParams.bluetooth > 0) {
			var elementProps = {
				networkElementId: 'fogTypeData.bluetoothElementKey',
				setProperty: 'bluetoothElement'
			},
				changeTrackingProps = {
					fogInstanceId: 'bodyParams.instanceId',
					changeObject: {
						containerConfig: new Date().getTime(),
						containerList: new Date().getTime()
					}
				};

			async.waterfall([
				async.apply(ElementService.getNetworkElement, elementProps, params),
				createBluetoothElementInstance,
				async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)
			],
				function (err, result) {
					if (!err) {
						callback(null, params);
					} else {
						callback('Error', result);
					}
				});
		} else {
			var elementInstanceProps = {
				instanceId: 'bodyParams.instanceId',
				elementKey: 'fogTypeData.bluetoothElementKey'
			};
			ElementInstanceService.deleteElementInstancesByInstanceIdAndElementKey(elementInstanceProps, params, callback);
		}
	} else {
		callback(null, params);
	}
}

const updateChangeTracking = function (params, callback) {
	//	if(params.isBluetooth == 1 || params.isDebug == 1 || params.isViewer == 1){
	var changeTrackingProps = {
		fogInstanceId: 'bodyParams.instanceId',
		changeObject: {
			containerList: new Date().getTime(),
			config: new Date().getTime(),
            reboot: params.bodyParams.reboot
		}
    }

	ChangeTrackingService.updateChangeTracking(changeTrackingProps, params, callback);
	//	}else{
	//		callback(null, params);
	//	}
}

const createBluetoothElementInstance = function (params, callback) {
	var elementInstanceProps = {
		elementInstance: {
			uuid: AppUtils.generateInstanceId(32),
			trackId: 0,
			element_key: params.fogTypeData.bluetoothElementKey,
			config: '{}',
			configLastUpdated: new Date().getTime(),
			name: params.bluetoothElement.name,
			updatedBy: params.user.id,
			iofog_uuid: params.bodyParams.instanceId,
			isStreamViewer: false,
			isDebugConsole: false,
			isManager: false,
			isNetwork: false,
			rootHostAccess: true,
			logSize: 50,
			volumeMappings: '{"volumemappings": []}',
			registryId: params.bluetoothElement.registry_id,
			rebuild: false
		},
		setProperty: 'newBluetoothElementInstance'
	};

	ElementInstanceService.createElementInstanceObj(elementInstanceProps, params, callback);
}

/****************** Add Bluebox EndPoint (Post: /api/v2/authoring/fabric/instance/bluebox/add) ***************/
// const addBlueboxEndpoint = function (req, res){
// 	logger.info("Endpoint hit: "+ req.originalUrl);

// 	var params = {},
// 		userProps = {
// 			userId : 'bodyParams.t',
// 			setProperty: 'user'
// 		},
// 		generatedIdsProps = {
// 		 	bbid: 'bodyParams.token',
// 		 	setProperty:'tokenData'
// 		},
// 		fogControllerProps = {
// 			uuid: 'tokenData.controllerId',
// 			setProperty: 'fogControllerData'
// 		},
// 		instanceProps = {
// 			fogId: 'tokenData.iofog_uuid',
// 			setProperty: 'fogData'
// 		},
// 		getTrackingProps = {
// 			instanceId: 'tokenData.iofog_uuid',
// 			setProperty: 'changeTrackingData'
// 		};

// 	params.bodyParams = req.body;	
// 	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

// 	async.waterfall([
// 		async.apply(UserService.getUser, userProps, params),
// 		async.apply(GeneratedIdsService.findGeneratedIdsByBBID, generatedIdsProps),
// 		async.apply(FogControllerService.findFogControllersByUUID, fogControllerProps),
// 		validateFogInstance,
// 		async.apply(FogService.getFogInstanceOptional, instanceProps),
// 		createFogInstanceWithUUID,
// 		updateGeneratedIdsByBBID,
// 		async.apply(ChangeTrackingService.getChangeTrackingByInstanceId, getTrackingProps),
// 		createChangeTracking,

// 	],
// 	function(err, result) {
// 		AppUtils.sendResponse(res, err, 'test', params, result);
// 	});
// }

// const createChangeTracking = function(params, callback){
// 	if(!params.changeTrackingData){
// 		var changeTrackingProps = {
//       		fogInstanceId: 'tokenData.iofog_uuid',
//       		setProperty: 'newChangeTracking'
//     	};

// 		ChangeTrackingService.createFogChangeTracking(changeTrackingProps, params, callback);
// 	}else{
// 		callback(null, params);
// 	}
// }

// const createFogInstanceWithUUID = function(params, callback){
// 	if (!params.fogData){
// 		var fogProps = {
// 			fogObj :{
//     			uuid: params.tokenData.iofog_uuid,
//     			name: 'My BlueBox',
//     			location: '',
//     			latitude: '',
//     			longitude: '',
//     			description: '',
//     			token: '',
//     			typeKey: '2',
//     			daemonstatus: 'Not provisioned',
//     			daemonlaststart: 0,
//     			lastactive: 0,
//     			elementstatus: 0,
//     			memoryviolation: 'no',
//     			diskviolation: 'no',
//     			cpuviolation: 'no',
//     			repositorycount: 0,
// 	    		repositorystatus: '',
//     			systemtime: 0,
//     			laststatustime: 0,
//     			elementmessagecounts: '',
// 	    		messagespeed: 0,
//     			lastcommandtime: 0,
//     			version: ''
// 			},
// 			setProperty: 'blueBoxFogIntance'
// 		};
// 		FogService.createFogInstanceWithUUID(fogProps, params, callback);
// 	}else{
// 		callback('Error', 'Registration failed: Unable to create fog instance.')
// 	}
// }

// const validateFogInstance = function(params, callback){ 
// 	if(params.tokenData.iofog_uuid){
// 		if(params.tokenData.iofog_uuid.length == 32){
// 			callback(null, params);
// 		}else{
// 			callback('Error', 'Registration failed: Unable to create fog instance.')
// 		}
// 	}else{
// 		callback('Error', 'Registration failed: Unable to create fog instance.')
// 	}
// }


// const updateGeneratedIdsByBBID = function(params, callback){ 
// 	var updateProps = {
// 		updatedObj: {
// 			email: params.user.email,
// 			firstName: params.user.firstName,
// 			lastName: params.user.lastName,
// 			activated: 1
// 		},
// 		bbid: 'bodyParams.token'
// 	};	

// 	GeneratedIdsService.updateGeneratedIdsByBBID(updateProps, params, callback);
// }


export default {
	//  addBlueboxEndpoint: addBlueboxEndpoint,
	getFogDetailsEndpoint: getFogDetailsEndpoint,
	getFogControllerStatusEndPoint: getFogControllerStatusEndPoint,
	fogInstancesListEndPoint: fogInstancesListEndPoint,
	fogInstanceCreateEndPoint: fogInstanceCreateEndPoint,
	// getFogListEndPoint: getFogListEndPoint,
	getFogTypesEndPoint: getFogTypesEndPoint,
	fogInstanceDeleteEndPoint: fogInstanceDeleteEndPoint,
	integratorInstanceDeleteEndPoint: integratorInstanceDeleteEndPoint,
	updateFogSettingsEndpoint: updateFogSettingsEndpoint
};
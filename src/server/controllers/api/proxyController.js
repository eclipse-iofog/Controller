/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

/**
 * @file proxyController.js
 * @author epankov
 * @description This file includes the implementation of the proxy end-point
 */

import async from 'async';
import BaseApiController from './baseApiController';
import ChangeTrackingService from '../../services/changeTrackingService';
import UserService from '../../services/userService';
import ProxyService from '../../services/proxyService';
import FogService from '../../services/fogService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import configUtil from '../../utils/configUtil';
import constants from '../../constants';
/********************************************* EndPoints ******************************************************/


/**
 * ioAuthoring end point to get proxy config
 * (Post: /api/v2/authoring/fog/instance/proxy/data)
 * @param req request
 * @param res response
 */
const getProxyDataEndPoint = function(req, res) {
	logger.info("Endpoint hit: "+ req.originalUrl);

	let params = {},
		userProps = {
			userId : 'bodyParams.t',
			setProperty: 'user'
		},
		fogProps = {
			fogId: 'bodyParams.instanceId',
			setProperty: 'fogInstance'
		};

	params.bodyParams = req.body;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		    async.apply(UserService.getUser, userProps, params),
		    async.apply(FogService.getFogInstance, fogProps),
            getProxyData
	    ], function(err, result) {
		AppUtils.sendResponse(res, err, 'proxyData', params.proxyData, result);
	});

}

/**
 * ioAuthoring end point to create proxy for specific iofog instance
 * (Post: /api/v2/authoring/fog/instance/proxy/createOrUpdate)
 * @param req request
 * @param res response
 */
const saveProxyEndPoint = function(req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
        userProps = {
            userId : 'bodyParams.t',
            setProperty: 'user'
        },
        changeTrackingProps = {
            fogInstanceId: 'bodyParams.instanceId',
            changeObject: {
                proxy: new Date().getTime()
            }
        }

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            getProxyConfigData,
            saveProxy,
            async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)
        ],
        function(err, result) {
            let errMsg = 'Internal error: ' + result;
            AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
        });
};

/**
 * ioAuthoring end point to close proxy for specific iofog instance
 * (Post: /api/v2/authoring/fog/instance/proxy/close)
 * @param req request
 * @param res response
 */
const closeProxyEndPoint = function(req, res) {
  logger.info("Endpoint hit:"+ req.originalUrl);

    let params = {},
        userProps = {
            userId : 'bodyParams.t',
            setProperty: 'user'
        },
        changeTrackingProps = {
            fogInstanceId: 'bodyParams.instanceId',
            changeObject: {
                proxy: new Date().getTime()
            }
        },
        proxyProps = {
            fogInstanceId: 'bodyParams.instanceId',
            changeObject: {
                close: true
            }
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(ProxyService.updateProxy, proxyProps),
            async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)
        ],
        function(err, result) {
            let errMsg = 'Internal error: ' + result;
            AppUtils.sendResponse(res, err,'','', errMsg);
        });
};

/**
 * ioFog end point to retrieve proxy info for specific iofog instance
 * (Post: /api/v2/instance/proxyconfig/id/:ID/token/:Token)
 * @param req request
 * @param res response
 */
const getProxyEndPoint = function(req, res) {
    logger.info("Endpoint hit:"+ req.originalUrl);

    let params = {},
        instanceProps = {
            fogInstanceId: 'bodyParams.ID',
            setProperty: 'config'
        };

    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(BaseApiController.checkUserExistance, req, res),
        async.apply(ProxyService.getProxyByInstanceId, instanceProps, params)
    ], function(err, result) {
        AppUtils.sendResponse(res, err, 'config', params.config, result);
    })
};

/**
 * ioAuthoring end point to retrieve proxy close status for specific iofog instance
 * (Post: /api/v2/authoring/fog/instance/proxy/closeStatus)
 * @param req request
 * @param res response
 */
const getProxyCloseStatusEndPoint = function(req, res) {
	logger.info("Endpoint hit: "+ req.originalUrl);

	let params = {},
		userProps = {
			userId : 'bodyParams.t',
			setProperty: 'user'
		},
		instanceProps = {
		fogInstanceId: 'bodyParams.instanceId',
		setProperty: 'proxyData'
	};

	params.bodyParams = req.body;
	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

	async.waterfall([
		async.apply(UserService.getUser, userProps, params),
		async.apply(ProxyService.getProxyByInstanceId, instanceProps),
		getProxyCloseStatus
	], function(err, result) {
		AppUtils.sendResponse(res, err, 'proxyCloseStatus', params.proxyCloseStatus, result);
	})
};

/**
 * ioFog end point to update proxy status
 * (Post: /api/v2/instance/proxyconfig/changes/id/:ID/token/:Token)
 * @param req request
 * @param res response
 */
const updateProxyStatusEndPoint = function(req, res) {
    logger.info("Endpoint hit:"+ req.originalUrl);

    let params = {},
        instanceProps = {
            instanceId: 'bodyParams.ID',
            updatedFog: {
                proxy: req.body.proxystatus
            }
        };

    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(BaseApiController.checkUserExistance, req, res),
        async.apply(FogService.updateFogInstance, instanceProps, params)
    ], function(err, result) {
        AppUtils.sendResponse(res, err,'','', result);
    })
};

/*************************************** Extra Functions *************************************************/
/**
 * updates proxy info if it exists and creates new one in other case.
 * @param params parameters
 * @param callback  waterfall callback
 */
const saveProxy = function(params, callback) {
    let proxyProps;
    let proxyObject = {
        username: params.proxyData.username,
        password: params.proxyData.password,
        host: params.proxyData.host,
        lport: params.proxyData.lport,
        rport: params.proxyData.rport,
        rsakey: params.proxyData.rsaKey,
        close: false,
        iofog_uuid: params.bodyParams.instanceId
    };

	proxyProps = {
		fogInstanceId: 'bodyParams.instanceId',
	    proxy : proxyObject,
		setProperty: 'proxy'
	};

	ProxyService.saveProxy(proxyProps, params, callback);
};

const getProxyData = function(params, callback) {
    let proxyObj = JSON.parse(params.fogInstance.proxy);
	params.proxyData = {
	    host: proxyObj.host,
		username: proxyObj.username,
	    rport: proxyObj.rport,
		lport: proxyObj.lport,
		status: proxyObj.status
    };
    callback(null, params);
}

const getProxyCloseStatus = function(params, callback) {
	params.proxyCloseStatus = params.proxyData.close;
	callback(null, params);
}

const getProxyConfigData = function(params, callback) {
	try{
		configUtil.getAllConfigs().then(() => {
			let proxyUsername = configUtil.getConfigParam(constants.CONFIG.proxy_username),
				proxyPassword = configUtil.getConfigParam(constants.CONFIG.proxy_password),
				proxyHost = configUtil.getConfigParam(constants.CONFIG.proxy_host),
				proxyLocalPort = configUtil.getConfigParam(constants.CONFIG.proxy_lport) || 22,
                proxyRsaKey = configUtil.getConfigParam(constants.CONFIG.proxy_rsa_key);

			const cb  = function(port, params) {
				params.proxyData = {
					username: proxyUsername,
					password: proxyPassword,
					host: proxyHost,
					lport: proxyLocalPort,
					rport: port,
					rsaKey: proxyRsaKey
				};
				callback(null, params);
			}

			AppUtils.findAvailablePort(proxyHost, params, cb);
		});
	}catch(e){
		logger.error(e);
	}
}

export default {
    saveProxyEndPoint: saveProxyEndPoint,
    closeProxyEndPoint: closeProxyEndPoint,
    getProxyEndPoint: getProxyEndPoint,
    updateProxyStatusEndPoint: updateProxyStatusEndPoint,
	getProxyDataEndPoint: getProxyDataEndPoint,
	getProxyCloseStatusEndPoint: getProxyCloseStatusEndPoint
};
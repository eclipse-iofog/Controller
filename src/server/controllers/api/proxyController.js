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

const async = require('async');
const BaseApiController = require('./baseApiController');
const ChangeTrackingService = require('../../services/changeTrackingService');
const UserService = require('../../services/userService');
const ProxyService = require('../../services/proxyService');
const FogService = require('../../services/fogService');

const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');

/********************************************* EndPoints ******************************************************/

/**
 * ioAuthoring end point to create proxy for specific iofog instance
 * (Post: /api/v2/authoring/fog/instance/proxy/createOrUpdate)
 * @param req request
 * @param res response
 */
const createOrUpdateProxyEndPoint = function(req, res) {
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
        },
        proxyProps = {
            fogInstanceId: 'bodyParams.instanceId',
            setProperty: 'proxy'
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(ProxyService.getProxyByInstanceId, proxyProps),
            updateProxyStatusToPendingOpen,
            createOrUpdateProxy,
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
            updateProxyStatusToPendingClose,
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
 * ioAuthoring end point to retrieve proxy status
 * (Get: /api/v2/authoring/fog/proxy/status)
 * @param req request
 * @param res response
 */
const getProxyStatusEndPoint = function(req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        proxyProps = {
            fogInstanceId: 'bodyParams.instanceId',
            setProperty: 'proxy'
        };

    params.bodyParams = req.params;
    params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(ProxyService.getProxyByInstanceId, proxyProps)
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.proxy;
            }
            // let errMsg = 'Internal error: ' + result;
            // AppUtils.sendResponse(res, err, 'proxy', params.proxy, errMsg);
            AppUtils.sendResponse(res, err, 'output', output, result);
        });
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
const createOrUpdateProxy = function(params, callback) {
    let proxyProps;
    let proxyObject = {
        username: params.bodyParams.username,
        password: params.bodyParams.password,
        host: params.bodyParams.host,
        lport: params.bodyParams.lport,
        rport: params.bodyParams.rport,
        rsakey: params.bodyParams.rsakey,
        close: false,
        iofog_uuid: params.bodyParams.instanceId
    };

    if (params.proxy) {
         proxyProps = {
            fogInstanceId: 'bodyParams.instanceId',
            changeObject: proxyObject
        };
        ProxyService.updateProxy(proxyProps, params, callback);
    } else {
        proxyProps = {
            proxy : proxyObject,
            setProperty: 'proxy'
        };
        ProxyService.createProxy(proxyProps, params, callback);
    }
};

const updateProxyStatusToPendingOpen = function(params, callback) {

    let proxyObj = {
        username: params.bodyParams.username,
        host: params.bodyParams.host,
        lport: params.bodyParams.lport,
        rport: params.bodyParams.rport,
        status: "PENDING_OPEN",
        errormessage: ""
    };
    let proxyStr = JSON.stringify(proxyObj);
    let fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
            proxy: proxyStr
        }
    };
    FogService.updateFogInstance(fogInstanceProps, params, callback);
};

const updateProxyStatusToPendingClose = function(params, callback) {
    let fogInstanceProps= {
        fogId: 'bodyParams.instanceId',
        setProperty: 'fogInstance'
    };
    async.waterfall([
        async.apply(FogService.getFogInstance, fogInstanceProps, params),
        updateProxyStatusObj
    ], function(err, result) {
        callback(null, params);
    });

};

const updateProxyStatusObj = function(params, callback) {
    let oldProxyStr = params.fogInstance.proxy;
    let oldProxyObj = JSON.parse(oldProxyStr);
    let proxyObj = {
        username: oldProxyObj.username,
        host: oldProxyObj.host,
        lport: oldProxyObj.lport,
        rport: oldProxyObj.rport,
        status: "PENDING_CLOSE",
        errormessage: ""
    };
    let proxyStr = JSON.stringify(proxyObj);
    let fogInstanceProps = {
        instanceId: 'bodyParams.instanceId',
        updatedFog: {
            proxy: proxyStr
        }
    };
    FogService.updateFogInstance(fogInstanceProps, params, callback);
};


module.exports =  {
    createOrUpdateProxyEndPoint: createOrUpdateProxyEndPoint,
    closeProxyEndPoint: closeProxyEndPoint,
    getProxyEndPoint: getProxyEndPoint,
    getProxyStatusEndPoint: getProxyStatusEndPoint,
    updateProxyStatusEndPoint: updateProxyStatusEndPoint
};
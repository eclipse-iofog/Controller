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

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/**
 * ioAuthoring end point to create proxy for specific iofog instance
 * @param req request
 * @param res response
 */
const proxyCreateOrUpdateEndPoint = function(req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    var params = {},
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
            createOrUpdateProxy,
            async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)
        ],
        function(err, result) {
            var errMsg = 'Internal error: ' + result;
            AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
        });
};

/**
 * ioAuthoring end point to close proxy for specific iofog instance
 * @param req request
 * @param res response
 */
const proxyCloseEndPoint = function(req, res) {
  logger.info("Endpoint hit:"+ req.originalUrl);

    var params = {},
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
            var errMsg = 'Internal error: ' + result;
            AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
        });
};

/**
 * ioFog end point to retrieve proxy info for specific iofog instance
 * @param req request
 * @param res response
 */
const proxyGetEndPoint = function(req, res) {
    logger.info("Endpoint hit:"+ req.originalUrl);

    var params = {},
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

const getProxyStatusEndPoint = function(req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    var params = {},
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
            var output;
            if (!err) {
                output = params.proxy;
            }
            // var errMsg = 'Internal error: ' + result;
            // AppUtils.sendResponse(res, err, 'proxy', params.proxy, errMsg);
            AppUtils.sendResponse(res, err, 'output', output, result);
        });
};

/*************************************** Extra Functions *************************************************/
/**
 * updates proxy info if it exists and creates new one in other case.
 * @param params parameters
 * @param callback  waterfall callback
 */
const createOrUpdateProxy = function(params, callback) {
    var proxyProps;
    var proxyObject = {
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


export default {
    proxyCreateOrUpdateEndPoint: proxyCreateOrUpdateEndPoint,
    proxyCloseEndPoint: proxyCloseEndPoint,
    proxyGetEndPoint: proxyGetEndPoint,
    getProxyStatusEndPoint: getProxyStatusEndPoint
};
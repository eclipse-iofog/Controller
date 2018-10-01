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
 * @author elukashick
 */

const async = require('async');

const BaseApiController = require('./baseApiController');
const AppUtils = require('../../utils/appUtils');
const logger = require('../../utils/winstonLogs');
const instanceResourcesService = require('../../services/instanceResourcesService');
const UserService = require('../../services/userService');


/********************************************* EndPoints ******************************************************/

/******************** Fog Instance HWInfo (Post: /api/v2/instance/hw_info/id/:ID/token/:Token) ******************/
const fogInstanceHWInfo = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        fogHWInfo = {
            fogInfo: 'body.info',
            uuid: 'bodyParams.ID',
            setProperty: 'fogHWInfo'
        };

    params.body = req.body;
    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(BaseApiController.checkUserExistance, req, res),
            async.apply(instanceResourcesService.saveHWInfo, fogHWInfo, params)
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.bodyParams.ID;
            }
            AppUtils.sendResponse(res, err, 'uuid', output, result);
        });
};
/******************** Fog Instance USBInfo (Post: /api/v2/instance/usb_info/id/:ID/token/:Token) ******************/
const fogInstanceUSBInfo = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        fogUSBInfo = {
            fogInfo: 'body.info',
            uuid: 'bodyParams.ID',
            setProperty: 'fogHWInfo'
        };

    params.body = req.body;
    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(BaseApiController.checkUserExistance, req, res),
            async.apply(instanceResourcesService.saveUSBInfo, fogUSBInfo, params)
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.bodyParams.ID;
            }
            AppUtils.sendResponse(res, err, 'uuid', output, result);
        });
};

/*********** POST getFogHwInfoEndPoint EndPoint (Post: /api/v2/authoring/fog/info/hw) **********/
const getFogHwInfoEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
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
            async.apply(instanceResourcesService.getFogHwInfo, instanceProps)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'fog', params.fogInstances, result);
        });
};
/*********** POST getFogUsbInfoEndPoint EndPoint (Post: /api/v2/authoring/fog/info/usb) **********/
const getFogUsbInfoEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
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
            async.apply(instanceResourcesService.getFogUsbInfo, instanceProps)
        ],
        function (err, result) {
            AppUtils.sendResponse(res, err, 'fog', params.fogInstances, result);
        });
};


module.exports =  {
    fogInstanceHWInfo: fogInstanceHWInfo,
    fogInstanceUSBInfo: fogInstanceUSBInfo,
    getFogHwInfoEndPoint: getFogHwInfoEndPoint,
    getFogUsbInfoEndPoint: getFogUsbInfoEndPoint
};
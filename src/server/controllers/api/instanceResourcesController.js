/**
 * @author elukashick
 */

import async from 'async';
import express from 'express';

const router = express.Router();

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import instanceResourcesService from "../../services/instanceResourcesService";
import UserService from "../../services/userService";


/********************************************* EndPoints ******************************************************/

/******************** Fog Instance HWInfo (Post: /api/v2/instance/hw_info/id/:ID/token/:Token) ******************/
const fogInstanceHWInfo = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        fogHWInfo = {
            fogInfo: 'body.info',
            uuid: 'params.ID',
            setProperty: 'fogHWInfo'
        };

    params.body = req.body;
    params.params = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(instanceResourcesService.saveHWInfo, fogHWInfo, params),
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.params.ID;
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
            uuid: 'params.ID',
            setProperty: 'fogHWInfo'
        };

    params.body = req.body;
    params.params = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(instanceResourcesService.saveUSBInfo, fogUSBInfo, params),
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.params.ID;
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


export default {
    fogInstanceHWInfo: fogInstanceHWInfo,
    fogInstanceUSBInfo: fogInstanceUSBInfo,
    getFogHwInfoEndPoint: getFogHwInfoEndPoint,
    getFogUsbInfoEndPoint: getFogUsbInfoEndPoint
};
/**
 * @author elukashick
 */

import async from 'async';
import express from 'express';

const router = express.Router();

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import instanceResourcesService from "../../services/instanceResourcesService";


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


export default {
    fogInstanceHWInfo: fogInstanceHWInfo,
    fogInstanceUSBInfo: fogInstanceUSBInfo,
};
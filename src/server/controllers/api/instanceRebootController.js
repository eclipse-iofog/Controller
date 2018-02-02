/**
 * @file instanceRebootController.js
 * @author Alex Shpak
 * @description This file includes the implementation of the instance-reboot end-point
 */
import async from 'async';

import BaseApiController from './baseApiController';
import RebootService from '../../services/rebootService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';

/********************************************* EndPoints ******************************************************/

/********* Instance Reboot EndPoint (Get/Post: /api/v2/instance/reboot/id/:ID/token/:Token) **********/
const instanceRebootEndPoint = function (req, res){
    logger.info("Endpoint hit: "+ req.originalUrl);
    var params = {},
        instanceProps = {
            instanceId: 'bodyParams.ID',
            setProperty: 'reboot'
        };

    params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(BaseApiController.checkUserExistance, req, res),
        async.apply(RebootService.findRebootByInstanceId, instanceProps, params)

    ], function(err, result) {
        AppUtils.sendResponse(res, err, 'reboot', params.registry, result);
    });
};

export default {
    instanceRebootEndPoint: instanceRebootEndPoint
};
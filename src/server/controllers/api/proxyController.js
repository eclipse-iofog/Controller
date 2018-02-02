/**
 * @file proxyController.js
 * @author epankov
 * @description This file includes the implementation of the proxy end-point
 */

import async from 'async';
import ChangeTrackingService from '../../services/changeTrackingService';

const proxyCreateEndPoint = function(req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    var params = {},
        userProps = {
            userId : 'bodyParams.t',
            setProperty: 'user'
        },
        instanceProps = {
            instanceId : 'bodyParams.instanceId'
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(UserService.getUser, userProps, params),
            async.apply(ChangeTrackingService.updateChangeTracking, instanceProps),

        ],
        function(err, result) {
            var errMsg = 'Internal error: ' + result;
            AppUtils.sendResponse(res, err, 'instanceId', params.bodyParams.instanceId, errMsg);
        });

};

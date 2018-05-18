
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

import async from 'async';
import logger from "../../utils/winstonLogs";
import BaseApiController from "./baseApiController";
import AppUtils from "../../utils/appUtils";
import FogProvisionKeyService from "../../services/fogProvisionKeyService";
import FogVersionCommandService from "../../services/fogVersionCommandService";
import ChangeTrackingService from "../../services/changeTrackingService";
import FogVersionCommand from "../../models/fogVersionCommand";


/********************************************* EndPoints ******************************************************/
/************* Change Version EndPoint (Get/Post: /api/v2/authoring/fog/version/change) ******************/
const changeVersionEndPoint = function (req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);
    var params = {},
        currentTime = new Date().getTime(),
        fogProps = {
            instanceId: 'bodyParams.instanceId',
            setProperty: 'newProvision'
        },
        commandProps = {
            instanceId: 'bodyParams.instanceId',
            versionCommand: 'bodyParams.versionCommand',
            setProperty: 'newVersionCommand'
        },
        pubChangeVersionProps = {
            fogInstanceId: 'bodyParams.instanceId',
            changeObject: {
                version: currentTime
            }
        };
    // params.bodyParams = req.params;
    params.bodyParams = req.body;

    async.waterfall([
        async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, fogProps, params),
        async.apply(FogProvisionKeyService.createProvisonKeyByInstanceId, fogProps),
        async.apply(FogProvisionKeyService.deleteExpiredProvisionKeys),

        async.apply(FogVersionCommandService.deleteVersionCommandByInstanceId, fogProps),
        async.apply(FogVersionCommandService.createVersionCommandByInstanceId, commandProps),
        async.apply(ChangeTrackingService.updateChangeTracking, pubChangeVersionProps)

    ],function(err, result) {
        AppUtils.sendResponse(res, err, null, null, "Problem with version command")
    });
};

/********** Instance Version EndPoint (Get/Post: /api/v2/instance/version/id/:instanceId/token/:Token) ***************/
const instanceVersionEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    var params = {},
        versionCommandProps = {
            instanceId: 'bodyParams.instanceId',
            setProperty: 'version'
        },
        provisionKeyProps = {
            instanceId: 'bodyParams.instanceId',
            setProperty: 'provision'
        };
    params.bodyParams = req.params;

    async.waterfall([
        async.apply(BaseApiController.checkfogExistance, req, res),
        async.apply(FogVersionCommandService.getVersionCommandByInstanceId, versionCommandProps, params),
        async.apply(FogProvisionKeyService.getProvisionKeyByInstanceId, provisionKeyProps),
        async.apply(FogVersionCommandService.deleteVersionCommandByInstanceId, versionCommandProps)
    ],function(err, result) {

        var outputProvisionKey, outputExpirationTime, outputVersionCommand,
            successLabelArr, successValueArr;

        if (params.provision) {
            outputProvisionKey= params.provision.provisionKey;
            outputExpirationTime = params.provision.expirationTime;
        }

        if (params.version) {
            outputVersionCommand = params.version.versionCommand
        }

        successLabelArr= ["versionCommand", "provisionKey", "expirationTime"];
        successValueArr= [outputVersionCommand, outputProvisionKey, outputExpirationTime];

        AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
    });


};

export default {
    instanceVersionEndPoint: instanceVersionEndPoint,
    changeVersionEndPoint: changeVersionEndPoint
};
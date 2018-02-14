
import async from 'async';
import logger from "../../utils/winstonLogs";
import BaseApiController from "./baseApiController";
import AppUtils from "../../utils/appUtils";
import FogProvisionKeyService from "../../services/fogProvisionKeyService";
import FogVersionCommandService from "../../services/fogVersionCommandService";
import ChangeTrackingService from "../../services/changeTrackingService";
import FogVersionCommand from "../../models/fogVersionCommand";


/********************************************* EndPoints ******************************************************/
/************* Change Version EndPoint (Get/Post: /api/v2/authoring/fabric/version/instanceid/:instanceId/) ******************/
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
        FogProvisionKeyService.deleteExpiredProvisionKeys

    ],function(err, result) {
        if (err) {
            var errMsg = "Problem with new provision key";
            AppUtils.sendMultipleResponse(res, err, null, null, errMsg)
        } else {
            async.waterfall([
                async.apply(FogVersionCommandService.deleteVersionCommandByInstanceId, fogProps, params),
                async.apply(FogVersionCommandService.createVersionCommandByInstanceId, commandProps),
                async.apply(ChangeTrackingService.updateChangeTracking, pubChangeVersionProps)
            ], function (err, result) {
                var outputProvisionKey, outputExpirationTime, outputVersionCommand,
                    successLabelArr, successValueArr;

                if (params.newProvision) {
                    outputProvisionKey= params.newProvision.provisionKey;
                    outputExpirationTime = params.newProvision.expirationTime;
                }

                if (params.newVersionCommand) {
                    outputVersionCommand = params.newVersionCommand.versionCommand
                }

                successLabelArr= ["versionCommand", "provisionKey", "expirationTime"];
                successValueArr= [outputVersionCommand, outputProvisionKey, outputExpirationTime];

                AppUtils.sendMultipleResponse(res, err, successLabelArr, successValueArr, result);
            });
        }
    });

};

/********** Instance Routing EndPoint (Get/Post: /api/v2/instance/version/instanceid/:instanceId/token/:Token) ***************/
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
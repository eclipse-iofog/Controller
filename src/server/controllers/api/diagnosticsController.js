import async from 'async';
import logger from "../../utils/winstonLogs";
import BaseApiController from "./baseApiController";
import AppUtils from "../../utils/appUtils";
import ChangeTrackingService from "../../services/changeTrackingService";
import UserService from "../../services/userService";
import StraceDiagnosticsService from "../../services/straceDiagnosticsService";
import ElementInstanceService from "../../services/elementInstanceService";
import FileUtils from "../../utils/fileUtils";
import FtpUtils from "../../utils/ftpUtils";

/********************************************* EndPoints ******************************************************/
/************* Switch Strace For Element EndPoint (Get/Post: /api/v2/authoring/element/diagnostics/strace) ******************/
const switchElementStrace = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        currentTime = new Date().getTime(),
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        elementInstanceProps = {
            elementInstanceId: 'bodyParams.elementInstanceId',
            setProperty: 'elementInstance'
        },
        straceProps = {
            instanceId: 'bodyParams.elementInstanceId',
            strace: 'bodyParams.strace',
            fogId: 'elementInstance.iofog_uuid',
            setProperty: 'newStrace'
        },
        pubChangeDiagnosticsProps = {
            fogInstanceId: 'elementInstance.iofog_uuid',
            changeObject: {
                diagnostics: currentTime
            }
        };
    params.bodyParams = req.body;

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
        async.apply(StraceDiagnosticsService.switchStraceForElement, straceProps),
        async.apply(ChangeTrackingService.updateChangeTracking, pubChangeDiagnosticsProps)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, 'newStrace', params.newStrace, result)
    });
};
/************* Get Diagnostic Info From Fog Agent (Get/Post:/api/v2/instance/diagnostics/id/:instanceId/token/:Token) ******************/
const getDiagnosticsInfo = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        straceProps = {
            fogId: 'bodyParams.instanceId',
            setProperty: 'straceValues'
        };


    params.bodyParams = req.params;

    async.waterfall([
        async.apply(BaseApiController.checkfogExistance, req, res),
        async.apply(StraceDiagnosticsService.getStraceValuesForFog, straceProps, params)
    ], function (err, result) {
        AppUtils.sendMultipleResponse(res, err, ['straceValues'], [params.straceValues], result);
    })
};

/************* Push Strace From Fog Agent(Get/Post: /api/v2/instance/strace/push/id/:instanceId/token/:Token) ******************/
const pushStraceData = function (req, res) {

    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        straceProps = {
            straceData: 'bodyParams.straceData'
        };


    params.bodyParams = req.params;
    params.bodyParams.straceData = req.body;
    async.waterfall([
        async.apply(BaseApiController.checkfogExistance, req, res),
        async.apply(StraceDiagnosticsService.pushBufferForElements, straceProps, params)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, 'pushed', 'ok', result)
    })


};

/************* Pop Strace Data for Element Instance As String(Get/Post: /api/v2/authoring/element/diagnostics/strace/pop/json/) ******************/
const popStraceDataAsJson = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        straceProps = {
            instanceId: 'bodyParams.elementInstanceId',
            setProperty: 'straceData'
        };
    params.bodyParams = req.body;

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(StraceDiagnosticsService.popBufferByElementId, straceProps)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, 'straceData', params.straceData, result)
    });
};


/************* Pop Strace Data for Element Instance As File(Get/Post: /api/v2/authoring/element/diagnostics/strace/pop/file/) ******************/
const popStraceDataAsFile = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        fileConversionProps = {
            file: 'straceFile',
            setProperty: 'convertedFile'
        },
        deleteFileProps = {
            file: 'straceFile'
        };
    params.bodyParams = req.body;

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(popBufferToFile),
        async.apply(FileUtils.fileToBase64, fileConversionProps),
        async.apply(FileUtils.deleteFile, deleteFileProps)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, 'convertedFile', params.convertedFile, result)
    });
};

/************* Pop Strace Data for Element Instance To FTP Server(Get/Post: /api/v2/authoring/element/diagnostics/strace/pop/ftp/) ******************/
const popStraceDataToFtp = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        ftpProps = {
            host: 'bodyParams.ftpHost',
            port: 'bodyParams.ftpPort',
            user: 'bodyParams.ftpUser',
            pass: 'bodyParams.ftpPass',
            destDir: 'bodyParams.ftpDestDir',
            file: 'straceFile'
        },
        deleteFileProps = {
            file: 'straceFile'
        };
    params.bodyParams = req.body;

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(popBufferToFile),
        async.apply(FtpUtils.sendToFtp, ftpProps),
        async.apply(FileUtils.deleteFile, deleteFileProps)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, 'sent', 'ok', result)
    });
};

/********************************* Extra Functions *****************************************/

const popBufferToFile = function (params, callback) {

    let straceProps = {
            instanceId: 'bodyParams.elementInstanceId',
            setProperty: 'straceData'
        },
        dataFileProps = {
            fileName: 'bodyParams.elementInstanceId',
            distDir: STRACE_DIST_DIR,
            data: 'straceData.buffer',
            setProperty: 'straceFile'
        };

    async.waterfall([
        async.apply(StraceDiagnosticsService.popBufferByElementId, straceProps, params),
        async.apply(FileUtils.createDirIfNotExists, dataFileProps),
        async.apply(FileUtils.createFile, dataFileProps),
    ], function (err, result) {
        if (err) {
            callback("error", result);
        } else {
            callback(null, params);
        }
    });
};

const STRACE_DIST_DIR = 'straceDiagnosticsFiles';

export default {
    switchElementStrace: switchElementStrace,
    pushStraceData: pushStraceData,
    popStraceDataAsJson: popStraceDataAsJson,
    popStraceDataAsFile: popStraceDataAsFile,
    getDiagnosticsInfo: getDiagnosticsInfo,
    popStraceDataToFtp: popStraceDataToFtp
}
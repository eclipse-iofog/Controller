/**
 * @file imageSnapshotController.js
 * @author Alex Shpak
 * @description This file includes the implementation of the end-points that deal with imageSnapshot
 */

import async from 'async';
import fs from 'fs';
import ChangeTrackingService from '../../services/changeTrackingService';
import ElementInstanceService from '../../services/elementInstanceService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import BaseApiController from "./baseApiController";

var formidable = require('../../utils/formidable');

const URL = require('url');

/*********************************************** EndPoints ******************************************************/

/***** Get Image Snapshot of Element Instance EndPoint (Get: /api/v2/authoring/element/imageSnapshot/status/:elementId *****/
const getElementInstanceImageSnapshotEndPoint = function (req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },

        elementInstanceProps = {
            elementInstanceId: 'bodyParams.elementId',
            setProperty: 'elementInstance'
        };

    params.bodyParams = req.body;
    // params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(ElementInstanceService.getElementInstance, elementInstanceProps)

    ], function(err, result) {
        if(!err){
            if (params.elementInstance.imageSnapshot){
                result.url = params.elementInstance.imageSnapshot;

            }
        }
        AppUtils.sendResponse(res, err, 'image_snapshot', params.elementInstance.imageSnapshot, result);
    });
};

/***** set Image Snapshot of Element Instance EndPoint (Get: /api/v2/authoring/element/imageSnapshot *****/
const elementInstanceImageSnapshotStatusEndPoint = function (req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
        currentTime = new Date().getTime(),
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },

        elementInstanceProps = {
            elementInstanceId: 'bodyParams.elementId',
            setProperty: 'elementInstance'
        },

        changeTrackingProps = {
            fogInstanceId: 'elementInstance.iofog_uuid',
            changeObject: {
                isImageSnapshot: currentTime
            }
        };

    // params.bodyParams = req.params;
    params.bodyParams = req.body;
    // params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
        async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
        updateImageSnapshot,

    ], function(err, result) {
        AppUtils.sendResponse(res, err, 'id', params.bodyParams.elementId, result);
    });
};

const updateImageSnapshot = function (params, callback) {
    let elementProps = {
        elementId: 'bodyParams.elementId',
        updatedData: {
            imageDownloadRun: 1
        }
    };

    ElementInstanceService.updateElemInstance(elementProps, params, callback);
};

/***** instance Image Snapshot of Element Instance EndPoint (Get: /api/v2/instance/imageSnapshotPut/id/:ID/token/:Token *****/
const instanceImageSnapshotUrlEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {};

    params.body = req.body;
    params.bodyParams = req.params;

    let    elementInstanceProps = {
            elementId: 'body.elementId',
            updatedData: {
                // imageSnapshot: 'pathImageSnapshot'
                // imageSnapshot: params.body.pathImageSnapshot
            }
        };
        // changeTrackingProps = {
        //     fogInstanceId: 'elementInstance.iofog_uuid',
        //     changeObject: {
        //         is_image_snapshot: 0
        //     }
        // };

    // params.body = req.body;
    // params.bodyParams = req.params;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    var form = new formidable.IncomingForm();
    form.uploadDir = './data';
    form.keepExtensions = true;

    // keep track of progress.
    // form.addListener('progress', function(recvd, expected) {
    //   progress = (recvd / expected * 100).toFixed(2);
    //   progresses[uuid] = progress
    // });

    form.parse(req, function(error, fields, files) {
        var path     = files['file']['path'],
            filename = files['file']['filename'],
            mime     = files['file']['mime'];
        // res.writeHead(200, {'content-type': 'text/html'});
        // res.write('<textarea>');
        // res.write("upload complete.\n");
        // res.write(filename + ' landed safely at ' + path + '\n');
        // res.write('</textarea>')
        res.end();
        // sys.print("finished upload: "+uuid+'\n');
    });

    fs.open('./file.gzip', 'w', function(err, fd) {
        if (err) throw err;
        var ourUrl = new URL.URL(req.headers.host + req.originalUrl);
        let buffer = fs.createWriteStream(ourUrl, {
            // flags: string;
            encoding: 'chunked',
            fd: fd,
            autoClose: true
        }).pipe(req);
        fs.write(fd, buffer, function(err, bytesWritten, buffer) {
            console.log(err);
            console.log(bytesWritten);
            console.log(buffer);
            fs.close(fd);
        });
    });

    async.waterfall([
            async.apply(BaseApiController.checkUserExistance, req, res),
            async.apply(ElementInstanceService.updateElemInstance, elementInstanceProps, params)
            // async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.bodyParams.ID;
            }
            AppUtils.sendResponse(res, err, 'uuid', output, result);
        });
};


/***** instance Image Snapshot of Element Instance EndPoint (Get: /api/v2/instance/imageSnapshotGet/id/:ID/token/:Token *****/
const getImageSnapshotStatusEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        elementInstanceProps = {
            iofogUuid: 'bodyParams.ID',
            setProperty: 'elementInstance'
        };
        // changeTrackingProps = {
        //     fogInstanceId: 'elementInstance.iofog_uuid',
        //     changeObject: {
        //         is_image_snapshot: 0
        //     }
        // };

    params.bodyParams = req.params;
    params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(BaseApiController.checkUserExistance, req, res),
            async.apply(ElementInstanceService.getElementInstanceByIofogUuid, elementInstanceProps, params)
            // async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.elementInstance.uuid;
            }
            // AppUtils.sendResponse(res, err, 'uuid', output, result);
            AppUtils.sendMultipleResponse(res, err, ['uuid'], [params.elementInstance.uuid], "");
        });
};

export default {
    getElementInstanceImageSnapshotEndPoint: getElementInstanceImageSnapshotEndPoint,
    elementInstanceImageSnapshotStatusEndPoint: elementInstanceImageSnapshotStatusEndPoint,
    instanceImageSnapshotUrlEndPoint: instanceImageSnapshotUrlEndPoint,
    getImageSnapshotStatusEndPoint: getImageSnapshotStatusEndPoint,
};
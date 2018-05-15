/**
 * @file imageSnapshotController.js
 * @author Alex Shpak
 * @description This file includes the implementation of the end-points that deal with imageSnapshot
 */

import async from 'async';
import ChangeTrackingService from '../../services/changeTrackingService';
import ElementInstanceService from '../../services/elementInstanceService';
import UserService from '../../services/userService';

import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import BaseApiController from "./baseApiController";

const formidable = require('../../utils/formidable');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

/*********************************************** EndPoints ******************************************************/

/***** Get Image Snapshot of Element Instance EndPoint (Get: /api/v2/authoring/element/imageSnapshot *****/
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
        },

        elementInstanceUpdateProps = {
            elementId: 'bodyParams.elementId',
            updatedData: {
                imageSnapshot: ''
            }
        };

    params.bodyParams = req.query;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(ElementInstanceService.getElementInstance, elementInstanceProps)

    ], function(err, result) {
        if(!err){
            if (params.elementInstance.imageSnapshot){
                let mimetype = mime.lookup(params.elementInstance.imageSnapshot);

                let _path = params.elementInstance.imageSnapshot;
                let stat = fs.statSync(_path);
                let fileSize = stat.size;
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    "Content-Type" : mimetype
                });
                fs.createReadStream(params.elementInstance.imageSnapshot).pipe(res);
                fs.unlink(params.elementInstance.imageSnapshot, (err) => {
                    if (err) throw err;
                    logger.info('successfully deleted ' + params.elementInstance.imageSnapshot);
                    ElementInstanceService.updateElemInstance(elementInstanceUpdateProps, params, () => {});
                });
            }
        }
    });


};

/***** set flags in changeTracking and in elementInstance for create Image Snapshot of Element Instance EndPoint (Get: /api/v2/authoring/element/imageSnapshot/status *****/
const elementInstanceImageSnapshotStatusEndPoint = function (req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
        needImageSnapshot = 'get_image',
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },

        elementInstanceProps = {
            elementInstanceId: 'bodyParams.elementId',
            setProperty: 'elementInstance'
        },

        elementInstanceUpdateProps = {
            elementId: 'bodyParams.elementId',
            updatedData: {
                imageSnapshot: needImageSnapshot
            }
        },

        changeTrackingProps = {
            fogInstanceId: 'elementInstance.iofog_uuid',
            changeObject: {
                isImageSnapshot: new Date().getTime()
            }
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(UserService.getUser, userProps, params),
        async.apply(ElementInstanceService.getElementInstance, elementInstanceProps),
        async.apply(ElementInstanceService.updateElemInstance, elementInstanceUpdateProps),
        async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps)

    ], function(err, result) {
        AppUtils.sendResponse(res, err, 'id', params.bodyParams.elementId, result);
    });
};

/***** Create Image Snapshot and save link in db and save file in fc of Element Instance EndPoint (Get: /api/v2/instance/imageSnapshotPut/id/:ID/token/:Token *****/
const instanceImageSnapshotUrlEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {};

    params.body = req.body;
    params.bodyParams = req.params;

    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    var form = new formidable.IncomingForm();
    form.uploadDir = appRoot + '/imageSnapshot';
    form.keepExtensions = true;

    form.parse(req, function(error, fields, files) {
        var filePath     = files['upstream']['path'];
        var absolutePath = path.resolve(filePath);

        let elementInstanceProps = {
            fogInstanceId: 'bodyParams.ID',
            updatedData: {
                imageSnapshot: absolutePath
            }
        };

        async.waterfall([
                async.apply(BaseApiController.checkUserExistance, req, res),
                async.apply(ElementInstanceService.updateElemInstanceByFogUuIdWithChanges, elementInstanceProps, params)
            ],
            function (err, result) {
                let output;
                if (!err) {
                    output = params.bodyParams.ID;
                }
                AppUtils.sendResponse(res, err, 'uuid', output, result);
            });
    });
};


/***** get status to ioFog for create Image Snapshot of Element Instance EndPoint (Get: /api/v2/instance/imageSnapshotGet/id/:ID/token/:Token *****/
const getImageSnapshotStatusEndPoint = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        elementInstanceProps = {
            iofogUuid: 'bodyParams.ID',
            setProperty: 'elementInstance'
        };

    params.bodyParams = req.params;
    params.bodyParams.t = req.query.t;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
            async.apply(BaseApiController.checkUserExistance, req, res),
            async.apply(ElementInstanceService.getElementInstanceByIofogUuidForCreateSnapshot, elementInstanceProps, params)
        ],
        function (err, result) {
            let output;
            if (!err) {
                output = params.elementInstance.uuid;
            }
            AppUtils.sendMultipleResponse(res, err, ['uuid'], [params.elementInstance.uuid], "");
        });
};

export default {
    getElementInstanceImageSnapshotEndPoint: getElementInstanceImageSnapshotEndPoint,
    elementInstanceImageSnapshotStatusEndPoint: elementInstanceImageSnapshotStatusEndPoint,
    instanceImageSnapshotUrlEndPoint: instanceImageSnapshotUrlEndPoint,
    getImageSnapshotStatusEndPoint: getImageSnapshotStatusEndPoint,
};
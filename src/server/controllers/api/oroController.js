import logger from "../../utils/winstonLogs";
import async from "async";
import ChangeTrackingService from "../../services/changeTrackingService";
import AppUtils from "../../utils/appUtils";
import FogUserService from "../../services/fogUserService";
import UserService from "../../services/userService";
import FogService from "../../services/fogService";
import FogAccessTokenService from "../../services/fogAccessTokenService";
import ElementInstanceService from "../../services/elementInstanceService";
import ElementService from "../../services/elementService";
import DataTracksService from "../../services/dataTracksService";
import ElementInstanceConnectionsService from "../../services/elementInstanceConnectionsService";


const setupCustomer = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);
    let params = {},
        wifiDataGeneratorProps = {
            elementName: 'bodyParams.wifiDataGeneratorElementName',
            elementInstanceName: 'bodyParams.wifiDataGeneratorElementInstanceName',
            fogInstanceId: 'bodyParams.macAddress',
            userId: 'oroAdmin.id',
            logSize: 'bodyParams.wifiDataGeneratorLogSize',
            config: 'bodyParams.wifiDataGeneratorConfig',
            setProperty: 'wifiDataGeneratorElementInstance'
        },
        linksOro = [
            {
                from: 'wifiDataGeneratorElementInstance',
                to: 'oroDataReceiver'
            }
        ];
    params.bodyParams = req.body;
    params.bodyParams.oroEmail = 'oro@oro.oro';
    params.bodyParams.oroTrackName = 'oro track';
    params.bodyParams.rootElementInstanceName = 'oro data receiver';
    params.bodyParams.wifiDataGeneratorElementName = 'Wifi data generator';
    params.bodyParams.wifiDataGeneratorElementInstanceName = params.bodyParams.wifiDataGeneratorElementName
        + ' ' + params.bodyParams.macAddress;
    params.bodyParams.wifiDataGeneratorLogSize = 10;
    params.bodyParams.wifiDataGeneratorConfig = '{"customerId": "' + params.bodyParams.customerId + '" }';



    async.waterfall([
        async.apply(prepareOroConstants, params),
        async.apply(createOroFog),
        async.apply(createOroElementInstance, wifiDataGeneratorProps),
        async.apply(linkOroElementsInstances, linksOro)
    ], function (err, result) {
        AppUtils.sendResponse(res, err, "tokenData", params.newAccessToken, result)
    });
};

const prepareOroConstants = function (params, callback) {
    let oroUserProps = {
            email: 'bodyParams.oroEmail',
            setProperty: 'oroAdmin'
        },
        rootElementInstanceProps = {
            userId: 'oroAdmin.id',
            trackId: 'trackData.id',
            elementName: 'bodyParams.rootElementInstanceName',
            setProperty: 'oroDataReceiver'
        },
        trackProps = {
            trackName: 'bodyParams.oroTrackName',
            userId: 'oroAdmin.id',
            setProperty: 'trackData'
        };

    async.waterfall([
        async.apply(UserService.getUserByEmail, oroUserProps, params),
        async.apply(DataTracksService.getDataTrackByNameAndUserId, trackProps),
        async.apply(ElementInstanceService.getElementInstanceByNameOnTrackForUser, rootElementInstanceProps),
    ], function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const createOroFog = function (params, callback) {
    let oroFogProps = {
            uuid: 'bodyParams.macAddress',
            name: 'bodyParams.macAddress',
            fogType: 'bodyParams.fogType',
            setProperty: 'fogInstance'
        },

        oroFogUserProps = {
            userId: 'oroAdmin.id',
            instanceId: 'fogInstance.uuid',
            setProperty: null
        },
        oroChangeTrackingProps = {
            fogInstanceId: 'fogInstance.uuid',
            setProperty: null
        },
        saveFogAccessTokenProps = {
            userId: 'oroAdmin.id',
            fogId: 'fogInstance.uuid',
            expirationTime: 'tokenData.expirationTime',
            accessToken: 'tokenData.accessToken',
            setProperty: 'newAccessToken'
        };

    async.waterfall([
        async.apply(FogService.createFogInstanceWithUUID, oroFogProps, params),
        async.apply(ChangeTrackingService.createFogChangeTracking, oroChangeTrackingProps),
        async.apply(FogUserService.createFogUser, oroFogUserProps),

        async.apply(FogAccessTokenService.generateAccessToken),
        async.apply(FogAccessTokenService.deleteFogAccessTokenByFogId, oroFogProps),
        async.apply(FogAccessTokenService.saveFogAccessToken, saveFogAccessTokenProps),
    ], function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const createOroElementInstance = function (props, params, callback) {
    let elementInstanceProps = {
            userId: 'oroAdmin.id',
            trackId: 'trackData.id',
            name: props.elementInstanceName,
            fogInstanceId: props.fogInstanceId,
            logSize: props.logSize,
            config: props.config,
            setProperty: props.setProperty
        },
        elementProps = {
            userId: props.userId,
            elementName: props.elementName,
            setProperty: 'element'
        };

    async.waterfall([
        async.apply(ElementService.getElementByNameForUser, elementProps, params),
        async.apply(ElementInstanceService.createElementInstance, elementInstanceProps),
    ], function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const linkOroElementsInstances = function (linksArr, params, callback) {
    linksArr.forEach( (pair) => {
        let newElementInstanceConnectionProps = {
            newConnectionObj: {
                sourceElementInstance: AppUtils.getProperty(params, pair.from + '.uuid'),
                destinationElementInstance: AppUtils.getProperty(params, pair.to + '.uuid')
            },
            setProperty: 'newElementInstanceConnection'
        };

        ElementInstanceConnectionsService.createElementInstanceConnection(newElementInstanceConnectionProps, params, callback);
    });

};

export default {
    setupCustomer: setupCustomer
}
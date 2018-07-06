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
import NetworkPairingService from "../../services/networkPairingService";
import FogTypeService from "../../services/fogTypeService";
import RoutingService from "../../services/routingService";
import ComsatService from "../../services/comsatService";
import SatellitePortService from "../../services/satellitePortService";


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
            volumeMappings: 'bodyParams.wifiDataGeneratorVolumeMappings',
            elementSetProperty: 'wifiDataGeneratorElement',
            setProperty: 'wifiDataGeneratorElementInstance'
        },
        linksOro = [
            {
                fromElement: 'wifiDataGeneratorElementInstance',
                toElement: 'oroDataReceiver',
                fromFog: 'fogInstance',
                toFog: 'rootFog',
                fromFogNetworkingElementKey: 'bodyParams.x86NetworkingElementKey',
                toFogNetworkingElementKey: 'bodyParams.x86NetworkingElementKey'
            }

        ];
    params.bodyParams = req.body;
    params.bodyParams.oroEmail = 'oro@oro.oro';
    params.bodyParams.oroTrackName = 'oro track';
    params.bodyParams.rootElement = 'Wifi data receiver';
    params.bodyParams.rootElementInstanceName = 'oro data receiver';
    params.bodyParams.rootFogName = 'oro root node';
    params.bodyParams.wifiDataGeneratorElementName = 'Wifi data generator';
    params.bodyParams.wifiDataGeneratorElementInstanceName = params.bodyParams.wifiDataGeneratorElementName
        + ' ' + params.bodyParams.macAddress;
    params.bodyParams.wifiDataGeneratorLogSize = 10;
    params.bodyParams.wifiDataGeneratorConfig = '{"customerId": "' + params.bodyParams.customerId + '" }';
    params.bodyParams.wifiDataGeneratorVolumeMappings = '{"volumemappings": [{"hostdestination": "' + params.bodyParams.wifiPath + '", "containerdestination": "/wifi/data", "accessmode": "ACCESS MODE"}]}';

    params.bodyParams.x86NetworkingElementKey = 1;

    let waterfallMethods = [];

    isFogAlreadyExists(params)
        .then((res) => {
            if (res == true) {
                waterfallMethods = [
                    async.apply(prepareOroConstants, params),
                    async.apply(provisionExistedFog),
                    async.apply(updateOroElementInstance, wifiDataGeneratorProps)
                ]
            } else {
                waterfallMethods = [
                    async.apply(prepareOroConstants, params),
                    async.apply(createOroFog),
                    async.apply(createOroElementInstance, wifiDataGeneratorProps),
                    async.apply(linkOroElementsInstances, linksOro)
                ]
            }
        })
        .then(() => {
            async.waterfall(waterfallMethods, function (err, result) {
                AppUtils.sendResponse(res, err, "tokenData", params.newAccessToken, result)
            });
        });
};

const isFogAlreadyExists = function (params) {
    let fogProps = {
        fogId: 'bodyParams.macAddress',
        setProperty: 'fogValidationData'
    };

    return new Promise((resolve, reject) => {
        async.waterfall([
            async.apply(FogService.getFogInstance, fogProps, params)
        ], function (err, result) {
            resolve(!err)
        });
    });

};

const provisionExistedFog = function (params, callback) {

    let fogProps = {
        fogId: 'bodyParams.macAddress',
        setProperty: 'newAccessToken'
    };

    async.waterfall([
        async.apply(FogAccessTokenService.findFogAccessTokenByFogId, fogProps, params)
    ], function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const updateOroElementInstance = function (props, params, callback) {
    let elementInstanceProps = {
            userId: 'oroAdmin.id',
            trackId: 'trackData.id',
            elementName: props.elementInstanceName,
            setProperty: props.setProperty
        },
        updateElementInstanceProps = {
            elementId: props.setProperty + '.uuid',
            updatedData: {
                logSize: AppUtils.getProperty(params, props.logSize),
                config: AppUtils.getProperty(params, props.config),
                volumeMappings: AppUtils.getProperty(params, props.volumeMappings),
                setProperty: AppUtils.getProperty(params, props.setPropert)
            }
        },
        elementProps = {
            userId: props.userId,
            elementName: props.elementName,
            setProperty: props.elementSetProperty
        };

    async.waterfall([
        async.apply(ElementService.getElementByNameForUser, elementProps, params),
        async.apply(ElementInstanceService.getElementInstanceByNameOnTrackForUser, elementInstanceProps),
        async.apply(ElementInstanceService.updateElemInstance, updateElementInstanceProps),
    ], function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
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
        },
        rootFogProps = {
            userId: 'oroAdmin.id',
            fogName: 'bodyParams.rootFogName',
            setProperty: 'rootFog'
        },
        elementProps = {
            userId: 'oroAdmin.id',
            elementName: 'bodyParams.rootElement',
            setProperty: 'rootElement'
        };

    async.waterfall([
        async.apply(UserService.getUserByEmail, oroUserProps, params),
        async.apply(DataTracksService.getDataTrackByNameAndUserId, trackProps),
        async.apply(ElementService.getElementByNameForUser, elementProps),
        async.apply(ElementInstanceService.getElementInstanceByNameOnTrackForUser, rootElementInstanceProps),
        async.apply(FogService.getFogInstanceByNameForUser, rootFogProps)
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
            volumeMappings: props.volumeMappings,
            element: props.elementSetProperty,
            setProperty: props.setProperty
        },
        elementProps = {
            userId: props.userId,
            elementName: props.elementName,
            setProperty: props.elementSetProperty
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
    linksArr.forEach((pair) => {
        let newElementInstanceConnectionProps = {
                newConnectionObj: {
                    sourceElementInstance: AppUtils.getProperty(params, pair.fromElement + '.uuid'),
                    destinationElementInstance: AppUtils.getProperty(params, pair.toElement + '.uuid')
                },
                setProperty: 'newElementInstanceConnection'
            },
            newRouteProps = {
                pubFogNetworkingElementKey: pair.fromFogNetworkingElementKey,
                destFogNetworkingElementKey: pair.toFogNetworkingElementKey,
                publishingFogInstance: pair.fromFog,
                destinationFogInstance: pair.toFog,
                publishingElement: pair.fromElement,
                destinationElement: pair.toElement
            };
        async.waterfall([
            async.apply(ElementInstanceConnectionsService.createElementInstanceConnection, newElementInstanceConnectionProps, params),
            async.apply(createNetworking, newRouteProps)
        ], function (err, result) {
            if (err) {
                callback(err, result)
            } else {
                callback(null, params)
            }
        });
    });

};

const createNetworking = function (props, params, callback) {

    let currentTime = new Date().getTime(),
        watefallMethods = [],


        pubNetworkElementProps = {
            networkElementId: props.pubFogNetworkingElementKey,
            setProperty: 'pubNetworkElement'
        },
        pubNetworkElementInstanceProps = {
            publishingElement: props.publishingElement,
            publishingFogInstance: props.publishingFogInstance,
            setProperty: 'pubNetworkElementInstance'
        },


        destNetworkElementProps = {
            networkElementId: props.destFogNetworkingElementKey,
            setProperty: 'destNetworkElement'
        },

        destNetworkElementInstanceProps = {
            destElement: props.destinationElement,
            destFogInstance: props.destinationFogInstance,
            setProperty: 'pubNetworkElementInstance'
        },

        networkPairingProps = {
            instanceId1: props.publishingFogInstance + '.uuid',
            instanceId2: props.destinationFogInstance + '.uuid',
            elementId1: props.publishingElement + '.uuid',
            elementId2: props.destinationElement + '.uuid',
            networkElementId1: 'pubNetworkElementInstance.uuid',
            networkElementId2: 'destNetworkElementInstance.uuid',
            isPublic: false,
            elementPortId: 'elementInstancePort.id',
            satellitePortId: 'satellitePort.id',
            setProperty: 'networkPairingObj'
        },
        //
        routingProps = {
            publishingInstanceId: props.publishingFogInstance + '.uuid',
            destinationInstanceId: props.publishingFogInstance + '.uuid',
            publishingElementId: props.publishingElement + '.uuid',
            destinationElementId: props.destinationElement + '.uuid',
            isNetworkConnection: false,
            setProperty: 'route'
        },

        pubRoutingProps = {
            publishingInstanceId: props.publishingFogInstance + '.uuid',
            destinationInstanceId: props.publishingFogInstance + '.uuid',
            publishingElementId: props.publishingElement + '.uuid',
            destinationElementId: 'pubNetworkElementInstance.uuid',
            isNetworkConnection: true,
            setProperty: 'publisingRoute'
        },

        destRoutingProps = {
            publishingInstanceId: props.destinationFogInstance + '.uuid',
            destinationInstanceId: props.destinationFogInstance + '.uuid',
            publishingElementId: 'destNetworkElementInstance.uuid',
            destinationElementId: props.destinationElement + '.uuid',
            isNetworkConnection: true,
            setProperty: 'destinationRoute'
        },

        destElementProps = {
            elementInstanceId: props.destinationElement + '.uuid',
            setProperty: 'destinationElementInstance'
        },

        pubChangeTrackingProps = {
            fogInstanceId: props.publishingFogInstance + '.uuid',
            changeObject: {
                'containerList': currentTime,
                'containerConfig': currentTime,
                'routing': currentTime
            }
        },

        destChangeTrackingProps = {
            fogInstanceId: props.destinationFogInstance + '.uuid',
            changeObject: {
                'containerList': currentTime,
                'containerConfig': currentTime,
                'routing': currentTime
            }
        },

        trackProps = {
            trackId: props.destinationElement + '.trackId',
            setProperty: 'dataTrack'
        },

        updateRebuildPubProps = {
            elementId: props.publishingElement + '.uuid',
            updatedData: {
                rebuild: 1
            }
        },
        updateRebuildDestProps = {
            elementId: props.destinationElement + '.uuid',
            updatedData: {
                rebuild: 1
            }
        };


    if (AppUtils.getProperty(params, props.publishingFogInstance + '.uuid')
        === AppUtils.getProperty(params, props.destinationFogInstanceUUID + '.uuid')) {
        watefallMethods = [
            async.apply(RoutingService.createRoute, routingProps, params),
            async.apply(ElementInstanceService.getElementInstanceRouteDetails, destElementProps),
            async.apply(ElementInstanceService.updateElemInstance, updateRebuildPubProps),
            async.apply(ElementInstanceService.updateElemInstance, updateRebuildDestProps),
            async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps)
        ];
    } else {
        watefallMethods = [
            async.apply(ComsatService.openPortOnRadomComsat, params),
            createSatellitePort,

            async.apply(ElementService.getNetworkElement, pubNetworkElementProps),
            async.apply(createPubNetworkElementInstance, pubNetworkElementInstanceProps),

            async.apply(ElementService.getNetworkElement, destNetworkElementProps),
            async.apply(createDestNetworkElementInstance, destNetworkElementInstanceProps),

            async.apply(NetworkPairingService.createNetworkPairing, networkPairingProps),

            async.apply(RoutingService.createRoute, pubRoutingProps),
            async.apply(RoutingService.createRoute, destRoutingProps),

            async.apply(ElementInstanceService.updateElemInstance, updateRebuildPubProps),
            async.apply(ElementInstanceService.updateElemInstance, updateRebuildDestProps),

            async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps),
            async.apply(ChangeTrackingService.updateChangeTracking, destChangeTrackingProps),

            async.apply(DataTracksService.getDataTrackById, trackProps)
        ];
    }

    async.waterfall(watefallMethods, function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const createPubNetworkElementInstance = function (props, params, callback) {
    let networkElementInstanceProps = {
        networkElement: 'pubNetworkElement',
        fogInstanceId: props.publishingFogInstance + '.uuid',
        satellitePort: 'satellitePort.port1',
        satelliteDomain: 'satellite.domain',
        satelliteCertificate: 'satellite.cert',
        passcode: 'comsatPort.passcode1',
        trackId: props.publishingElement + '.trackId',
        userId: 'oroAdmin.id',
        networkName: 'Network for Element ' + AppUtils.getProperty(params, props.publishingElement + '.uuid'),
        networkPort: 0,
        isPublic: false,
        setProperty: 'pubNetworkElementInstance'
    };

    ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
};

const createDestNetworkElementInstance = function (props, params, callback) {
    let networkElementInstanceProps = {
        networkElement: 'destNetworkElement',
        fogInstanceId: props.destFogInstance + '.uuid',
        satellitePort: 'satellitePort.port2',
        satelliteDomain: 'satellite.domain',
        satelliteCertificate: 'satellite.cert',
        passcode: 'comsatPort.passcode2',
        trackId: props.destElement + '.trackId',
        userId: 'oroAdmin.id',
        networkName: 'Network for Element ' + AppUtils.getProperty(params, props.destElement + '.uuid'),
        networkPort: 0,
        isPublic: false,
        setProperty: 'destNetworkElementInstance'
    };

    ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
};

const createSatellitePort = function (params, callback) {
    let satellitePortProps = {
        satellitePortObj: {
            port1: params.comsatPort.port1,
            port2: params.comsatPort.port2,
            maxConnectionsPort1: 60,
            maxConnectionsPort2: 0,
            passcodePort1: params.comsatPort.passcode1,
            passcodePort2: params.comsatPort.passcode2,
            heartBeatAbsenceThresholdPort1: 60000,
            heartBeatAbsenceThresholdPort2: 0,
            satellite_id: params.satellite.id,
            mappingId: params.comsatPort.id
        },
        setProperty: 'satellitePort'
    };
    SatellitePortService.createSatellitePort(satellitePortProps, params, callback);
};

export default {
    setupCustomer: setupCustomer
}
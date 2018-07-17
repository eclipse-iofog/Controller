import async from 'async';
import AppUtils from '../utils/appUtils';
import DataTrackService from './dataTracksService';
import FogService from './fogService';
import ChangeTrackingService from "./changeTrackingService";
import FogUserService from "./fogUserService";
import FogAccessTokenService from "./fogAccessTokenService";
import ElementInstanceService from "./elementInstanceService";
import ElementService from "./elementService";
import DataTracksService from "./dataTracksService";
import ElementInstanceConnectionsService from "./elementInstanceConnectionsService";
import UserService from "./userService";
import ConsoleService from "./consoleService";
import StreamViewerService from "./streamViewerService";
import logger from "../utils/winstonLogs";
import FogProvisionKeyService from "./fogProvisionKeyService";
import NetworkPairingService from "./networkPairingService";
import FogTypeService from "./fogTypeService";
import RoutingService from "./routingService";
import ComsatService from "./comsatService";
import SatellitePortService from "./satellitePortService";



const presetEnv = function (props, params, callback) {

    let prepareConfigProps = {
            configVariables: props.configVariables,
            configTemplate: props.configTemplate,
            setProperty: 'config'
        },
        tracksProps = {
            tracksConfig: 'config.tracks',
            userId: props.user + '.id'
        },
        fogsProps = {
            fogsConfig: 'config.fogNodes',
            userId: props.user + '.id'
        },
        elementsProps = {
            elementsConfig: 'config.elements',
            userId: props.user + '.id'
        },
        elementInstancesProps = {
            elementInstancesConfig: 'config.elementInstances',
            userId: props.user + '.id'
        },
        routesProps = {
            routesConfig: 'config.routes',
            userId: props.user + '.id'
        };


    async.waterfall([
        async.apply(prepareConfig, prepareConfigProps, params),
        async.apply(processTracks, tracksProps),
        async.apply(processFogs, fogsProps),
        async.apply(processElements, elementsProps),
        async.apply(processElementInstances, elementInstancesProps),
        async.apply(processRoutes, routesProps)
    ], function (err, result) {
        if (!err) {
            callback(null, params)
        } else {
            callback(err, result)
        }
    })
};

const prepareConfig = function (props, params, callback) {

    let configTemplate = AppUtils.getProperty(params, props.configTemplate),
        variables = AppUtils.getProperty(params, props.configVariables);

    let configStr = JSON.stringify(configTemplate);

    let cfgStr = fillVariablesInString(variables, configStr);
    params[props.setProperty] = JSON.parse(cfgStr);
    callback(null, params);
};

const fillVariablesInString = function (variables, str) {
    for (let property in variables) {
        let ex = RegExp('\\$\\(' + property + '\\)', 'g');

        str = str.replace(ex, variables[property])
    }
    return str;
};

const processTracks = function (props, params, callback) {
    let tracksCfg = AppUtils.getProperty(params, props.tracksConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(tracksCfg, function (trackCfg, next) {
            let waterfallMethods = [];
            let trackProps = {};
            let unknownCommand = false;
            switch (trackCfg.action) {
                case 'get':
                    trackProps = {
                        userId: props.userId,
                        trackName: getObjectFieldPathInArray(trackCfg, tracksCfg, props.tracksConfig, 'name'),
                        setProperty: trackCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(DataTrackService.getDataTrackByNameAndUserId, trackProps, params)
                    ];
                    break;
                case 'create':
                    trackProps = {
                        dataTrackObj: {
                            name: trackCfg.name,
                            // instanceId: params.bodyParams.fogInstanceId,
                            updatedBy: userId,
                            isSelected: 0,
                            isActivated: 0,
                            user_id: userId
                        },
                        setProperty: trackCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(DataTrackService.createDataTrack, trackProps, params)
                    ];
                    break;

                default:
                    unknownCommand = true;
                    break;
            }
            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {
                    // callback(err, result)
                    errMessages.push(result);
                } else if (unknownCommand) {
                    // callback('error', 'unknown command in tracks config')
                    errMessages.push('unknown command in tracks config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length !== 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processFogs = function (props, params, callback) {
    let fogsCfg = AppUtils.getProperty(params, props.fogsConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(fogsCfg, function (fogCfg, next) {

            let waterfallMethods = [];
            let fogProps = {}, createFogProps = {};
            let unknownCommand = false;
            switch (fogCfg.action) {
                case 'get':
                    if (fogCfg.uuid) {
                        fogProps = {
                            fogId: getObjectFieldPathInArray(fogCfg, fogsCfg, props.fogsConfig, 'uuid'),
                            setProperty: fogCfg.localId
                        };

                        waterfallMethods = [
                            async.apply(FogService.getFogInstance, fogProps, params)
                        ];
                    } else {
                        fogProps = {
                            userId: props.userId,
                            fogName: getObjectFieldPathInArray(fogCfg, fogsCfg, props.fogsConfig, 'name'),
                            setProperty: fogCfg.localId
                        };
                        waterfallMethods = [
                            async.apply(FogService.getFogInstanceByNameForUser, fogProps, params)
                        ];
                    }
                    break;
                case 'create':
                    fogProps = {
                        userId: props.userId,
                        fogCfg: getObjectFieldPathInArray(fogCfg, fogsCfg, props.fogsConfig),
                        setProperty: fogCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(createFog, fogProps, params)
                    ];
                    break;
                case 'recreate':
                    fogProps = {
                        userId: props.userId,
                        fogCfg: getObjectFieldPathInArray(fogCfg, fogsCfg, props.fogsConfig),
                        setProperty: fogCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(deleteFog, fogProps, params),
                        async.apply(createFog, fogProps)
                    ];
                    break;
                default:
                    unknownCommand = true;
                    break;
            }
            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {
                    // callback(err, result)
                    errMessages.push(result);
                } else if (unknownCommand) {
                    // callback('error', 'unknown command in tracks config')
                    errMessages.push('unknown command in fog config')
                }
                next();
            });

        },
        function () {
            if (errMessages.length !== 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        })
};

//TODO maksimchepelev: practically the same as fogController.fogInstanceCreateEndPoint and provisionKeuController.getProvisionKeyEndPoint
const createFog = function (props, params, callback) {
    let fogProps = {
            uuid: props.fogCfg + '.uuid',
            name: props.fogCfg + '.name',
            fogType: props.fogCfg + '.type',
            description: props.fogCfg + '.description',
            setProperty: props.setProperty
        },
        deleteAccesTokenProps = {
            fogId: props.setProperty + '.uuid'
        },

        fogUserProps = {
            userId: props.userId,
            instanceId: props.setProperty + '.uuid',
            setProperty: null
        },
        changeTrackingProps = {
            fogInstanceId: props.setProperty + '.uuid',
            setProperty: null
        },
        saveFogAccessTokenProps = {
            userId: props.userId,
            fogId: props.setProperty + '.uuid',
            expirationTime: 'tokenData.expirationTime',
            accessToken: 'tokenData.accessToken',
            setProperty: props.setProperty + '_fogTokenData'
        };

    let waterfallMethods = [];

    if (AppUtils.getProperty(params, props.fogCfg + '.uuid')) {
        waterfallMethods.push(async.apply(FogService.createFogInstanceWithUUID, fogProps, params))
    } else {
        waterfallMethods.push(async.apply(FogService.createFogInstance, fogProps, params))
    }

    waterfallMethods = waterfallMethods.concat([
        async.apply(ChangeTrackingService.createFogChangeTracking, changeTrackingProps),
        async.apply(FogUserService.createFogUser, fogUserProps),

        async.apply(FogAccessTokenService.generateAccessToken),
        async.apply(FogAccessTokenService.deleteFogAccessTokenByFogId, deleteAccesTokenProps),
        async.apply(FogAccessTokenService.saveFogAccessToken, saveFogAccessTokenProps),
    ]);

    async.waterfall(waterfallMethods, function (err, result) {
        if (err) {
            callback(err, result)
        } else {
            callback(null, params)
        }
    });
};

const deleteFog = function (props, params, callback) {
    let instanceProps = {
            instanceId: props.fogCfg + '.uuid'
        };

    async.waterfall([
            async.apply(ChangeTrackingService.deleteChangeTracking, instanceProps, params),
            async.apply(FogUserService.deleteFogUserByInstanceId, instanceProps),
            async.apply(StreamViewerService.deleteStreamViewerByFogInstanceId, instanceProps),
            async.apply(ConsoleService.deleteConsoleByFogInstanceId, instanceProps),
            async.apply(FogProvisionKeyService.deleteProvisonKeyByInstanceId, instanceProps),
            async.apply(FogService.deleteFogInstance, instanceProps)
        ],
        function (err, result) {
            if (err) {
                callback(null, params) //ignore errors. errors if data not exists
            } else {
                callback(null, params)
            }
        });
};

const processElements = function (props, params, callback) {
    let elementsCfg = AppUtils.getProperty(params, props.elementsConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(elementsCfg, function (elementCfg, next) {
            let waterfallMethods = [];
            let elementProps = {};
            let unknownCommand = false;
            switch (elementCfg.action) {
                case 'get':
                    elementProps = {
                        userId: props.userId,
                        elementName: getObjectFieldPathInArray(elementCfg, elementsCfg, props.elementsConfig, 'name'),
                        setProperty: elementCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(ElementService.getElementByNameForUser, elementProps, params)
                    ];
                    break;
                default:
                    unknownCommand = true;
                    break;
            }
            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {
                    // callback(err, result)
                    errMessages.push(result);
                } else if (unknownCommand) {
                    // callback('error', 'unknown command in tracks config')
                    errMessages.push('unknown command in element config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length !== 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processElementInstances = function (props, params, callback) {
    let elementInstancesCfg = AppUtils.getProperty(params, props.elementInstancesConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(elementInstancesCfg, function (elementInstanceCfg, next) {
            let waterfallMethods = [];
            let elementInstanceProps = {};
            let unknownCommand = false;
            switch (elementInstanceCfg.action) {
                case 'get':
                    elementInstanceProps = {
                        userId: props.userId,
                        trackId: elementInstanceCfg.track + '.id',
                        elementName: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfg, props.elementInstancesConfig, 'name'),
                        setProperty: elementInstanceCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(ElementInstanceService.getElementInstanceByNameOnTrackForUser, elementInstanceProps, params)
                    ];
                    break;
                case 'create':
                    elementInstanceProps = {
                        userId: props.userId,
                        trackId: elementInstanceCfg.track + '.id',
                        name: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfg, props.elementInstancesConfig, 'name'),
                        fogInstanceId: elementInstanceCfg.fogNode + '.uuid',
                        logSize: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfg, props.elementInstancesConfig, 'logSize'),
                        config: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfg, props.elementInstancesConfig, 'config'),
                        volumeMappings: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfg, props.elementInstancesConfig, 'volumeMappings'),
                        element: elementInstanceCfg.element,
                        setProperty: elementInstanceCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(ElementInstanceService.createElementInstance, elementInstanceProps, params)
                    ];
                    break;

                default:
                    unknownCommand = true;
                    break;
            }
            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {
                    // callback(err, result)
                    errMessages.push(result);
                } else if (unknownCommand) {
                    // callback('error', 'unknown command in tracks config')
                    errMessages.push('unknown command in element instances config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length !== 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processRoutes = function (props, params, callback) {
    let routesCfg = AppUtils.getProperty(params, props.routesConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(routesCfg, function (routeCfg, next) {
            let waterfallMethods = [];
            let unknownCommand = false;

            let fromElementInstanceConfig = getObjectInArrayByField(params.config.elementInstances, 'localId', routeCfg.from),
                toElementInstanceConfig = getObjectInArrayByField(params.config.elementInstances, 'localId', routeCfg.to),
                fromFogConfig = getObjectInArrayByField(params.config.fogNodes, 'localId', fromElementInstanceConfig.fogNode),
                toFogConfig = getObjectInArrayByField(params.config.fogNodes, 'localId', toElementInstanceConfig.fogNode);

            //TODO maksimchepelev refactor later
            params.bodyParams.networkingElementKey = 1;

            let connectionProps = {
                    newConnectionObj: {
                        sourceElementInstance: AppUtils.getProperty(params, routeCfg.from + '.uuid'),
                        destinationElementInstance: AppUtils.getProperty(params, routeCfg.to + '.uuid')
                    },
                    setProperty: 'connection_' + routeCfg.from + '_' + routeCfg.to
                },
                routeProps = {
                    pubFogNetworkingElementKey: 'bodyParams.networkingElementKey',
                    destFogNetworkingElementKey: 'bodyParams.networkingElementKey',
                    publishingFogInstance: fromFogConfig.localId,
                    destinationFogInstance: toFogConfig.localId,
                    publishingElement: routeCfg.from,
                    destinationElement: routeCfg.to
                };

            waterfallMethods = [
                async.apply(ElementInstanceConnectionsService.createElementInstanceConnection, connectionProps, params),
                async.apply(createNetworking, routeProps)
            ];

            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {
                    // callback(err, result)
                    errMessages.push(result);
                } else if (unknownCommand) {
                    // callback('error', 'unknown command in tracks config')
                    errMessages.push('unknown command in element instances config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length !== 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
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























const getObjectFieldPathInArray = function (object, array, arrayName, fieldName,) {
    let index = array.indexOf(object);
    let path;
    if (fieldName) {
        path = arrayName + '[' + index + '].' + fieldName
    } else {
        path = arrayName + '[' + index + ']'
    }
    return path;
};

const getObjectInArrayByField = function (array, fieldName, fieldValue) {
    if (!Array.isArray(array)) {
        return null;
    }

    let res;
    array.forEach(obj => {
        if (obj[fieldName] === fieldValue) {
            res = obj;
        }
    });

    return res;
};

export default {
    presetEnv: presetEnv
}

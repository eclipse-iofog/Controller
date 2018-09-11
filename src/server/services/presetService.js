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
import ConsoleService from "./consoleService";
import StreamViewerService from "./streamViewerService";
import FogProvisionKeyService from "./fogProvisionKeyService";
import NetworkPairingService from "./networkPairingService";
import RoutingService from "./routingService";
import ComsatService from "./comsatService";
import SatellitePortService from "./satellitePortService";
import ElementInstancePortService from "./elementInstancePortService";


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
    let tracksCfgArr = AppUtils.getProperty(params, props.tracksConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(tracksCfgArr, function (trackCfg, next) {
            let waterfallMethods = [];
            let trackProps = {};
            let unknownCommand = false;
            switch (trackCfg.action) {
                case 'get':
                    trackProps = {
                        userId: props.userId,
                        trackName: getObjectFieldPathInArray(trackCfg, tracksCfgArr, props.tracksConfig, 'name'),
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

                    errMessages.push(result);
                } else if (unknownCommand) {

                    errMessages.push('unknown command in tracks config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length > 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processFogs = function (props, params, callback) {
    let fogsCfgArr = AppUtils.getProperty(params, props.fogsConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(fogsCfgArr, function (fogCfg, next) {

            let waterfallMethods = [];
            let fogProps = {}, createFogProps = {};
            let unknownCommand = false;
            switch (fogCfg.action) {
                case 'get':
                    if (fogCfg.uuid) {
                        fogProps = {
                            fogId: getObjectFieldPathInArray(fogCfg, fogsCfgArr, props.fogsConfig, 'uuid'),
                            setProperty: fogCfg.localId
                        };

                        waterfallMethods = [
                            async.apply(FogService.getFogInstance, fogProps, params)
                        ];
                    } else {
                        fogProps = {
                            userId: props.userId,
                            fogName: getObjectFieldPathInArray(fogCfg, fogsCfgArr, props.fogsConfig, 'name'),
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
                        fogCfg: getObjectFieldPathInArray(fogCfg, fogsCfgArr, props.fogsConfig),
                        setProperty: fogCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(createFog, fogProps, params)
                    ];
                    break;
                case 'recreate':
                    fogProps = {
                        userId: props.userId,
                        fogCfg: getObjectFieldPathInArray(fogCfg, fogsCfgArr, props.fogsConfig),
                        setProperty: fogCfg.localId
                    };
                    waterfallMethods = [
                        async.apply(deleteElementInstancesByFog, fogProps, params),
                        async.apply(deleteFog, fogProps),
                        async.apply(createFog, fogProps)
                    ];
                    break;
                default:
                    unknownCommand = true;
                    break;
            }
            async.waterfall(waterfallMethods, function (err, result) {
                if (err) {

                    errMessages.push(result);
                } else if (unknownCommand) {

                    errMessages.push('unknown command in fog config')
                }
                next();
            });

        },
        function () {
            if (errMessages.length > 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        })
};

//TODO maksimchepelev: practically the same as fogController.fogInstanceCreateEndPoint and provisionKeyController.getProvisionKeyEndPoint
const createFog = function (props, params, callback) {
    let fogIdProp = generateUuidProp(props.setProperty);
    let fogProps = {
            uuid: generateUuidProp(props.fogCfg),
            name: props.fogCfg + '.name',
            fogType: props.fogCfg + '.type',
            description: props.fogCfg + '.description',
            setProperty: props.setProperty
        },
        deleteAccesTokenProps = {
            fogId: fogIdProp
        },

        fogUserProps = {
            userId: props.userId,
            instanceId: fogIdProp,
            setProperty: null
        },
        changeTrackingProps = {
            fogInstanceId: fogIdProp,
            setProperty: null
        },
        saveFogAccessTokenProps = {
            userId: props.userId,
            fogId: fogIdProp,
            expirationTime: 'tokenData.expirationTime',
            accessToken: 'tokenData.accessToken',
            setProperty: props.setProperty + '_fogTokenData'
        };

    let waterfallMethods = [];

    if (AppUtils.getProperty(params, generateUuidProp(props.fogCfg))) {
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

const deleteElementInstancesByFog = function (props, params, callback) {

    let fogProps = {
            fogId: generateUuidProp(props.fogCfg),
            setProperty: props.setProperty + '_elements_to_delete'
        },
        elementProps = {
            elementInstances: fogProps.setProperty
        };

    async.waterfall([
        async.apply(ElementInstanceService.getElementInstancesByFogId, fogProps, params),
        async.apply(deleteElements, elementProps)
    ], function (err, result) {
        callback(null, params); // ignore errors. errors if no elements
    });
};

const deleteElements = function (props, params, callback) {

    let elementInstances = AppUtils.getProperty(params, props.elementInstances);
    let errMessages = [];

    async.each(elementInstances, function (instance, next) {
            //TODO maksimchepelev: practically the same as elementInstanceController.elementInstanceDeleteEndPoint

            let instancePath = getObjectFieldPathInArray(instance, elementInstances, props.elementInstances);

            let portPasscodeProps = {
                    elementId: generateUuidProp(instancePath),
                    setProperty: 'portPasscode'
                },
                deleteElementProps = {
                    elementId: generateUuidProp(instancePath),
                    iofogUUID: instancePath + '.iofog_uuid',
                    // withCleanUp: 'bodyParams.withCleanUp'
                },
                changeTrackingProps = {
                    fogInstanceId: instancePath + '.iofog_uuid',
                    changeObject: {
                        'containerList': new Date().getTime(),
                    }
                };

            params.milliseconds = new Date().getTime();

            async.waterfall([
                async.apply(ElementInstancePortService.deleteElementInstancePort, deleteElementProps, params),
                async.apply(RoutingService.deleteElementInstanceRouting, deleteElementProps),
                async.apply(RoutingService.deleteNetworkElementRouting, deleteElementProps),
                async.apply(ElementInstanceService.deleteNetworkElementInstance, deleteElementProps),
                async.apply(SatellitePortService.getPasscodeForNetworkElements, portPasscodeProps),
                ComsatService.closePortsOnComsat,
                async.apply(NetworkPairingService.deleteNetworkPairing, deleteElementProps),
                async.apply(SatellitePortService.deletePortsForNetworkElements, deleteElementProps),
                async.apply(ChangeTrackingService.updateChangeTracking, changeTrackingProps),
                async.apply(ElementInstanceService.deleteElementInstanceWithCleanUp, deleteElementProps)
            ], function (err, result) {
                if (err) {

                    errMessages.push(result);
                }
                next();
            });
        },
        function () {
            if (errMessages.length > 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        }
    );
};

const deleteFog = function (props, params, callback) {
    let instanceProps = {
        instanceId: generateUuidProp(props.fogCfg)
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
            callback(null, params); //ignore errors. errors if data not exists
        });
};

const processElements = function (props, params, callback) {
    let elementsCfgArr = AppUtils.getProperty(params, props.elementsConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(elementsCfgArr, function (elementCfg, next) {
            let waterfallMethods = [];
            let elementProps = {};
            let unknownCommand = false;
            switch (elementCfg.action) {
                case 'get':
                    elementProps = {
                        userId: props.userId,
                        elementName: getObjectFieldPathInArray(elementCfg, elementsCfgArr, props.elementsConfig, 'name'),
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

                    errMessages.push(result);
                } else if (unknownCommand) {

                    errMessages.push('unknown command in element config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length > 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processElementInstances = function (props, params, callback) {
    let elementInstancesCfgArr = AppUtils.getProperty(params, props.elementInstancesConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(elementInstancesCfgArr, function (elementInstanceCfg, next) {
            let waterfallMethods = [];
            let elementInstanceProps = {};
            let unknownCommand = false;
            switch (elementInstanceCfg.action) {
                case 'get':
                    elementInstanceProps = {
                        userId: props.userId,
                        trackId: elementInstanceCfg.track + '.id',
                        elementName: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfgArr, props.elementInstancesConfig, 'name'),
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
                        name: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfgArr, props.elementInstancesConfig, 'name'),
                        fogInstanceId: generateUuidProp(elementInstanceCfg.fogNode),
                        logSize: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfgArr, props.elementInstancesConfig, 'logSize'),
                        config: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfgArr, props.elementInstancesConfig, 'config'),
                        volumeMappings: getObjectFieldPathInArray(elementInstanceCfg, elementInstancesCfgArr, props.elementInstancesConfig, 'volumeMappings'),
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

                    errMessages.push(result);
                } else if (unknownCommand) {

                    errMessages.push('unknown command in element instances config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length > 0) {
                callback('error', errMessages)
            } else {
                callback(null, params)
            }
        });
};

const processRoutes = function (props, params, callback) {
    let routesCfgArr = AppUtils.getProperty(params, props.routesConfig);

    let userId = AppUtils.getProperty(params, props.userId);

    let errMessages = [];

    async.each(routesCfgArr, function (routeCfg, next) {
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
                        sourceElementInstance: AppUtils.getProperty(params, generateUuidProp(routeCfg.from)),
                        destinationElementInstance: AppUtils.getProperty(params, generateUuidProp(routeCfg.to))
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

                    errMessages.push(result);
                } else if (unknownCommand) {

                    errMessages.push('unknown command in element instances config')
                }
                next();
            });
        },
        function () {
            if (errMessages.length > 0) {
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
            instanceId1: generateUuidProp(props.publishingFogInstance),
            instanceId2: generateUuidProp(props.destinationFogInstance),
            elementId1: generateUuidProp(props.publishingElement),
            elementId2: generateUuidProp(props.destinationElement),
            networkElementId1: 'pubNetworkElementInstance.uuid',
            networkElementId2: 'destNetworkElementInstance.uuid',
            isPublic: false,
            elementPortId: 'elementInstancePort.id',
            satellitePortId: 'satellitePort.id',
            setProperty: 'networkPairingObj'
        },
        //
        routingProps = {
            publishingInstanceId: generateUuidProp(props.publishingFogInstance),
            destinationInstanceId: generateUuidProp(props.publishingFogInstance),
            publishingElementId: generateUuidProp(props.publishingElement),
            destinationElementId: generateUuidProp(props.destinationElement),
            isNetworkConnection: false,
            setProperty: 'route'
        },

        pubRoutingProps = {
            publishingInstanceId: generateUuidProp(props.publishingFogInstance),
            destinationInstanceId: generateUuidProp(props.publishingFogInstance),
            publishingElementId: generateUuidProp(props.publishingElement),
            destinationElementId: 'pubNetworkElementInstance.uuid',
            isNetworkConnection: true,
            setProperty: 'publisingRoute'
        },

        destRoutingProps = {
            publishingInstanceId: generateUuidProp(props.destinationFogInstance),
            destinationInstanceId: generateUuidProp(props.destinationFogInstance),
            publishingElementId: 'destNetworkElementInstance.uuid',
            destinationElementId: generateUuidProp(props.destinationElement),
            isNetworkConnection: true,
            setProperty: 'destinationRoute'
        },

        destElementProps = {
            elementInstanceId: generateUuidProp(props.destinationElement),
            setProperty: 'destinationElementInstance'
        },

        pubChangeTrackingProps = {
            fogInstanceId: generateUuidProp(props.publishingFogInstance),
            changeObject: {
                'containerList': currentTime,
                'containerConfig': currentTime,
                'routing': currentTime
            }
        },

        destChangeTrackingProps = {
            fogInstanceId: generateUuidProp(props.destinationFogInstance),
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
            elementId: generateUuidProp(props.publishingElement),
            updatedData: {
                rebuild: 1
            }
        },
        updateRebuildDestProps = {
            elementId: generateUuidProp(props.destinationElement),
            updatedData: {
                rebuild: 1
            }
        };


    if (AppUtils.getProperty(params, generateUuidProp(props.publishingFogInstance))
        === AppUtils.getProperty(params, generateUuidProp(props.destinationFogInstanceUUID))) {
        watefallMethods = [
            async.apply(RoutingService.createRoute, routingProps, params),
            async.apply(ElementInstanceService.getElementInstanceRouteDetails, destElementProps),
            async.apply(ElementInstanceService.updateElemInstance, updateRebuildPubProps),
            async.apply(ElementInstanceService.updateElemInstance, updateRebuildDestProps),
            async.apply(ChangeTrackingService.updateChangeTracking, pubChangeTrackingProps)
        ];
    } else {
        watefallMethods = [

            async.apply(ComsatService.openPortOnRandomComsat, params),
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
        fogInstanceId: generateUuidProp(props.publishingFogInstance),
        satellitePort: 'satellitePort.port1',
        satelliteDomain: 'satellite.domain',
        satelliteCertificate: 'satellite.cert',
        passcode: 'comsatPort.passcode1',
        trackId: props.publishingElement + '.trackId',
        userId: 'oroAdmin.id',
        networkName: 'Network for Element ' + AppUtils.getProperty(params, generateUuidProp(props.publishingElement)),
        networkPort: 0,
        isPublic: false,
        setProperty: 'pubNetworkElementInstance'
    };

    ElementInstanceService.createNetworkElementInstance(networkElementInstanceProps, params, callback);
};

const createDestNetworkElementInstance = function (props, params, callback) {
    let networkElementInstanceProps = {
        networkElement: 'destNetworkElement',
        fogInstanceId: generateUuidProp(props.destFogInstance),
        satellitePort: 'satellitePort.port2',
        satelliteDomain: 'satellite.domain',
        satelliteCertificate: 'satellite.cert',
        passcode: 'comsatPort.passcode2',
        trackId: props.destElement + '.trackId',
        userId: 'oroAdmin.id',
        networkName: 'Network for Element ' + AppUtils.getProperty(params, generateUuidProp(props.destElement)),
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


const getObjectFieldPathInArray = function (object, array, arrayName, fieldName) {
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

const generateUuidProp = function(baseProp) {
    return baseProp + '.uuid';
};

export default {
    presetEnv: presetEnv
}

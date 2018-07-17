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
        };


    async.waterfall([
        async.apply(prepareConfig, prepareConfigProps, params),
        async.apply(processTracks, tracksProps),
        async.apply(processFogs, fogsProps),
        async.apply(processElements, elementsProps)
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

//TODO: practically the same as fogController.fogInstanceCreateEndPoint and provisionKeuController.getProvisionKeyEndPoint
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

export default {
    presetEnv: presetEnv
}

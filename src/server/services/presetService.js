import async from 'async';
import AppUtils from '../utils/appUtils';
import DataTrackService from './dataTracksService';


const presetEnv = function (props, params, callback) {

    let prepareConfigProps = {
            configVariables: props.configVariables,
            configTemplate: props.configTemplate,
            setProperty: 'config'
        },
        tracksProps = {
            tracksConfig: 'config.tracks',
            userId: props.user + '.id'
        };


    async.waterfall([
        async.apply(prepareConfig, prepareConfigProps, params),
        async.apply(processTracks, tracksProps)
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
                        userId: userId,
                        trackName: trackCfg.name,
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

    /*tracksCfg.forEach((trackCfg) => {
        let waterfallMethods = [];
        let trackProps = {};
        let unknownCommand = false;
        switch (trackCfg.action) {
            case 'get':
                trackProps = {
                    userId: userId,
                    trackName: trackCfg.name,
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
                errMessages.push(result)
            } else if (unknownCommand) {
                // callback('error', 'unknown command in tracks config')
                errMessages.push('unknown command in tracks config')
            }
            /!* else {
                            callback(null, params)
                        }*!/
        })
    });

    if (errMessages.length !== 0) {
        callback('error', errMessages)
    } else {
        callback(null, params)
    }*/


};

export default {
    presetEnv: presetEnv
}

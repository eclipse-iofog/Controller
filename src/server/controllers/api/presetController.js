const async = require('async');
const logger = require('../../utils/winstonLogs');
const AppUtils = require('../../utils/appUtils');
const PresetService = require('../../services/presetService');
const UserService = require('../../services/userService');


const testPreset = function (req, res) {
    logger.info("Endpoint hit: " + req.originalUrl);

    let params = {},
        userProps = {
            userId: 'bodyParams.t',
            setProperty: 'user'
        },
        presetEnvProps = {
            configTemplate: 'bodyParams.config',
            configVariables: 'bodyParams.variables',
            user: userProps.setProperty
        };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
        async.apply(UserService.getUser, userProps,params),
        async.apply(PresetService.presetEnv, presetEnvProps)
    ], function (err, responce) {
        AppUtils.sendResponse(res, err, 'cfg', params.config, responce)
    })
};

module.exports = {
    testPreset: testPreset
}
import async from 'async';
import logger from '../../utils/winstonLogs';
import AppUtils from '../../utils/appUtils';
import PresetService from '../../services/presetService';
import UserService from '../../services/userService';


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

export default {
    testPreset: testPreset
}
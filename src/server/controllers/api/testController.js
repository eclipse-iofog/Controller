const logger = require('../../utils/winstonLogs');
const async = require('async');
const AppUtils = require('../../utils/appUtils');
const TestService = require('../../services/testService');

async function testEndPoint(req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);
    let params = {};

    params.bodyParams = req.body;

    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    let resObj,
        err = false,
        errMsg = '';

    try {
        resObj = await TestService.doSmth(1);
    } catch (error) {
        err = true;
        errMsg = error;
    }

    AppUtils.sendResponse(res, err, 'res', resObj, errMsg);
    
}

module.exports =  {
    testEndPoint: testEndPoint
};
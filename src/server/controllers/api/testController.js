import logger from "../../utils/winstonLogs";
import async from "async";
import AppUtils from "../../utils/appUtils";

/*const testEndPoint = *//*async*/ function testEndPoint(req, res) {
    logger.info("Endpoint hit: "+ req.originalUrl);
    let params = {};

    params.bodyParams = req.body;

    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    
    let resObj =/* await */doSmth();
    if (resObj != null) {
        AppUtils.sendResponse(res, null, 'res', resObj, "error");
    }
    
}

const doSmth = /*async*/ function () {
    return 1;
};

export default {
    testEndPoint: testEndPoint
};
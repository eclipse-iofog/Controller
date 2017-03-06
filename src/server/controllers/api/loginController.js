import async from 'async';

import UserService from '../../services/userService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';


/************************ EndPoints ************************************************/

/*************** Create Element EndPoint (Post /api/v1/user/login) *****************/
 const validateUserEndPoint = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);

  var params = {},
      userProps = {
        email: 'bodyParams.Email',
        password: 'bodyParams.Password',
        setProperty: 'user'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUserByEmailPassword, userProps, params)

  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'User', params.user, result);
  })
};

export default {
  validateUserEndPoint: validateUserEndPoint
}
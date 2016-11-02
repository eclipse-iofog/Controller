import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const getUser = function(params, callback) {
  UserManager
    .findByToken(params.bodyParams.userId)
    .then(AppUtils.onFind.bind(null, params, 'user', 'User not found', callback));

}

export default {
  getUser: getUser,

};
import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const getUser = function(params, callback) {
  UserManager
    .findByToken(params.bodyParams.userId)
    .then(AppUtils.onFind.bind(null, params, 'user', 'User not found', callback));
}

const deleteByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .deleteByUserId(userId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete User', callback));
}

export default {
  getUser: getUser,
  deleteByUserId : deleteByUserId 
};
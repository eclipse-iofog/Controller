import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const getUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .findByToken(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'User not found', callback));
}

const getUserByEmailPassword = function(props, params, callback) {
  var email = AppUtils.getProperty(params, props.email),
      password = AppUtils.getProperty(params, props.password);
      
  UserManager
    .validateUser(email, password)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'User not found', callback));
}

const deleteByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .deleteByUserId(userId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete User', callback));
}

export default {
  getUser: getUser,
  deleteByUserId : deleteByUserId,
  getUserByEmailPassword: getUserByEmailPassword
};
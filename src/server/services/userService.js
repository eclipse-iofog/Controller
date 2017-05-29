import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const createUser = function(props, params, callback) {
  UserManager
    .addUser(props.user)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create user', callback));
}

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

const getUserByEmail = function(props, params, callback) {
  var email = AppUtils.getProperty(params, props.email);

  UserManager
    .validateUserByEmail(email)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const updateUserByEmail = function(props, params, callback) {
  var email = AppUtils.getProperty(params, props.email);

  UserManager
    .updateUserByEmail(email, props.updateData)
    .then(AppUtils.onUpdate.bind(null, params,'Password not updated', callback));
}

const updateUserByToken = function(props, params, callback) {
  var token = AppUtils.getProperty(params, props.token);

  UserManager
    .updateUserByToken(token, props.updateData)
    .then(AppUtils.onUpdate.bind(null, params,'User data is not updated.', callback));
}


const deleteByUserId = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .deleteByUserId(userId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete User', callback));
}

export default {
  createUser: createUser,
  getUser: getUser,
  deleteByUserId : deleteByUserId,
  getUserByEmail: getUserByEmail,
  updateUserByEmail: updateUserByEmail,
  updateUserByToken: updateUserByToken,
  getUserByEmailPassword: getUserByEmailPassword
};
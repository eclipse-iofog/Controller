import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const createUser = function(email, firstName, lastName) {

  UserManager.findByEmail(email).then(function (res, err){
    if (!res){
      UserManager.createUser(email, firstName, lastName)
    }
    else{
      console.log('\nUser already exists with this email. Please Try again with new Email.');
    }
  });
}

const getUser = function(props, params, callback) {
  var userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .findByToken(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'User not found', callback));
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
  deleteByUserId : deleteByUserId 
};
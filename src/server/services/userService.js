const nodemailer = require('nodemailer');
let smtpTransport = require('nodemailer-smtp-transport');
import UserManager from '../managers/userManager';
import AppUtils from '../utils/appUtils';

const createUser = function(props, params, callback) {
  UserManager
    .addUser(props.user)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create user', callback));
}

const userEmailSender = function (props, params, callback){
    let service = AppUtils.getProperty(params, props.service),
        host = AppUtils.getProperty(params, props.host),
        port = AppUtils.getProperty(params, props.port),
        email = AppUtils.getProperty(params, props.email),
        password = AppUtils.getProperty(params, props.password);


    let transporter;
    if (service) {
        transporter = nodemailer.createTransport(smtpTransport({
            service: service,
            auth: {
                user: email,
                pass: password
            }
        }));
    } else {
        transporter = nodemailer.createTransport(smtpTransport({
            host: host,
            port: port,
            auth: {
                user: email,
                pass: password
            }
        }))
    }

    params.transporter = transporter;
    callback(null, params);
}

const getUser = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .findByToken(userId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'User not found', callback));
}

const getUserOptional = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .findByToken(userId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

 const verifyEmailActivation = function(props, params, callback){
   let emailActivated = AppUtils.getProperty(params, props.emailActivated);

   if(emailActivated > 0){
    callback(null, params);
   }else{
    callback('Error', 'Email is not activated. Please activate your account first.');
   }
 }

const getUserByEmailPassword = function(props, params, callback) {
  let email = AppUtils.getProperty(params, props.email),
      password = AppUtils.getProperty(params, props.password);
      
  UserManager
    .validateUser(email, password)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Invalid login credentials.', callback));
}

const findUserByEmail = function(props, params, callback) {
  let email = AppUtils.getProperty(params, props.email);

  UserManager
    .validateUserByEmail(email)
    .then(AppUtils.onFind.bind(null, params, props.setProperty,'Error: Email not found.', callback));
}

const getUserByEmail = function(props, params, callback) {
  let email = AppUtils.getProperty(params, props.email);

  UserManager
    .validateUserByEmail(email)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const isUsingTempPassword = function (props, params, callback){
  let email = AppUtils.getProperty(params, props.email),
      password = AppUtils.getProperty(params, props.password);
      
  UserManager
    .isTempPassword(email, password)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const updateUserByEmail = function(props, params, callback) {
  let email = AppUtils.getProperty(params, props.email);

  UserManager
    .updateUserByEmail(email, props.updateData)
    .then(AppUtils.onUpdate.bind(null, params,'Password not updated', callback));
}

const updateUser = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .updateUserById(userId, props.updatedObj)
    .then(AppUtils.onUpdate.bind(null, params, 'User not updated', callback));
}

const updateUserByToken = function(props, params, callback) {
  let token = AppUtils.getProperty(params, props.token);

  UserManager
    .updateUserByToken(token, props.updateData)
    .then(AppUtils.onUpdate.bind(null, params,'User data is not updated.', callback));
}


const deleteByUserId = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId);

  UserManager
    .deleteByUserId(userId)
    .then(AppUtils.onDelete.bind(null, params, 'Unable to delete User', callback));
}

export default {
  createUser: createUser,
  getUser: getUser,
  updateUser: updateUser,
  getUserOptional: getUserOptional,
  userEmailSender: userEmailSender,
  deleteByUserId : deleteByUserId,
  getUserByEmail: getUserByEmail,
  updateUserByEmail: updateUserByEmail,
  updateUserByToken: updateUserByToken,
  getUserByEmailPassword: getUserByEmailPassword,
  verifyEmailActivation: verifyEmailActivation,
  isUsingTempPassword: isUsingTempPassword,
  findUserByEmail: findUserByEmail
};
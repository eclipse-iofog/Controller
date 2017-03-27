import async from 'async';

import UserService from '../../services/userService';
import AppUtils from '../../utils/appUtils';
import logger from '../../utils/winstonLogs';
import transporter  from '../../utils/emailSender';

/************************ EndPoints ************************************************/

/*************** Validate User at login EndPoint (Post /api/v1/user/login) *****************/
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
    
    if(params.user){
      params.Token = params.user.userAccessToken;
    }

    AppUtils.sendResponse(res, err, 'Token', params.Token, result);
  })
};

/*************** User Signup EndPoint (Post /api/v1/user/signup) *****************/
const userSignupEndPoint = function(req, res) {
   logger.info("Endpoint hitted: "+ req.originalUrl);
   var params = {},
      emailProps = {
        email: 'bodyParams.Email',
        setProperty: 'user'
      },
      newUserProps= {
        firstName: 'bodyParams.FirstName',
        lastName: 'bodyParams.LastName',
        email: 'bodyParams.Email',
        password: 'bodyParams.Password',
        repeatPassword: 'bodyParams.RepeatPassword',
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(validateEmail, emailProps, params),
    async.apply(createUser, newUserProps)
  
  ], function(err, result) {
    AppUtils.sendResponse(res, err, 'User', params.newUser, result);
  })
};

/*************** Reset Password EndPoint (Post /api/v1/user/password/reset) *****************/
const resetPasswordEndPoint = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {},
    emailProps = {
      email: 'bodyParams.Email',
      setProperty: 'userData'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUserByEmail, emailProps, params),
    generateRandomPassword,
    sendEmail    
  
  ], function(err, result) {

    AppUtils.sendResponse(res, err, 'temporaryPassword', params.tempPass, result);
  })
};

/*************** Resend Activation EndPoint (Post /api/v1/user/account/activate/resend) *****************/
const resendActivationEndPoint = function(req, res) {
  logger.info("Endpoint hitted: "+ req.originalUrl);
  var params = {},
    emailProps = {
      email: 'bodyParams.Email',
      setProperty: 'userData'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([

  
  ], function(err, result) {


    AppUtils.sendResponse(res, err, 'activationCode', params.bodyParams.Email, result);
  })
};

/******************************** Extra Functions **********************************/
// Before we can get started, you need to click this link to activate your account. If clicking it doesn't work, please copy and paste it into your Web browser address bar.<br><br>
// <a href="*|ActivationLink|*">*|ActivationLink|*</a>

const generateRandomPassword = function(params, callback){
  params.tempPass = AppUtils.generateRandomString(5);

  var updateProps = {
    email : 'bodyParams.Email',
    updateData : {
      password : params.tempPass
    }
  };

  UserService.updateUserByEmail(updateProps, params, callback);
}

const sendEmail = function(params, callback) {
  if (params.userData){
    let mailOptions = {
      from: '', // sender address
      to: params.bodyParams.Email, // list of receivers
      subject: 'Password Reset Request', // Subject line
      html: 'Hi, ' + params.userData.firstName + ' ' + params.userData.lastName + ' It looks like you were having some trouble with your password? '+
         'You can use the temporary password ' + params.tempPass +' to log in.' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error(error);
        callback('Err', 'Email not sent due to technical reasons. Please try later.');
      }
      logger.info('Message %s sent: %s', info.messageId, info.response);
      callback(null, params);
    });
  }else{
    callback('Err','This email is not registered. Please signup to proceed.')
  }
}

const validateEmail = function(props, params, callback) {
  var email = AppUtils.getProperty(params, props.email);

  if (email){
    if (AppUtils.isValidEmail(email)) {
        UserService.getUserByEmail(props, params, callback);
    }else{
      callback('Err', 'Registration failed: Please enter a valid email address.');
    }
  }else{
      callback('Err', 'Registration failed: Please enter a valid email address.');
  }
}

const createUser = function(props, params, callback) {
  var firstName = AppUtils.getProperty(params, props.firstName),
    lastName = AppUtils.getProperty(params, props.lastName),
    email = AppUtils.getProperty(params, props.email),
    password = AppUtils.getProperty(params, props.password),
    repeatPassword = AppUtils.getProperty(params, props.repeatPassword);

  var user = {
    firstName: firstName,
    lastName: lastName,
    email: email,
    password: password,
    userAccessToken: AppUtils.generateAccessToken()
  };

  if(!params.user){
    if (password && password.length >= 8){
      if(password == repeatPassword){
        var userProps = {
          user: user,
          setProperty:'newUser'
        };
        
        UserService.createUser(userProps, params, callback);
      }else{
        callback('Err', 'Registration failed: Passwords do not match.');
      }
    }else{
        callback('Err', 'Registration failed: Your password must have at least 8 characters and must contain at least 1 number and 1 uppercase letter.');
    }
  }else{
   callback('Err', 'Registration failed: There is already an account associated with your email address. Please try logging in instead.');
  }
}

export default {
  validateUserEndPoint: validateUserEndPoint,
  userSignupEndPoint: userSignupEndPoint,
  resetPasswordEndPoint: resetPasswordEndPoint,
  resendActivationEndPoint: resendActivationEndPoint
}
/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const async = require('async');
const https = require('https');
//require('dotenv').config();

const emailRecoveryTemplate = require('../views/emailTemp');
const emailResetTemplate = require('../views/resetPasswordTemp');
const emailActivationTemplate = require('../views/emailActivationTemp');

const EmailActivationCodeService = require('../services/emailActivationCodeService');
const UserService = require('../services/userService');
const FogAccessTokenService = require('../services/fogAccessTokenService');

//import transporter  from '../../utils/emailSender';
const AppUtils = require('../utils/appUtils');
const logger = require('../logger');
const appConfig = require('./../config');
const constants = require('../constants');

/**************************************** EndPoints *************************************************/
/************ Activate User Account EndPoint (Get: /account/activate/code/:code) *******/
 const activateUserAccountEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
    activationCodeProps = {
      activationCode: 'bodyParams.code',
      setProperty: 'activationCodeData'
    };

  params.bodyParams = req.params;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(EmailActivationCodeService.verifyActivationCode, activationCodeProps, params),
    updateUser

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};

const updateUser = function(params, callback){
  let userProps = {
    userId: 'activationCodeData.user_id',
    updatedObj:{
      emailActivated: 1
    }
  };
  UserService.updateUser(userProps, params, callback);
}

/************ Resend Email Activation EndPoint (Post: /api/v1/user/account/activate/resend) *******/
 const resendEmailActivationEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
    userProps = {
      email: 'bodyParams.email',
      setProperty: 'user'
    },
    emailProps = {
      service: 'emailSenderData.service',
      host: 'emailSenderData.host',
      port: 'emailSenderData.port',
      email: 'emailSenderData.email',
      password: 'emailSenderData.password'
    },
    activationCodeProps = {
      userId: 'user.id',
      activationCode: 'activationCodeData.activationCode',
      expirationTime: 'activationCodeData.expirationTime'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.findUserByEmail, userProps, params),
    EmailActivationCodeService.generateActivationCode,
    async.apply(EmailActivationCodeService.saveActivationCode, activationCodeProps),
    getEmailData,
    getIOAuthoringData,
    async.apply(UserService.userEmailSender, emailProps),
    notifyUserAboutActivationCode

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};

 const authenticateUserEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);
  let params = {},

    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    };

  params.bodyParams = req.params;

  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUser, userProps, params),

  ], function(err, result) {
    AppUtils.sendResponse(res, err, '', '', result);
  })
};

/***************************** User Signup EndPoint (Post: /api/v1/user/signup) ***********************/
 const userSignupEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
    userProps = {
      email: 'bodyParams.email',
      setProperty: 'user'
    },
    emailProps = {
      service: 'emailSenderData.service',
      host: 'emailSenderData.host',
      port: 'emailSenderData.port',
      email: 'emailSenderData.email',
      password: 'emailSenderData.password'
    },
    activationCodeProps = {
      userId: 'newUser.id',
      activationCode: 'activationCodeData.activationCode',
      expirationTime: 'activationCodeData.expirationTime'
    };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  let enableEmailActivation = config.get('email_activation') || 'off';
  params.emailActivation = enableEmailActivation;

  const getUser = [async.apply(UserService.getUserByEmail, userProps, params), validateUserInfo, createNewUser];

  if (enableEmailActivation === 'on') {
      async.waterfall([
          ...getUser,
          EmailActivationCodeService.generateActivationCode,
          async.apply(EmailActivationCodeService.saveActivationCode, activationCodeProps),
          getEmailData,
          getIOAuthoringData,
          async.apply(UserService.userEmailSender, emailProps),
          notifyUserAboutActivationCode

      ], function (err, result) {
          AppUtils.sendResponse(res, err, 'emailActivation', enableEmailActivation, result);
      })
  } else {
      async.waterfall([
          ...getUser
      ], function (err, result) {
          AppUtils.sendResponse(res, err, 'emailActivation', enableEmailActivation, result);
      })
  }
};

const notifyUserAboutActivationCode = function(params, callback){
  try{
    let ioAuthoringUrl = params.ioAuthoringConfigData.ioAuthoringProtocol + '://' + params.ioAuthoringConfigData.ioAuthoringIPAddress + ':' + params.ioAuthoringConfigData.ioAuthoringPort;

    let mailOptions = {
      from: '"IOFOG" <' + params.emailSenderData.email + '>', // sender address
      to: params.bodyParams.email, // list of receivers
      subject: 'Activate Your Account', // Subject line
      html: emailActivationTemplate.p1 + ioAuthoringUrl + emailActivationTemplate.p2 + params.activationCodeData.activationCode + emailActivationTemplate.p3 + ioAuthoringUrl + emailActivationTemplate.p4 + params.activationCodeData.activationCode + emailActivationTemplate.p5 + ioAuthoringUrl + emailActivationTemplate.p6 + params.activationCodeData.activationCode + emailActivationTemplate.p7 // html body
    };

    // send mail with defined transport object
    params.transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error(error);
        callback('Err', 'Email not sent due to technical reasons. Please try later.');
      }else{
        logger.info('Message %s sent: %s', info.messageId, info.response);
        callback(null, params);
      }
    });
}catch(e){
  logger.error(e);
}
}

const validateUserInfo = function(params, callback){
  if(!params.user){
    if(AppUtils.isValidEmail(params.bodyParams.email)){
      if(params.bodyParams.password.length > 7){
        if(params.bodyParams.password === params.bodyParams.repeatPassword){
          if(params.bodyParams.firstName.length > 2){
            if(params.bodyParams.lastName.length > 2){
              callback(null, params)
            }else{
              callback('err', 'Registration failed: Last Name length should be atleast 3 characters.')
            }
          }else{
            callback('err', 'Registration failed: First Name length should be atleast 3 characters.')
          }
        }else{
          callback('err', 'Registration failed: Passwords do not match.')
        }
      }else{
        callback('err', 'Registration failed: Your password must have at least 8 characters.')
      }
    }else{
      callback('err', 'Registration failed: Please enter a valid email address.')
    }
  }else{
    callback('err', 'Registration failed: There is already an account associated with your email address. Please try logging in instead.')
  }
}

const createNewUser = function (params, callback){
  let newUserProps = {
    user: {
      email: params.bodyParams.email,
      password: params.bodyParams.password,
      firstName: params.bodyParams.firstName,
      lastName: params.bodyParams.lastName,
      emailActivated: params.emailActivation === 'on' ? 0 : 1
    },
    setProperty: 'newUser'
  };

  UserService.createUser(newUserProps, params, callback)
}

/**************************** Reset User Password (Post: /api/v1/user/password/reset) ********************/
const resetUserPasswordEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);
  let tempPass = AppUtils.generateRandomString(2) + 'uL7';
  let params = {},
    userProps = {
      email: 'bodyParams.email',
      setProperty: 'user'
    },
    updatePasswordProps = {
      email: 'bodyParams.email',
      updateData: {
        tempPassword: tempPass
      }
    },
    emailProps = {
      service: 'emailSenderData.service',
      host: 'emailSenderData.host',
      port: 'emailSenderData.port',
      email: 'emailSenderData.email',
      password: 'emailSenderData.password'
    };

  params.tempPass = tempPass;
  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.getUserByEmail, userProps, params),
    async.apply(UserService.updateUserByEmail, updatePasswordProps),
    getEmailData,
    getIOAuthoringData,
    async.apply(UserService.userEmailSender, emailProps),
    notifyUserAboutPasswordReset

  ], function(err, result) {

    AppUtils.sendResponse(res, err, '', '', result);
  })
};


const notifyUserAboutPasswordReset = function(params, callback){
  try{

    let ioAuthoringUrl = params.ioAuthoringConfigData.ioAuthoringProtocol + '://' + params.ioAuthoringConfigData.ioAuthoringIPAddress + ':' + params.ioAuthoringConfigData.ioAuthoringPort;

    if (params.user){
      let mailOptions = {
        from: '"IOFOG" <' + params.emailSenderData.email + '>', // sender address
        to: params.user.email, // list of receivers
        subject: 'Password Reset Request', // Subject line
        html: emailResetTemplate.p1 + params.user.firstName + ' ' + params.user.lastName + emailResetTemplate.p2 +  params.tempPass + emailResetTemplate.p3 + ioAuthoringUrl + emailResetTemplate.p4// html body
      };

      // send mail with defined transport object
      params.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          logger.error(error);
          callback('Err', 'Email not sent due to technical reasons. Please try later.');
        }else{
          logger.info('Message %s sent: %s', info.messageId, info.response);
          callback(null, params);
        }
      });
    }else{
      callback('Err','Cannot find user email.')
    }
  }catch(e){
    logger.error(e);
  }
}

/********************* Validate User at login EndPoint (Post: /api/v1/user/login) ************************/
 const validateUserEndPoint = function(req, res) {
  logger.info("Endpoint hit: "+ req.originalUrl);

  let params = {},
      userProps = {
        email: 'bodyParams.email',
        password: 'bodyParams.password',
        setProperty: 'user'
      },
      emailActivationProps = {
        emailActivated: 'user.emailActivated'
      };

  params.bodyParams = req.body;
  logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  async.waterfall([
    async.apply(UserService.isUsingTempPassword, userProps, params),
    validateUser,
    async.apply(UserService.verifyEmailActivation, emailActivationProps),
    FogAccessTokenService.generateAccessToken,
    updateUserAccessTokenByEmail

  ], function(err, result) {
    if(params.tokenData){
      params.token = params.tokenData.accessToken;
    }

    let output = {
      token: params.token,
      destination: params.destination
    }

    AppUtils.sendResponse(res, err, 'output', output, result);
  })
};

const validateUser = function (params, callback){
  if (!params.user){
    let userProps = {
      email: 'bodyParams.email',
      password: 'bodyParams.password',
      setProperty: 'user' 
    };

    UserService.getUserByEmailPassword(userProps, params, callback);
  }else{
    params.destination = 'changePassword'
    callback(null, params);
  }
  //   let updatePasswordProps = {
  //     email: 'bodyParams.email',
  //     updateData: {
  //       tempPassword: ''
  //     }
  //   };

  //   UserService.updateUserByEmail(updatePasswordProps, params, callback);
  // }
}

/*************** User Logout EndPoint (Post /api/v1/user/logout) *****************/
const logoutUserEndPoint = function(req, res){
  logger.info("Endpoint hit: "+ req.originalUrl);

    let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    updateUserProps = {
      email: 'user.email',
      updateData: {
        userAccessToken: ''
      }
    };

    params.bodyParams = req.body;
    logger.info("Parameters:" + JSON.stringify(params.bodyParams));

    async.waterfall([
      async.apply(UserService.getUser, userProps, params),
      async.apply(UserService.updateUserByEmail, updateUserProps)

    ], function(err, result) {
      
      AppUtils.sendResponse(res, err, '', '', result);
    });
}

/********************** Get User Details EndPoint (Get: /api/v2/get/user/data/:t *******************************/
 const getUserDetailsEndPoint = function(req, res) {
 	logger.info("Endpoint hit: "+ req.originalUrl);

  	let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    };

  	params.bodyParams = req.params;
  	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  	async.waterfall([
    	async.apply(UserService.getUser, userProps, params)

   	], function(err, result) {
   		if(!err){
   			let output = {
 				firstName: params.user.firstName,
 				lastName: params.user.lastName
 			}
 			params.output = output;
   		}
    	
    	AppUtils.sendResponse(res, err, 'user', params.output, result);
  	});
 }

/********************** Update User Details EndPoint (Post: /api/v1/user/profile/update *****************/
 const updateUserDetailsEndPoint = function(req, res) {
 	logger.info("Endpoint hit: "+ req.originalUrl);

  	let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    };

  	params.bodyParams = req.body;
  	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  	async.waterfall([
    	async.apply(UserService.getUser, userProps, params),
    	updateUserProfile

   	], function(err, result) {
    	
    	AppUtils.sendResponse(res, err, '', '', result);
  	});
 }

/********************** Update User Password EndPoint (Post: /api/v1/user/password/change *****************/
 const updateUserPasswordEndPoint = function(req, res) {
 	logger.info("Endpoint hit: "+ req.originalUrl);

  	let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    emailProps = {
      service: 'emailSenderData.service',
      host: 'emailSenderData.host',
      port: 'emailSenderData.port',
      email: 'emailSenderData.email',
      password: 'emailSenderData.password'
    };

  	params.bodyParams = req.body;
  	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  	async.waterfall([
    	async.apply(UserService.getUser, userProps, params),
    	validateOldPassword,
    	validateNewPassword,
      getEmailData,
      async.apply(UserService.userEmailSender, emailProps),
    	updateUserPassword,
    	notifyUserAboutPasswordChange

   	], function(err, result) {
    	AppUtils.sendResponse(res, err, '', '', result);
  	});
 }

const getEmailData = function(params, callback){
  try{
  configUtil.getAllConfigs().then(() => {
    let email = config.get(constants.CONFIG.email_address),
    password = config.get(constants.CONFIG.email_password),
    service = config.get(constants.CONFIG.email_service),
    host = config.get(constants.CONFIG.email_server),
    port = config.get(constants.CONFIG.email_serverport);

    params.emailSenderData = {
      email: email,
      password: password,
      service: service,
      host: host,
      port: port
    };
    callback(null, params);
  });
}catch(e){
  logger.error(e);
}
}

const notifyUserAboutPasswordChange = function(params, callback){
	try{
  if (params.user){
    let mailOptions = {
      from: '"IOFOG" <' + params.emailSenderData.email + '>', // sender address
      to: params.user.email, // list of receivers
      subject: 'Password Change Notification', // Subject line
      html: emailRecoveryTemplate.p1+ params.user.firstName + ' ' + params.user.lastName + emailRecoveryTemplate.p2 // html body
    };

    // send mail with defined transport object
    params.transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error(error);
        callback('Err', 'Email not sent due to technical reasons. Please try later.');
      }else{
      	logger.info('Message %s sent: %s', info.messageId, info.response);
      	callback(null, params);
      }
    });
  }else{
    callback('Err','Cannot find user email.')
  }
}catch(e){
	logger.error(e);
}
}

/********************** Delete User Account EndPoint (Post: /api/v1/user/account/delete *****************/
 const deleteUserAccountEndPoint = function(req, res) {
 	logger.info("Endpoint hit: "+ req.originalUrl);

  	let params = {},
    userProps = {
      userId: 'bodyParams.t',
      setProperty: 'user'
    },
    deleteProps = {
      userId: 'user.id'
    };

  	params.bodyParams = req.body;
  	logger.info("Parameters:" + JSON.stringify(params.bodyParams));

  	async.waterfall([
    	async.apply(UserService.getUser, userProps, params),
    	async.apply(UserService.deleteByUserId, deleteProps)

   	], function(err, result) {
    	AppUtils.sendResponse(res, err, '', '', result);
  	});
 }

/***************************** Extra Functions **************************/
 const validateOldPassword = function(params, callback){
 	if(params.bodyParams.oldPassword == params.user.password || params.bodyParams.oldPassword == params.user.tempPassword){
 		

    callback(null, params);
 	}else{
 		callback('Error', 'Old password donot match with this userId.');
 	}
 }

 const validateNewPassword = function(params, callback){
 	if(params.bodyParams.newPassword.length > 7)	
 		if(params.bodyParams.newPassword == params.bodyParams.repeatNewPassword){
 			callback(null, params);
 		}else{
 			callback('Error', 'New passwords donot match each other.');
 	}else{
 		callback('Error', 'Password length should be at least 8 characters.');
 	}
 }

 const updateUserPassword = function(params, callback){
    let updateProps = {
      token: 'bodyParams.t',
      updateData: {
      	password: params.bodyParams.newPassword
      }
    };
 	UserService.updateUserByToken(updateProps, params, callback);
 }

 const updateUserAccessTokenByEmail = function(params, callback){
  let updateProps = {
    updateData:{
      userAccessToken: params.tokenData.accessToken
    },
    email: 'bodyParams.email'
  };

  UserService.updateUserByEmail(updateProps, params, callback);
}

 const updateUserProfile = function(params, callback){
  if (params.bodyParams.firstName.length > 2){
    if(params.bodyParams.lastName.length > 2){
      let updateProps = {
        token: 'bodyParams.t',
        updateData: {
      	 firstName: params.bodyParams.firstName,
      	 lastName: params.bodyParams.lastName
        }
      };
 	  
      UserService.updateUserByToken(updateProps, params, callback);
    }else{
    callback('Error', 'Last Name should have at least 3 characters.' )
    }
  }else{
    callback('Error', 'First Name should have at least 3 characters.' )
 }
 }

 module.exports =  {
  authenticateUserEndPoint: authenticateUserEndPoint,
 	getUserDetailsEndPoint: getUserDetailsEndPoint,
 	updateUserDetailsEndPoint: updateUserDetailsEndPoint,
 	updateUserPasswordEndPoint: updateUserPasswordEndPoint,
 	deleteUserAccountEndPoint: deleteUserAccountEndPoint,
  validateUserEndPoint: validateUserEndPoint,
  logoutUserEndPoint: logoutUserEndPoint,
  userSignupEndPoint: userSignupEndPoint,
  resetUserPasswordEndPoint: resetUserPasswordEndPoint,
  resendEmailActivationEndPoint: resendEmailActivationEndPoint,
  activateUserAccountEndPoint: activateUserAccountEndPoint
 }
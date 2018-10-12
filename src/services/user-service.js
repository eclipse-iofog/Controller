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

const nodemailer = require('nodemailer');
let smtpTransport = require('nodemailer-smtp-transport');
const UserManager = require('../sequelize/managers/user-manager');
const AppHelper = require('../helpers/app-helper');
const Errors = require('../helpers/errors');

const Config = require('../config');

const emailActivationTemplate = require('../views/email-activation-temp');
const emailRecoveryTemplate = require('../views/email-temp');
const emailResetTemplate = require('../views/reset-password-temp');
const EmailActivationCodeService = require('./email-activation-code-service');

const AccessTokenService = require('./access-token-service');

const ConfigHelper = require('../helpers/config-helper');
const logger = require('../logger');
const constants = require('../helpers/constants');

const TransactionDecorator = require('../decorators/transaction-decorator');

const createUser = async function (user, transaction) {
  return await UserManager.create(user, transaction)
};

const signUp = async function (user, transaction) {

  let emailActivation = ConfigHelper.getConfigParam('email_activation') || 'off';

  AppHelper.validateFields(user, ["firstName", "lastName", "email", "password"]);
  _validateUserInfo(user);

  if (emailActivation === 'on') {

    const newUser = await _handleCreateUser(user, emailActivation, transaction);

    const activationCodeData = await EmailActivationCodeService.generateActivationCode(transaction);
    await EmailActivationCodeService.saveActivationCode(newUser.id, activationCodeData, transaction);

    const emailData = await _getEmailData(transaction);
    const transporter = await _userEmailSender(emailData);
    await _notifyUserAboutActivationCode(user.email, Config.get('Email:HomeUrl'), emailData, activationCodeData, transporter);
    return newUser;
  } else {
    return await _handleCreateUser(user, emailActivation, transaction);
  }
};

const login = async function (credentials, transaction) {

  AppHelper.validateFields(credentials, ["email", "password"]);
  const user = await UserManager.findOne({
    email: credentials.email
  }, transaction);
  if (!user) {
    throw new Errors.InvalidCredentialsError();
  }

  const validPassword = credentials.password === user.password || credentials.password === user.tempPassword;
  if (!validPassword) {
    throw new Errors.InvalidCredentialsError();
  }

  _verifyEmailActivation(user.emailActivated);

  const accessToken = await _generateAccessToken(transaction);
  accessToken.userId = user.id;

  await AccessTokenService.createAccessToken(accessToken, transaction);

  return {
    accessToken: accessToken.token
  }
};

const resendActivation = async function (emailObj, transaction) {

  AppHelper.validateFields(emailObj, ["email"]);

  const user = await UserManager.findOne({
    email: emailObj.email
  }, transaction);
  if (!user) {
    throw new Errors.ValidationError("Invalid user email.");
  }

  const activationCodeData = await EmailActivationCodeService.generateActivationCode(transaction);
  await EmailActivationCodeService.saveActivationCode(user.id, activationCodeData, transaction);

  const emailData = await _getEmailData(transaction);
  const transporter = await _userEmailSender(emailData);
  await _notifyUserAboutActivationCode(user.email, Config.get('Email:HomeUrl'), emailData, activationCodeData, transporter);
};

const activateUser = async function (codeData, transaction) {

  AppHelper.validateFields(codeData, ["activationCode"]);
  const activationCode = await EmailActivationCodeService.verifyActivationCode(codeData.activationCode, transaction);
  if (!activationCode) {
    throw new Errors.NotFoundError('Activation code not found')
  }

  const updatedObj = {
    emailActivated: 1
  };

  await _updateUser(activationCode.userId, updatedObj, transaction);
  await EmailActivationCodeService.deleteActivationCode(codeData.activationCode, transaction);
};

const logout = async function (user, transaction) {
  return await AccessTokenService.removeAccessTokenByUserId(user.id, transaction)
};

const updateDetails = async function (user, profileData, transaction) {
  AppHelper.validateFields(profileData, ["firstName", "lastName"]);

  if (profileData.firstName.length < 3) {
    throw new Errors.ValidationError('First Name length should be at least 3 characters.');
  } else if (profileData.lastName.length < 3) {
    throw new Errors.ValidationError('Last Name length should be at least 3 characters.');
  }

  await UserManager.updateDetails(user, profileData, transaction);
};

const deleteUser = async function (user, transaction) {
  await UserManager.delete({
    id: user.id
  }, transaction);
};

const updateUserPassword = async function (passwordUpdates, user, transaction) {
  AppHelper.validateFields(passwordUpdates, ["oldPassword", "newPassword"]);

  if (user.password !== passwordUpdates.oldPassword && user.tempPassword !== passwordUpdates.oldPassword) {
    throw new Errors.ValidationError('Old password is incorrect')
  }

  const emailData = await _getEmailData(transaction);
  const transporter = await _userEmailSender(emailData);

  await UserManager.updatePassword(user.id, passwordUpdates.newPassword, transaction);
  await _notifyUserAboutPasswordChange(user, emailData, transporter);
};

const resetUserPassword = async function (emailObj, transaction) {
  AppHelper.validateFields(emailObj, ["email"]);

  const user = await UserManager.findOne({
    email: emailObj.email
  }, transaction);
  if (!user) {
    throw new Errors.NotFoundError("Account not found");
  }

  let tempPass = AppHelper.generateRandomString(2) + 'uL7';
  let tempDbPass = AppHelper.encryptText(tempPass, user.email);
  await UserManager.updateTempPassword(user.id, tempDbPass, transaction);

  const emailData = await _getEmailData(transaction);
  const transporter = await _userEmailSender(emailData);
  await _notifyUserAboutPasswordReset(user, Config.get('Email:HomeUrl'), emailData, tempPass, transporter);
};

const list = async function (transaction) {
  return await UserManager.findAll({}, transaction);
};

async function _updateUser(userId, updatedUser, transaction) {
  try {
    return await UserManager.update({
      id: userId
    }, updatedUser, transaction)
  } catch (errMsg) {
    throw new Error('User not updated')
  }
}

async function _generateAccessToken(transaction) {
  while (true) {
    let newAccessToken = AppHelper.generateAccessToken();
    const exists = await UserManager.findByAccessToken(newAccessToken, transaction);
    if (!exists) {
      let tokenExpiryTime = new Date().getTime() + (Config.get('Settings:UserTokenExpirationIntervalSeconds') * 1000);

      return {
        token: newAccessToken,
        expirationTime: tokenExpiryTime
      };
    }
  }
}

function _verifyEmailActivation(emailActivated) {
  const emailActivation = ConfigHelper.getConfigParam('email_activation');
  if (emailActivation === 'on' && emailActivated === 0)
    throw new Error('Email is not activated. Please activate your account first.');
}


async function _userEmailSender(emailData) {
  let transporter;
  if (emailData.service) {
    transporter = nodemailer.createTransport(smtpTransport({
      service: emailData.service,
      auth: {
        user: emailData.email,
        pass: emailData.password
      }
    }));
  } else {
    transporter = nodemailer.createTransport(smtpTransport({
      host: emailData.host,
      port: emailData.port,
      auth: {
        user: emailData.email,
        pass: emailData.password
      }
    }))
  }

  return transporter
}

async function _handleCreateUser(user, emailActivation, transaction) {
  const existingUser = await UserManager.findOne({
    email: user.email
  }, transaction);

  if (existingUser) {
    throw new Errors.ValidationError('Registration failed: There is already an account associated with your email address. Please try logging in instead.');
  }
  await _validateUserInfo(user);
  return await _createNewUser(user, emailActivation, transaction);
}

function _validateUserInfo(user) {
  if (!AppHelper.isValidEmail(user.email)) {
    throw new Errors.ValidationError('Registration failed: Please enter a valid email address.');
  } else if (user.firstName.length < 3) {
    throw new Errors.ValidationError('Registration failed: First Name length should be at least 3 characters.');
  } else if (user.lastName.length < 3) {
    throw new Errors.ValidationError('Registration failed: Last Name length should be at least 3 characters.');
  }
}

async function _createNewUser(user, emailActivation, transaction) {
  user.emailActivated = emailActivation === 'on' ? 0 : 1;
  return await createUser(user, transaction)
}

async function _notifyUserAboutActivationCode(email, url, emailSenderData, activationCodeData, transporter) {
  let mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: email,
    subject: 'Activate Your Account',
    html: emailActivationTemplate.p1 + url + emailActivationTemplate.p2 + activationCodeData.activationCode + emailActivationTemplate.p3 + url + emailActivationTemplate.p4 + activationCodeData.activationCode + emailActivationTemplate.p5 + url + emailActivationTemplate.p6 + activationCodeData.activationCode + emailActivationTemplate.p7
  };

  await _sendEmail(transporter, mailOptions);
}

async function _notifyUserAboutPasswordChange(user, emailSenderData, transporter) {
  let mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: user.email,
    subject: 'Password Change Notification',
    html: emailRecoveryTemplate.p1 + user.firstName + ' ' + user.lastName + emailRecoveryTemplate.p2
  };

  await _sendEmail(transporter, mailOptions);
}


async function _notifyUserAboutPasswordReset(user, url, emailSenderData, tempPass, transporter) {
  let mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>',
    to: user.email,
    subject: 'Password Reset Request',
    html: emailResetTemplate.p1 + user.firstName + ' ' + user.lastName + emailResetTemplate.p2 + tempPass + emailResetTemplate.p3 + url + emailResetTemplate.p4
  };

  await _sendEmail(transporter, mailOptions);
}

async function _sendEmail(transporter, mailOptions) {
  await transporter.sendMail(mailOptions);
}

async function _getEmailData(transaction) {
  const response = {};
  await ConfigHelper.getAllConfigs(transaction).then(async () => {
    response.email = ConfigHelper.getConfigParam(constants.CONFIG.email_address);
    response.password = ConfigHelper.getConfigParam(constants.CONFIG.email_password);
    response.service = ConfigHelper.getConfigParam(constants.CONFIG.email_service);
    response.host = ConfigHelper.getConfigParam(constants.CONFIG.email_server);
    response.port = ConfigHelper.getConfigParam(constants.CONFIG.email_serverport);
  });

  return response;
}

module.exports = {
  signUp: TransactionDecorator.generateTransaction(signUp),
  login: TransactionDecorator.generateTransaction(login),
  resendActivation: TransactionDecorator.generateTransaction(resendActivation),
  activateUser: TransactionDecorator.generateTransaction(activateUser),
  logout: TransactionDecorator.generateTransaction(logout),
  updateUserDetails: TransactionDecorator.generateTransaction(updateDetails),
  deleteUser: TransactionDecorator.generateTransaction(deleteUser),
  updateUserPassword: TransactionDecorator.generateTransaction(updateUserPassword),
  resetUserPassword: TransactionDecorator.generateTransaction(resetUserPassword),
  list: TransactionDecorator.generateTransaction(list)
};
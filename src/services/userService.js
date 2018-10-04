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
const UserManager = require('../sequelize/managers/userManager');
const AppHelper = require('../helpers/appHelper');
const Errors = require('../helpers/errors');

const emailActivationTemplate = require('../views/emailActivationTemp');

const EmailActivationCodeService = require('../services/emailActivationCodeService');

const ConfigHelper = require('../helpers/configHelper');
const logger = require('../logger');
const constants = require('../constants');

const createUser = async function (user) {
  return await UserManager.addUser(user)
};

const getUserByEmail = async function (email) {
  return UserManager.validateUserByEmail(email);
};

const signUp = async function (user) {

  let emailActivation = ConfigHelper.getConfigParam('email_activation') || 'off';

  _validate(user);

  if (emailActivation === 'on') {

    const newUser = await _handleCreateUser(user, emailActivation);

    const activationCodeData = await EmailActivationCodeService.generateActivationCode();
    await EmailActivationCodeService.saveActivationCode(newUser.id, activationCodeData);

    const emailData = await _getEmailData();
    const transporter = await _userEmailSender(emailData);
    await _notifyUserAboutActivationCode(user.email, "https://google.com", emailData, activationCodeData, transporter);
    return newUser;
  } else {
    return await _handleCreateUser(user, emailActivation);
  }
};


function _validate(user) {
  AppHelper.validateFields(user, ["firstName", "lastName", "email", "password"]);
  _validateUserInfo(user);
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

async function _handleCreateUser(user, emailActivation) {
  const existingUser = await getUserByEmail(user.email);
  if (existingUser)
    throw new Errors.ValidationError('Registration failed: There is already an account associated with your email address. Please try logging in instead.');
  await _validateUserInfo(user);
  return await _createNewUser(user, emailActivation);
}

function _validateUserInfo(user) {
  if (!AppHelper.isValidEmail(user.email)) {
    throw new Errors.ValidationError('Registration failed: Please enter a valid email address.');
  } else if (!user.password.length > 7) {
    throw new Errors.ValidationError('Registration failed: Your password must have at least 8 characters.');
  } else if (!user.firstName.length > 2) {
    throw new Errors.ValidationError('Registration failed: First Name length should be at least 3 characters.');
  } else if (!user.lastName.length > 2) {
    throw new Errors.ValidationError('Registration failed: Last Name length should be at least 3 characters.');
  }
}

async function _createNewUser(user, emailActivation) {
  user.emailActivated = emailActivation === 'on' ? 0 : 1;
  return await createUser(user)
}

async function _notifyUserAboutActivationCode(email, url, emailSenderData, activationCodeData, transporter) {
  let mailOptions = {
    from: '"IOFOG" <' + emailSenderData.email + '>', // sender address
    to: email, // list of receivers
    subject: 'Activate Your Account', // Subject line
    html: emailActivationTemplate.p1 + url + emailActivationTemplate.p2 + activationCodeData.activationCode + emailActivationTemplate.p3 + url + emailActivationTemplate.p4 + activationCodeData.activationCode + emailActivationTemplate.p5 + url + emailActivationTemplate.p6 + activationCodeData.activationCode + emailActivationTemplate.p7 // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      throw new Error('Email not sent due to technical reasons. Please try later.');
    } else {
      logger.info('Message %s sent: %s', info.messageId, info.response);
    }
  });
}

async function _getEmailData() {
  const response = {};
  await ConfigHelper.getAllConfigs().then(async () => {
    response.email = ConfigHelper.getConfigParam(constants.CONFIG.email_address);
    response.password = ConfigHelper.getConfigParam(constants.CONFIG.email_password);
    response.service = ConfigHelper.getConfigParam(constants.CONFIG.email_service);
    response.host = ConfigHelper.getConfigParam(constants.CONFIG.email_server);
    response.port = ConfigHelper.getConfigParam(constants.CONFIG.email_serverport);
  });

  return response;
}

module.exports = {
  createUser: createUser,
  getUserByEmail: getUserByEmail,
  signUp: signUp
};
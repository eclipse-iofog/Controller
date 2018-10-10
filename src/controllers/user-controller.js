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

const logger = require('../logger');

const UserService = require('../services/user-service');
const AuthDecorator = require('../decorators/authorization-decorator');
const AppHelper = require('../helpers/app-helper');

const Errors = require('../helpers/errors');

const userSignupEndPoint = async function (req) {
  const user = req.body;

  _validatePassword(user.password);
  user.password = AppHelper.encryptText(user.password, user.email);

  logger.info("Parameters:" + JSON.stringify(user));

  return await UserService.signUp(user);
};

const userLoginEndPoint = async function (req) {
  const user = req.body;

  user.password = AppHelper.encryptText(user.password, user.email);

  logger.info("Parameters:" + JSON.stringify(user));

  return await UserService.login(user);
};

const resendActivationEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.query));

  const emailData = req.query;

  return await UserService.resendActivation(emailData);
};

const activateUserAccountEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const codeData = req.body;

  return await UserService.activateUser(codeData);
};

const userLogoutEndPoint = async function (req, user) {
  return await UserService.logout(user);
};

const getUserProfileEndPoint = async function (req, user) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  }
};

const updateUserProfileEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const profileData = req.body;

  return await UserService.updateUserDetails(user, profileData);
};

const deleteUserProfileEndPoint = async function (req, user) {
  return await UserService.deleteUser(user);
};

const updateUserPasswordEndPoint = async function (req, user) {
  const passwordUpdates = req.body;

  _validatePassword(passwordUpdates.oldPassword);
  _validatePassword(passwordUpdates.newPassword);
  passwordUpdates.oldPassword = AppHelper.encryptText(passwordUpdates.oldPassword, user.email);
  passwordUpdates.newPassword = AppHelper.encryptText(passwordUpdates.newPassword, user.email);

  logger.info("Parameters:" + JSON.stringify(passwordUpdates));

  return await UserService.updateUserPassword(passwordUpdates, user);
};

const resetUserPasswordEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const emailObj = req.body;

  return await UserService.resetUserPassword(emailObj);
};

function _validatePassword(password) {
  if (password.length < 8) {
    throw new Errors.ValidationError('Your password must have at least 8 characters.');
  }
}

module.exports = {
  userSignupEndPoint: userSignupEndPoint,
  userLoginEndPoint: userLoginEndPoint,
  resendActivationEndPoint: resendActivationEndPoint,
  activateUserAccountEndPoint: activateUserAccountEndPoint,
  userLogoutEndPoint: AuthDecorator.checkAuthToken(userLogoutEndPoint),
  getUserProfileEndPoint: AuthDecorator.checkAuthToken(getUserProfileEndPoint),
  updateUserProfileEndPoint: AuthDecorator.checkAuthToken(updateUserProfileEndPoint),
  deleteUserProfileEndPoint: AuthDecorator.checkAuthToken(deleteUserProfileEndPoint),
  updateUserPasswordEndPoint: AuthDecorator.checkAuthToken(updateUserPasswordEndPoint),
  resetUserPasswordEndPoint: resetUserPasswordEndPoint
};
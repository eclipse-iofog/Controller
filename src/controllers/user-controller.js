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

const Validator = require('../schemas');

const userSignupEndPoint = async function (req) {
  const user = req.body;

  await Validator.validate(user, Validator.schemas.signUp);

  user.password = AppHelper.encryptText(user.password, user.email);

  logger.info("Parameters:" + JSON.stringify(user));

  return await UserService.signUp(user, false);
};

const userLoginEndPoint = async function (req) {
  const user = req.body;

  await Validator.validate(user, Validator.schemas.login);

  user.password = AppHelper.encryptText(user.password, user.email);

  logger.info("Parameters:" + JSON.stringify(user));

  return await UserService.login(user, false);
};

const resendActivationEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.query));

  const emailData = req.query;

  return await UserService.resendActivation(emailData, false);
};

const activateUserAccountEndPoint = async function (req) {
  const codeData = req.body;

  return await UserService.activateUser(codeData, false);
};

const userLogoutEndPoint = async function (req, user) {
  return await UserService.logout(user, false);
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

  return await UserService.updateUserDetails(user, profileData, false);
};

const deleteUserProfileEndPoint = async function (req, user) {
  return await UserService.deleteUser(user, false);
};

const updateUserPasswordEndPoint = async function (req, user) {
  const passwordUpdates = req.body;

  await Validator.validate(passwordUpdates, Validator.schemas.updatePassword);

  passwordUpdates.oldPassword = AppHelper.encryptText(passwordUpdates.oldPassword, user.email);
  passwordUpdates.newPassword = AppHelper.encryptText(passwordUpdates.newPassword, user.email);

  logger.info("Parameters:" + JSON.stringify(passwordUpdates));

  return await UserService.updateUserPassword(passwordUpdates, user, false);
};

const resetUserPasswordEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const emailObj = req.body;

  return await UserService.resetUserPassword(emailObj, false);
};

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
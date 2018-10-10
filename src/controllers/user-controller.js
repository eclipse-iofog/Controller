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

const userSignupEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const user = req.body;

  return await UserService.signUp(user);
};

const userLoginEndPoint = async function (req) {
  logger.info("Parameters:" + JSON.stringify(req.body));

  const user = req.body;

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

const _userLogoutEndPoint = async function (req, user) {
  return await UserService.logout(user);
};

module.exports = {
  userSignupEndPoint: userSignupEndPoint,
  userLoginEndPoint: userLoginEndPoint,
  resendActivationEndPoint: resendActivationEndPoint,
  activateUserAccountEndPoint: activateUserAccountEndPoint,
  userLogoutEndPoint: AuthDecorator.checkAuthToken(_userLogoutEndPoint)
};
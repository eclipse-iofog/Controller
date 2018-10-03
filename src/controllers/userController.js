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

const UserService = require('../services/userService');

const userSignupEndPoint = async function (req) {
  logger.info("Endpoint hit: " + req.originalUrl);

  logger.info("Parameters:" + JSON.stringify(req.body));

  const user = req.body;

  return await UserService.signUp(user);
};

module.exports = {
  userSignupEndPoint: userSignupEndPoint
};
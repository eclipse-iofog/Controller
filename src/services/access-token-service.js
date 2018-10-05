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

const AccessTokenManager = require('../sequelize/managers/access-token-manager');

const AppHelper = require('../helpers/app-helper');
const Constants = require('../helpers/constants');

const createAccessToken = async function (accessToken) {
  return await AccessTokenManager.createAccessToken(accessToken);
};

module.exports = {
  createAccessToken: createAccessToken
};
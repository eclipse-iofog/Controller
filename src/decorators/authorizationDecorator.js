/*
 *  *******************************************************************************
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
const config = require('../config');
const UserManager = require('../sequelize/managers/userManager');
const AccessTokenManager = require('../sequelize/managers/accessTokenManager');
const Errors = require('../utils/errors');

function checkAuthToken(f) {
  return async function() {

    const fArgs = Array.prototype.slice.call(arguments);
    const req = fArgs[0];
    const token = req.headers.authorization;

    logger.info('checking user token: ' + token);

    const user = await UserManager.findByAccessToken(token);

    if (!user) {
      logger.error('token ' + token + ' incorrect');
      throw new Errors.AuthenticationError('authorization failed');
    }
    if (Date.now() > user.accessToken.expirationTime) {
      logger.error('token ' + token + ' expired');
      throw new Errors.AuthenticationError('token expired');
    }

    fArgs.push(user);
    AccessTokenManager.updateExpirationTime(user.accessToken.id, user.accessToken.expirationTime + config.get('Settings:UserTokenExpirationInterval') * 60 * 1000);
    return await f.apply(this, fArgs);
  }
}

module.exports = {
  checkAuthToken: checkAuthToken
}
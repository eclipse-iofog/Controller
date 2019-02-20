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
const logger = require('../logger')
const config = require('../config')
const UserManager = require('../sequelize/managers/user-manager')
const AccessTokenManager = require('../sequelize/managers/access-token-manager')
const FogManager = require('../sequelize/managers/iofog-manager')
const FogAccessTokenManager = require('../sequelize/managers/iofog-access-token-manager')
const Errors = require('../helpers/errors')
const {isTest} = require('../helpers/app-helper')

function checkAuthToken(f) {
  return async function() {
    if (isTest()) {
      return await f.apply(this, arguments)
    }

    const fArgs = Array.prototype.slice.call(arguments)
    const req = fArgs[0]
    const token = req.headers.authorization

    const user = await UserManager.checkAuthentication(token)

    if (!user) {
      logger.error('token ' + token + ' incorrect')
      throw new Errors.AuthenticationError('authorization failed')
    }
    if (Date.now() > user.accessToken.expirationTime) {
      logger.error('token ' + token + ' expired')
      throw new Errors.AuthenticationError('token expired')
    }

    fArgs.push(user)
    AccessTokenManager.updateExpirationTime(user.accessToken.id, user.accessToken.expirationTime
        + config.get('Settings:UserTokenExpirationIntervalSeconds') * 1000)
    return await f.apply(this, fArgs)
  }
}

function checkFogToken(f) {
  return async function() {
    if (isTest()) {
      return await f.apply(this, arguments)
    }

    const fArgs = Array.prototype.slice.call(arguments)
    const req = fArgs[0]
    const token = req.headers.authorization

    const fog = await FogManager.checkToken(token)

    if (!fog) {
      logger.error('token ' + token + ' incorrect')
      throw new Errors.AuthenticationError('authorization failed')
    }
    if (Date.now() > fog.accessToken.expirationTime) {
      logger.error('token ' + token + ' expired')
      throw new Errors.AuthenticationError('token expired')
    }

    fArgs.push(fog)

    FogAccessTokenManager.updateExpirationTime(fog.accessToken.id, fog.accessToken.expirationTime
        + config.get('Settings:FogTokenExpirationIntervalSeconds') * 1000)

    const timestamp = Date.now()
    await FogManager.updateLastActive(fog.uuid, timestamp)

    return await f.apply(this, fArgs)
  }
}

module.exports = {
  checkAuthToken: checkAuthToken,
  checkFogToken: checkFogToken,
}

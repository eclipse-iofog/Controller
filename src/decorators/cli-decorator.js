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
const UserManager = require('../sequelize/managers/user-manager');
const AccessTokenManager = require('../sequelize/managers/access-token-manager');
const Errors = require('../helpers/errors');
const { isTest } = require('../helpers/app-helper');

function prepareUserById(f) {
  return async function() {
    if (isTest()) {
      return await f.apply(this, arguments);
    }

    const fArgs = Array.prototype.slice.call(arguments)
    const obj = fArgs[0]
    const userId = obj.userId

    logger.info('getting user by id: ' + userId)

    const user = await UserManager.findById(userId)

    if (!user) {
      logger.error('userId ' + userId + ' incorrect')
      throw new Errors.AuthenticationError('user id does not exist')
    }

    delete  obj.userId
    fArgs.push(user)

    return await f.apply(this, fArgs)
  }
}

function prepareUserByEmail(f) {
  return async function() {
    if (isTest()) {
      return await f.apply(this, arguments);
    }

    const fArgs = Array.prototype.slice.call(arguments)
    const obj = fArgs[0]
    const email = obj.email

    logger.info('getting user by email: ' + email)

    const user = await UserManager.findByEmail(email)

    if (!user) {
      logger.error('user email ' + email + ' incorrect')
      throw new Errors.AuthenticationError('user email does not exist')
    }

    delete  obj.email
    fArgs.push(user)

    return await f.apply(this, fArgs)
  }
}

module.exports = {
  prepareUserById: prepareUserById,
  prepareUserByEmail: prepareUserByEmail

}
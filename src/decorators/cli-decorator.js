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

function prepareUserById(f) {
  return async function() {

    const fArgs = Array.prototype.slice.call(arguments)
    const obj = fArgs[0]
    const userId = obj.userId

    logger.info('getting user by id: ' + userId)

    const user = await UserManager.findById(userId)

    if (!user) {
      logger.error('userId ' + userId + ' incorrect')
      throw new Errors.AuthenticationError('user id not exists')
    }

    delete  obj.userId
    fArgs.push(user)

    return await f.apply(this, fArgs)
  }
}

module.exports = {
  prepareUser: prepareUserById,

}
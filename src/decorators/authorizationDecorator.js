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
const logger = require('../logger/index');
const UserManager = require('../sequelize/managers/userManager');

function checkUserExistance(f) {
  return async function() {

    logger.info('checking user token: ' + token);

    let fArgs = Array.prototype.slice.call(arguments);
    let req = fArgs[0];
    let token = req.headers.authorization;

    let user = await UserManager.findByToken(token);

    if (user) {
      return await f.apply(this, arguments);
    } else {
      logger.error('token ' + token + ' incorrect');
      throw 'authorization failed'
    }
  }
}

module.exports = {
  checkUserExistance: checkUserExistance
};
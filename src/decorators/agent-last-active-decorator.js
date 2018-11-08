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
const FogManager = require('../sequelize/managers/iofog-manager');

function updateLastActive(f) {
  return async function() {

    const fArgs = Array.prototype.slice.call(arguments);

    const fog = fArgs[fArgs.length - 1];

    const timestamp = Date.now();

    logger.info('updating agent lastActive timestamp: ' + timestamp);

    await FogManager.updateLastActive(fog.uuid, timestamp);

    return await f.apply(this, fArgs);
  }
}

module.exports = {
  updateLastActive: updateLastActive
};
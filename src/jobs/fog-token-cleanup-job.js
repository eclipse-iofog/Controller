/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const FogUsedTokenManager = require('../data/managers/fog-used-token-manager')
const Config = require('../config')
const logger = require('../logger')

const scheduleTime = Config.get('settings.fogExpiredTokenCleanupInterval') * 1000

async function run () {
  try {
    await cleanupExpiredTokens()
  } catch (error) {
    logger.error('Error during JTI cleanup:', error)
  } finally {
    setTimeout(run, scheduleTime)
  }
}

async function cleanupExpiredTokens () {
  try {
    logger.debug('Starting cleanup of expired JTIs')
    const count = await FogUsedTokenManager.cleanupExpiredJtis()
    logger.debug(`Cleaned up ${count} expired JTIs`)
  } catch (error) {
    logger.error('Error during JTI cleanup:', error)
  }
}

module.exports = {
  run
}

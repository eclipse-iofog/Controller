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

// Load configuration first
require('./config')

// Initialize logger with configuration
const logger = require('./logger')
const { startTelemetry } = require('./config/telemetry')
const db = require('./data/models')
const vaultManager = require('./vault/vault-manager')

async function initialize () {
  try {
    // Log initial steps using console since logger might not be ready
    console.log('Configuration loaded')
    console.log('Logger initialized with configuration')

    // Now we can use logger for the rest of initialization
    logger.info('Initializing OpenTelemetry...')
    startTelemetry()

    logger.info('Initializing vault integration...')
    try {
      await vaultManager.initialize()
    } catch (error) {
      logger.warn(`Vault initialization failed: ${error.message}. Continuing with internal encryption.`)
    }

    logger.info('Initializing database...')
    await db.initDB(true)

    logger.info('Initialization completed successfully')
    return true
  } catch (error) {
    // Use console.error here since logger might not be initialized
    console.error('Initialization failed:', error)
    process.exit(1)
  }
}

module.exports = {
  initialize
}

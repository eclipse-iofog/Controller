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

const os = require('os')
const fs = require('fs')
const ROOT_DIR = `${__dirname}/..`
const TEMP_DIR = getTempDir()

const DEV_DB = `${ROOT_DIR}/src/data/sqlite_files/dev_database.sqlite`
const DEV_DB_BACKUP = `${TEMP_DIR}/dev_database.sqlite`

const PROD_DB = `${ROOT_DIR}/src/data/sqlite_files/prod_database.sqlite`
const PROD_DB_BACKUP = `${TEMP_DIR}/prod_database.sqlite`

let dbName = process.env.DB_NAME || 'pot-controller'
if (!dbName.endsWith('.sqlite')) {
  dbName += '.sqlite'
}
const CUSTOM_DB = `${ROOT_DIR}/src/data/${dbName}`
const CUSTOM_DB_BACKUP = `${TEMP_DIR}/src/data/${dbName}`

const DEFAULT_CONFIG = `${ROOT_DIR}/src/config/default.json`
const DEVELOP_CONFIG = `${ROOT_DIR}/src/config/development.json`
const PRODUCTION_CONFIG = `${ROOT_DIR}/src/config/production.json`

const DEFAULT_CONFIG_BACKUP = `${TEMP_DIR}/default_iofog_backup.json`
const DEVELOP_CONFIG_BACKUP = `${TEMP_DIR}/development_iofog_backup.json`
const PRODUCTION_CONFIG_BACKUP = `${TEMP_DIR}/production_iofog_backup.json`

const INSTALLATION_VARIABLES_FILE = TEMP_DIR + '/iofogcontroller_install_variables'

function backupDBs () {
  renameFile(DEV_DB, DEV_DB_BACKUP)
  renameFile(PROD_DB, PROD_DB_BACKUP)
  renameFile(CUSTOM_DB, CUSTOM_DB_BACKUP)
}

function restoreDBs () {
  renameFile(DEV_DB_BACKUP, DEV_DB)
  renameFile(PROD_DB_BACKUP, PROD_DB)
  renameFile(CUSTOM_DB_BACKUP, CUSTOM_DB)
}

function renameFile (oldPath, newPath) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath)
  }
}

function getTempDir () {
  let tempDir

  if (os.type() === 'Linux') {
    tempDir = '/tmp'
  } else if (os.type() === 'Darwin') {
    tempDir = '/tmp'
  } else if (os.type() === 'Windows_NT') {
    tempDir = `${process.env.APPDATA}`
  } else {
    throw new Error('Unsupported OS found: ' + os.type())
  }

  return tempDir
}

function backupConfigs () {
  renameFile(DEFAULT_CONFIG, DEFAULT_CONFIG_BACKUP)
  renameFile(DEVELOP_CONFIG, DEVELOP_CONFIG_BACKUP)
  renameFile(PRODUCTION_CONFIG, PRODUCTION_CONFIG_BACKUP)
}

function restoreConfigs () {
  renameFile(DEFAULT_CONFIG_BACKUP, DEFAULT_CONFIG)
  renameFile(DEVELOP_CONFIG_BACKUP, DEVELOP_CONFIG)
  renameFile(PRODUCTION_CONFIG_BACKUP, PRODUCTION_CONFIG)
}

function setDbEnvVars (env) {
  const DB_ENV_VARS = [
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_PROVIDER',
    'DB_HOST',
    'DB_PORT'
  ]

  for (const envVar of DB_ENV_VARS) {
    if (process.env[envVar]) {
      env[envVar] = process.env[envVar]
    }
  }
  return env
}

module.exports = {
  backupDBs: backupDBs,
  restoreDBs: restoreDBs,
  backupConfigs: backupConfigs,
  restoreConfigs: restoreConfigs,
  renameFile: renameFile,
  getTempDir: getTempDir,
  setDbEnvVars: setDbEnvVars,

  TEMP_DIR: TEMP_DIR,
  INSTALLATION_VARIABLES_FILE: INSTALLATION_VARIABLES_FILE
}

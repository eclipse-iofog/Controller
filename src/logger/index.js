/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const fs = require('fs')
const path = require('path')
const pino = require('pino')
const config = require('../config')

const dirName = config.get('Service:LogsDirectory')

// Create the log directory if it does not exist
try {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName)
  }
} catch (e) {
  // can't initialize log folder
}

const levels = {
  error: 100,
  warn: 90,
  cliReq: 80,
  cliRes: 70,
  apiReq: 60,
  apiRes: 50,
  info: 40,
  verbose: 30,
  debug: 20,
  silly: 10
}

const defaultFormat = {
  level: 'info',
  customLevels: levels,
  useOnlyCustomLevels: true,
  formatters: {
    level: (level) => ({ level }),
    log: (log) => {
      if (!log.req) {
        return log
      }

      return {
        requestId: log.req.headers ? `[${log.req.headers['request-id']}] ` : '',
        method: log.req.method,
        args: {
          params: log.req.params,
          query: log.req.query,
          body: log.req.body
        }
      }
    }
  }
}

const consoleLogger = pino(defaultFormat)

const logDestination = pino.destination(path.resolve(dirName, 'iofog-controller.log'))
const fileLogger = pino(
  {
    ...defaultFormat,
    level: 'warn'
  },
  logDestination)
process.on('SIGHUP', () => logDestination.reopen())

module.exports = {}

for (const level of Object.keys(levels)) {
  module.exports[level] = (...log) => {
    consoleLogger[level](...log)
    fileLogger[level](...log)
  }
}

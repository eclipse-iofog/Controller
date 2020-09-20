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
const serializer = require('pino-std-serializers')
const config = require('../config')

const dirName = config.get('Service:LogsDirectory')

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
  redact: ['headers.authorization'],
  formatters: {
    level: (level) => ({ level }),
    log: (log) => {
      if (!log.req && !log.res) {
        return log
      }

      let result = {}

      if (log.req) {
        result = Object.assign(
          result,
          serializer.req(log.req),
          {
            params: log.req.params,
            query: log.req.query,
            body: log.req.body
          }
        )
      }

      if (log.res) {
        result = Object.assign(result, serializer.res(log.res))
      }

      return result
    }
  }
}

const consoleLogger = pino(defaultFormat)

let fileLogger = null
try {
  // Create the log directory if it does not exist
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName)
  }

  const logDestination = pino.destination(path.resolve(dirName, 'iofog-controller.log'))
  fileLogger = pino(
    {
      ...defaultFormat,
      level: 'warn'
    },
    logDestination)
  process.on('SIGHUP', () => logDestination.reopen())
} catch (e) {
  consoleLogger.error({ msg: 'Unable to initialize file logger', ...serializer.err(e) })
}

module.exports = {}

for (const level of Object.keys(levels)) {
  module.exports[level] = (log) => {
    if (log instanceof Error) {
      log = serializer.err(log)
    }
    consoleLogger[level](log)
    if (fileLogger !== null) {
      fileLogger[level](...log)
    }
  }
}

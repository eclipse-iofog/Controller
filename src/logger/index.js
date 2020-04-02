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

const winston = require('winston')
const config = require('../config')
const fs = require('fs')
const MESSAGE = Symbol.for('message')

const dirName = config.get('Service:LogsDirectory')
const maxSize = config.get('Service:LogsFileSize')
const maxFiles = config.get('Service:LogsFileCount')

// Create the log directory if it does not exist
try {
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName)
  }
} catch (e) {
  // can't initialize log folder
}

const levels = {
  error: 0,
  warn: 1,
  cliReq: 2,
  cliRes: 3,
  apiReq: 4,
  apiRes: 5,
  info: 6,
  verbose: 7,
  debug: 8,
  silly: 9
}

const formattedJson = winston.format((log) => {
  log[MESSAGE] = JSON.stringify(log)
  return log
})

const prepareObjectLogs = winston.format((log) => {
  if (!(log.message instanceof Object)) {
    return log
  }

  if (log.level === 'apiReq' && log.message instanceof Object) {
    const req = log.message
    const requestId = req.headers ? `[${req.headers['request-id']}] ` : ''
    log.message = `${requestId}${req.method} ${req.originalUrl}`
    log.args = { params: req.params, query: req.query, body: req.body }
  }
  if (log.level === 'apiRes' && log.message instanceof Object) {
    const req = log.message.req
    const res = log.message.res
    const requestId = req.headers ? `[${req.headers['request-id']}] ` : ''
    log.message = `${requestId}${req.method} ${req.originalUrl}`
    log.args = res
  }
  return log
})

const logger = winston.createLogger({
  levels: levels,
  level: 'warn',
  transports: [
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        prepareObjectLogs(),
        formattedJson()
      ),
      filename: 'iofog-controller.log',
      dirname: dirName,
      maxsize: maxSize,
      maxFiles: maxFiles
    })
  ]
})

// TODO: Fix test to pass without needing to set NODE_ENV to production
// Tests are using console output to assess CLI command output
if (process.env.NODE_ENV !== 'production2') {
  logger.add(new winston.transports.Console({
    level: 'info',
    format: winston.format((log) => {
      if (log.level === 'cliReq') {
        return
      }
      if (log.level === 'apiReq' && log.message instanceof Object) {
        const req = log.message
        const requestId = req.headers ? `[${req.headers['request-id']}] ` : ''
        log.message = `${requestId}${req.method} ${req.originalUrl}`
        log.args = { params: req.params, query: req.query, body: req.body }
      }
      if (log.level === 'apiRes' && log.message instanceof Object) {
        const req = log.message.req
        const res = log.message.res
        const requestId = req.headers ? `[${req.headers['request-id']}] ` : ''
        log.message = `${requestId}${req.method} ${req.originalUrl}`
        log.args = res
      }
      let message = log.level === 'cliRes' ? `${log.message}` : `[${log.level}] ${log.message}`

      if (log.args) {
        message += ` | args: ${JSON.stringify(log.args)}`
      }
      log[MESSAGE] = message
      return log
    })()
  }))
}

module.exports = logger

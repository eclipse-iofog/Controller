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

const MESSAGE = Symbol.for('message')

const logger = winston.createLogger({
  level: 'silly',
  transports: [
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.logstash()
      ),
      filename: 'fog-controller.log',
      dirname: config.get('Service:LogsDirectory'),
      maxsize:  config.get('Service:LogsFileSize'),
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format((log) => {
      log[MESSAGE] = log.message
      return log
    })(),
  }))
}

module.exports = logger

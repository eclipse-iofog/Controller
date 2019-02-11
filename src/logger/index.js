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

const winston = require('winston');
const config = require('../config');

const MESSAGE = Symbol.for('message');

const formattedJson = winston.format((log) => {
  let sortedFields = ['level', 'timestamp', 'message'];
  if (log.args) {
    sortedFields = sortedFields.concat(['args']).concat(Object.keys(log.args));
  }
  log[MESSAGE] = JSON.stringify(log, sortedFields);
  return log;
});

const logger = winston.createLogger({
  level: 'silly',
  transports: [
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        formattedJson()
      ),
      filename: 'iofog-controller.log',
      dirname: config.get('Service:LogsDirectory'),
      maxsize:  config.get('Service:LogsFileSize'),
    }),
  ],
});

logger.add(new winston.transports.Console({
  level: 'info',
  format: winston.format((log) => {
    let message = `[${log.level}] ${log.message}`;
    if (log.args) {
      message += ` / args: ${JSON.stringify(log.args)}`
    }
    log[MESSAGE] = message;
    return log;
  })(),
}));


module.exports = logger;

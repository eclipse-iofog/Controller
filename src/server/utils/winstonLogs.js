/*
 * *******************************************************************************
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

const appConfig = require('./../../config.json');
const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');
const fs = require('fs');
const logDir = path.join(__dirname, '../../../../') + '/fog-controller-logs';

const tsFormat = () => (new Date()).toLocaleTimeString();
winston.emitErrs = true;

  if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
  }

let logger = new winston.Logger({
  transports: [
    new (winston.transports.DailyRotateFile)({
        name: 'info-file',
        filename: `${logDir}/FogController.log`,
        level: appConfig.loggingLevel,
        json: false,
        //maxsize: 20971520, //20 MB,
        maxFiles: 90,
        datePattern: 'yyyy-MM-dd_',
        timestamp: tsFormat,
        localTime: true,
        prepend: true
    })
  ],
    exitOnError: false
});

module.exports = logger;

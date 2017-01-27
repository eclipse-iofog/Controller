import appConfig from './../../config.json';
const winston = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const logDir = 'log';
const tsFormat = () => (new Date()).toLocaleTimeString();
winston.emitErrs = true;

  if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
  }

var logger = new winston.Logger({
  transports: [
    new (winston.transports.DailyRotateFile)({
      name: 'info-file',
      filename: `${logDir}/FogController.log`,
      level: appConfig.loggingLevel,
      maxsize: 20971520, //20 MB
      datePattern: 'yyyy-MM-dd_',
      timestamp: tsFormat,
      prepend: true
    })
  ],
    exitOnError: false
});

module.exports = logger;
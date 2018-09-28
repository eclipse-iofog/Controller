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
const Sequelize = require('sequelize')
const config = require('../../config')
const DatabaseProvider = require('./database-provider')
const logger = require('../../logger')
const mysql = require('mysql2/promise')

class MySqlDatabaseProvider extends DatabaseProvider {
  constructor () {
    super()

    // Get MySQL configuration from config or environment variables
    const mysqlConfig = config.get('database.mysql', {})

    // Base MySQL connection options
    const connectionOptions = {
      host: process.env.DB_HOST || mysqlConfig.host,
      port: process.env.DB_PORT || mysqlConfig.port,
      user: process.env.DB_USERNAME || mysqlConfig.username,
      password: process.env.DB_PASSWORD || mysqlConfig.password,
      database: process.env.DB_NAME || mysqlConfig.databaseName,
      connectTimeout: 10000
    }

    // Configure SSL if enabled
    const useSSL = config.getBoolean('database.mysql.useSSL', false)
    if (useSSL) {
      const caBase64 = config.get('database.mysql.sslCA', '')
      const sslOptions = caBase64
        ? {
            ca: Buffer.from(caBase64, 'base64').toString('utf-8'),
            rejectUnauthorized: true
          }
        : { rejectUnauthorized: false }

      connectionOptions.ssl = sslOptions
    }

    // Sequelize configuration
    const poolConfig = mysqlConfig.pool || {}
    const sequelizeConfig = {
      dialect: 'mysql',
      host: connectionOptions.host,
      port: connectionOptions.port,
      username: connectionOptions.user,
      password: connectionOptions.password,
      database: connectionOptions.database,
      dialectOptions: {
        connectTimeout: connectionOptions.connectTimeout
      },
      pool: {
        max: poolConfig.max != null ? poolConfig.max : 10,
        min: poolConfig.min != null ? poolConfig.min : 0,
        idle: poolConfig.idle != null ? poolConfig.idle : 20000
      },
      timezone: '+00:00',
      logging: false
    }

    // Add SSL configuration to Sequelize if enabled
    if (useSSL) {
      const caBase64 = config.get('database.mysql.sslCA', '')
      sequelizeConfig.dialectOptions.ssl = caBase64
        ? {
            ca: Buffer.from(caBase64, 'base64').toString('utf-8'),
            rejectUnauthorized: true
          }
        : { rejectUnauthorized: false }
    }

    this.sequelize = new Sequelize(sequelizeConfig)
    this.connectionOptions = connectionOptions
  }

  async initDB () {
    try {
      // First try to connect to the database directly
      const connection = await mysql.createConnection(this.connectionOptions)
      await connection.end()
    } catch (err) {
      // Check both the error and its parent (for Sequelize errors)
      const errorToCheck = err.parent || err

      if (errorToCheck.code === 'ER_BAD_DB_ERROR') {
        // Database doesn't exist, try to create it
        logger.info('Database does not exist, attempting to create it...')
        const { database, ...connectionConfig } = this.connectionOptions
        const tempConnection = await mysql.createConnection(connectionConfig)
        try {
          await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``)
          logger.info(`Database ${database} created successfully`)
        } finally {
          await tempConnection.end()
        }
      } else if (errorToCheck.code === 'ER_DUP_KEYNAME' ||
                errorToCheck.errno === 1061 ||
                (errorToCheck.message && (
                  errorToCheck.message.includes('Error 1050') || // Table already exists
                  errorToCheck.message.includes('Error 1060') || // Duplicate column name
                  errorToCheck.message.includes('Error 1054') || // Unknown column
                  errorToCheck.message.includes('Error 1061') // Duplicate key name
                ))) {
        logger.info(`Ignoring known MySQL error: ${errorToCheck.message}`)
      } else {
        throw err
      }
    }
  }
}

module.exports = MySqlDatabaseProvider

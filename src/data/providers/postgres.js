const Sequelize = require('sequelize')
const config = require('../../config')
const DatabaseProvider = require('./database-provider')
const logger = require('../../logger')
const { Pool } = require('pg')

class PostgresDatabaseProvider extends DatabaseProvider {
  constructor () {
    super()

    // Get PostgreSQL configuration from config or environment variables
    const postgresConfig = config.get('database.postgres', {})

    // Base PostgreSQL connection options
    const connectionOptions = {
      host: process.env.DB_HOST || postgresConfig.host,
      port: process.env.DB_PORT || postgresConfig.port,
      user: process.env.DB_USERNAME || postgresConfig.username,
      password: process.env.DB_PASSWORD || postgresConfig.password,
      database: process.env.DB_NAME || postgresConfig.databaseName,
      connectTimeout: 10000
    }

    // Configure SSL if enabled
    const useSSL = process.env.DB_USE_SSL === 'true' || postgresConfig.useSsl === true
    if (useSSL) {
      const caBase64 = process.env.DB_SSL_CA_B64
      const sslOptions = caBase64
        ? {
          ca: Buffer.from(caBase64, 'base64').toString('utf-8'),
          rejectUnauthorized: true
        }
        : { rejectUnauthorized: false }

      connectionOptions.ssl = sslOptions
    }

    // Sequelize configuration
    const sequelizeConfig = {
      dialect: 'postgres',
      host: connectionOptions.host,
      port: connectionOptions.port,
      username: connectionOptions.user,
      password: connectionOptions.password,
      database: connectionOptions.database,
      dialectOptions: {
        connectTimeout: connectionOptions.connectTimeout
      },
      logging: false
    }
    // Add SSL configuration to Sequelize if enabled
    if (useSSL) {
      const caBase64 = process.env.DB_SSL_CA_B64
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
      const pool = new Pool(this.connectionOptions)
      await pool.query('SELECT 1')
      await pool.end()
    } catch (err) {
      if (err.code === '3D000') { // PostgreSQL error code for database doesn't exist
        // Database doesn't exist, try to create it
        logger.info('Database does not exist, attempting to create it...')
        const { database, ...connectionConfig } = this.connectionOptions
        // Connect to the default 'postgres' database to create the target database
        const pool = new Pool({
          ...connectionConfig,
          database: 'postgres'
        })
        try {
          await pool.query(`CREATE DATABASE "${database}"`)
          logger.info(`Database ${database} created successfully`)
        } finally {
          await pool.end()
        }
      } else {
        throw err
      }
    }
  }
}

module.exports = PostgresDatabaseProvider

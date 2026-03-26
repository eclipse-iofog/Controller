const path = require('path')
const fs = require('fs')
const Sequelize = require('sequelize')

const config = require('../../config')
const DatabaseProvider = require('./database-provider')

class SqliteDatabaseProvider extends DatabaseProvider {
  constructor () {
    super()

    const sqliteConfig = config.get('database.sqlite', {})
    sqliteConfig.dialect = 'sqlite'
    const envDbName = typeof process.env.DB_NAME === 'string' ? process.env.DB_NAME.trim() : ''
    sqliteConfig.databaseName = envDbName || sqliteConfig.databaseName || 'controller_db.sqlite'
    if (!sqliteConfig.databaseName.endsWith('.sqlite')) {
      sqliteConfig.databaseName += '.sqlite'
    }
    const storageFolder = path.resolve(__dirname, '../sqlite_files')
    sqliteConfig.storage = path.resolve(storageFolder, sqliteConfig.databaseName)
    if (!fs.existsSync(storageFolder)) {
      fs.mkdirSync(storageFolder)
    }
    if (config.use_env_variable) {
      this.sequelize = new Sequelize(process.env[config.use_env_variable], sqliteConfig)
    } else {
      this.sequelize = new Sequelize(sqliteConfig)
    }
  }

  async initDB () {
  }
}

module.exports = SqliteDatabaseProvider

const path = require('path')
const Sequelize = require('sequelize')

const config = require('../../config')
const DatabaseProvider = require(`./database-provider`)

class SqliteDatabaseProvider extends DatabaseProvider {
  constructor () {
    super()

    const sqliteConfig = config.get('Database:Config', {})
    sqliteConfig.dialect = 'sqlite'
    sqliteConfig.databaseName = process.env.DB_NAME || sqliteConfig.databaseName
    if (!sqliteConfig.databaseName.endsWith('.sqlite')) {
      sqliteConfig.databaseName += '.sqlite'
    }
    sqliteConfig.storage = path.resolve(__dirname, '../' + sqliteConfig.databaseName)
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

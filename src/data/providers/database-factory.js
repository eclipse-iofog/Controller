const config = require('../../config')

function createDatabaseProvider () {
  let provider = config.get('Database:Provider') || process.env.DB_PROVIDER
  if (!provider) {
    provider = 'sqlite'
  }

  const DatabaseProvider = require(`./${provider}`)
  return new DatabaseProvider()
}

module.exports = createDatabaseProvider()

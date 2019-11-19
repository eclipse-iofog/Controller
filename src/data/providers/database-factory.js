const config = require('../../config')

function createDatabaseProvider () {
  let provider = process.env.DB_PROVIDER || config.get('Database:Provider', 'sqlite')

  if (!provider) {
    provider = 'sqlite'
  }

  const DatabaseProvider = require(`./${provider}`)
  return new DatabaseProvider()
}

module.exports = createDatabaseProvider()

const path = require('path')
const Sequelize = require('sequelize')
const Umzug = require('umzug')

class DatabaseProvider {
  constructor () {
    this.basename = path.basename(__filename)
  }

  async initDB () {
    throw new Error('Not Implemented')
  }

  createUmzug (path) {
    if (!this.sequelize) {
      throw new Error('Sequelize is not initialized')
    }

    return new Umzug({
      storage: 'sequelize',
      storageOptions: {
        sequelize: this.sequelize
      },
      migrations: {
        params: [
          this.sequelize.getQueryInterface(),
          Sequelize
        ],
        path,
        pattern: /\.js$/
      }
    })
  }
}

module.exports = DatabaseProvider

'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const Umzug = require('umzug')

const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'production'
const config = require(__dirname + '/../config/config.json')[env]
const db = {}

let sequelize

config.storage = path.resolve(__dirname, '../' + config.storage)

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config)
}

const createUmzug = (path) => {
  return new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize,
    },
    logging: false,
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        Sequelize,
      ],
      path,
      pattern: /\.js$/,
    },
  })
}

fs
    .readdirSync(__dirname)
    .filter((file) => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    .forEach((file) => {
      const model = sequelize.import(path.join(__dirname, file))
      db[model.name] = model
    })

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

db.initDB = async () => {
  await createUmzug(path.resolve(__dirname, '../migrations')).up()
  await createUmzug(path.resolve(__dirname, '../seeders')).up()
}

module.exports = db

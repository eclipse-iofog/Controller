'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const Umzug = require('umzug')
const { Client } = require('pg')
const serviceConfig = require('../../config')

const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'production'
const db = {}

let sequelize

let provider = serviceConfig.get('Database:Provider') || process.env.DB_PROVIDER
if (provider !== 'postgres') {
  provider = 'sqlite'
}

const config = require(`${__dirname}/../providers/${provider}/config`)[env]

config.storage = path.resolve(__dirname, '../' + config.storage)
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
  sequelize = new Sequelize(config)
}

const createUmzug = (path) => {
  return new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize
    },
    logging: false,
    migrations: {
      params: [
        sequelize.getQueryInterface(),
        Sequelize
      ],
      path,
      pattern: /\.js$/
    }
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
  if (provider === 'postgres') {
    const database = config.database
    const client = new Client({
      database: 'postgres',
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password
    })

    await client.connect()

    const res = await client.query(`SELECT 1 FROM pg_catalog.pg_database WHERE datname = '${database}';`)
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE ${database};`)
    }

    await client.end()
  }

  await createUmzug(path.resolve(__dirname, '../migrations')).up()
  await createUmzug(path.resolve(__dirname, '../seeders')).up()
}

module.exports = db

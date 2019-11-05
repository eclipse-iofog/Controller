'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const basename = path.basename(__filename)
const db = {}

const databaseProvider = require('../providers/database-factory')
const sequelize = databaseProvider.sequelize

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
  await databaseProvider.initDB()
  const migrationUmzug = databaseProvider.createUmzug(path.resolve(__dirname, '../migrations'))
  await migrationUmzug.up()
  await databaseProvider.createUmzug(path.resolve(__dirname, '../seeders')).up()
}

module.exports = db

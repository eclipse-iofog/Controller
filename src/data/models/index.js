'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const lget = require('lodash/get')
const constants = require('../constants')
const CatalogItemManager = require('../managers/catalog-item-manager')
const CatalogItemImageManager = require('../managers/catalog-item-image-manager')
const FogTypeManager = require('../managers/iofog-type-manager')
const basename = path.basename(__filename)
const db = {}
const config = require('../../config')

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

const configureImage = async (manager, name, fogTypes, images, transaction) => {
  const catalogItem = await manager.findOne({ where: { name, isPublic: false } }, transaction)
  for (const fogType of fogTypes) {
    if (fogType.id === 0) {
      // Skip auto detect type
      continue
    }
    const image = lget(images, fogType.id, '')
    await CatalogItemImageManager.update({ fogTypeId: fogType.id, catalogItemId: catalogItem.id }, { containerImage: image })
  }
}

db.initDB = async () => {
  await databaseProvider.initDB()
  const migrationUmzug = databaseProvider.createUmzug(path.resolve(__dirname, '../migrations'))
  await migrationUmzug.up()
  await databaseProvider.createUmzug(path.resolve(__dirname, '../seeders')).up()

  // Configure system images
  const transaction = { fakeTransaction: true }
  const fogTypes = await db.FogType.findAll({}, transaction)
  await configureImage(db.CatalogItem, constants.ROUTER_CATALOG_NAME, fogTypes, config.get('SystemImages:Router', {}), transaction)
  await configureImage(db.CatalogItem, constants.PROXY_CATALOG_NAME, fogTypes, config.get('SystemImages:Proxy', {}), transaction)
}

module.exports = db

'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const lget = require('lodash/get')
const constants = require('../constants')
const basename = path.basename(__filename)
const db = {}
const config = require('../../config')
const logger = require('../../logger')

const databaseProvider = require('../providers/database-factory')

// Initialize models after database is ready
const initializeModels = (sequelize) => {
  fs
    .readdirSync(__dirname)
    .filter((file) => {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    })
    .forEach((file) => {
      const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
      db[model.name] = model
    })

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db)
    }
  })

  db.sequelize = sequelize
  db.Sequelize = Sequelize
}

const configureImage = async (db, name, fogTypes, images) => {
  const isNats = name === constants.NATS_CATALOG_NAME
  const catalogItem = await db.CatalogItem.findOne({
    where: isNats ? { name } : { name, isPublic: false }
  })
  if (!catalogItem) {
    logger.warn(`Catalog item not found for ${name}, skipping image configuration`)
    return
  }
  for (const fogType of fogTypes) {
    if (fogType.id === 0) {
      // Skip auto detect type
      continue
    }
    const image = lget(images, fogType.id, '')
    await db.CatalogItemImage.update({ containerImage: image }, { where: { fogTypeId: fogType.id, catalogItemId: catalogItem.id } })
  }
}

db.initDB = async (isStart) => {
  await databaseProvider.initDB(isStart)

  // Initialize models after database is ready
  initializeModels(databaseProvider.sequelize)

  if (isStart) {
    if (databaseProvider instanceof require('../providers/sqlite')) {
      const sqliteDbPath = databaseProvider.sequelize.options.storage
      logger.info('Running SQLite database migrations and seeders...')
      await databaseProvider.runMigrationSQLite(sqliteDbPath)
      await databaseProvider.runSeederSQLite(sqliteDbPath)
    } else if (databaseProvider instanceof require('../providers/mysql')) {
      logger.info('Running MySQL database migrations and seeders...')
      await databaseProvider.runMigrationMySQL(databaseProvider.sequelize)
      await databaseProvider.runSeederMySQL(databaseProvider.sequelize)
    } else if (databaseProvider instanceof require('../providers/postgres')) {
      logger.info('Running PostgreSQL database migrations and seeders...')
      await databaseProvider.runMigrationPostgres(databaseProvider.sequelize)
      await databaseProvider.runSeederPostgres(databaseProvider.sequelize)
    }

    // Initialize RBAC cache version if it doesn't exist
    try {
      const RbacCacheVersionManager = require('../managers/rbac-cache-version-manager')
      const fakeTransaction = { fakeTransaction: true }
      await RbacCacheVersionManager.initializeVersion(fakeTransaction)
      logger.info('RBAC cache version initialized')
    } catch (error) {
      logger.warn(`Failed to initialize RBAC cache version: ${error.message}. Continuing...`)
    }

    // Configure system images
    const fogTypes = await db.FogType.findAll({})
    await configureImage(db, constants.ROUTER_CATALOG_NAME, fogTypes, config.get('systemImages.router', {}))
    await configureImage(db, constants.DEBUG_CATALOG_NAME, fogTypes, config.get('systemImages.debug', {}))
    await configureImage(db, constants.NATS_CATALOG_NAME, fogTypes, config.get('systemImages.nats', {}))

    // Initialize controller UUID
    try {
      const ClusterControllerService = require('../../services/cluster-controller-service')
      const fakeTransaction = { fakeTransaction: true }
      await ClusterControllerService.initializeControllerUuid(fakeTransaction)
      logger.info('Controller UUID initialized')
    } catch (error) {
      logger.warn(`Failed to initialize controller UUID: ${error.message}. Continuing...`)
    }
  }
}

module.exports = db

'use strict'

const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')
const Op = require('sequelize').Op
const sinon = require('sinon')

const databaseProvider = require('../../../src/data/providers/database-factory')
const defineReconcileOutbox = require('../../../src/data/models/reconcileOutbox')
const defineMicroservice = require('../../../src/data/models/microservice')
const defineCatalogItemImage = require('../../../src/data/models/catalogitemimage')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const { runInTransaction } = require('../../../src/helpers/transaction-runner')
const { drainOnce } = require('../../../src/jobs/reconcile-outbox-drainer-job')

function microserviceWhereForSqlite (where) {
  const sqlWhere = {
    catalog_item_id: where.catalogItemId,
    delete: where.delete
  }
  if (where.registryId != null) {
    sqlWhere.registry_id = where.registryId
  }
  if (where.iofogUuid != null) {
    sqlWhere.iofog_uuid = where.iofogUuid
  }
  if (where.uuid != null) {
    sqlWhere.uuid = where.uuid
  }
  return sqlWhere
}

describe('agent-propagation sqlite integration', () => {
  const sandbox = sinon.createSandbox()
  let originalDbProvider
  let sequelize
  let dbPath
  let ReconcileOutbox
  let Microservice
  let CatalogItemImage

  beforeEach(async () => {
    originalDbProvider = process.env.DB_PROVIDER
    delete process.env.DB_PROVIDER

    dbPath = path.join(os.tmpdir(), `controller-ap-sqlite-${Date.now()}-${Math.random()}.sqlite`)
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
      pool: { max: 1, min: 0, idle: 10000 }
    })
    await sequelize.authenticate()
    await sequelize.query('PRAGMA foreign_keys = OFF')

    ReconcileOutbox = defineReconcileOutbox(sequelize, Sequelize.DataTypes)
    Microservice = defineMicroservice(sequelize, Sequelize.DataTypes)
    CatalogItemImage = defineCatalogItemImage(sequelize, Sequelize.DataTypes)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Microservices (
        uuid VARCHAR(36) PRIMARY KEY NOT NULL,
        name VARCHAR(255),
        catalog_item_id INT,
        iofog_uuid VARCHAR(36),
        rebuild INTEGER DEFAULT 0,
        "delete" INTEGER DEFAULT 0,
        config TEXT DEFAULT '{}',
        created_at DATETIME,
        updated_at DATETIME
      )
    `)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS CatalogItemImages (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        container_image TEXT,
        catalog_item_id INT,
        microservice_uuid VARCHAR(36),
        arch_id INT
      )
    `)
    await ReconcileOutbox.sync()

    const models = require('../../../src/data/models')
    models.ReconcileOutbox = ReconcileOutbox
    models.Microservice = Microservice
    models.CatalogItemImage = CatalogItemImage
    models.sequelize = sequelize
    sandbox.stub(databaseProvider, 'sequelize').value(sequelize)

    sandbox.stub(MicroserviceManager, 'getEntity').returns(Microservice)
    sandbox.stub(MicroserviceManager, 'update').callsFake(async (where, data, transaction) => {
      return Microservice.update(data, {
        where: microserviceWhereForSqlite(where),
        transaction
      })
    })
    sandbox.stub(MicroserviceManager, 'findDistinctFogUuids').callsFake(async (where, transaction) => {
      const rows = await Microservice.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('iofog_uuid')), 'iofogUuid']],
        where: microserviceWhereForSqlite(where),
        order: [[sequelize.col('iofog_uuid'), 'ASC']],
        raw: true,
        transaction
      })
      return rows.map((row) => row.iofogUuid).filter(Boolean)
    })
    sandbox.stub(ChangeTrackingService, 'update').resolves()
  })

  afterEach(async () => {
    sandbox.restore()
    if (originalDbProvider === undefined) {
      delete process.env.DB_PROVIDER
    } else {
      process.env.DB_PROVIDER = originalDbProvider
    }
    if (sequelize) {
      await sequelize.close()
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix)
      } catch (_) { /* ignore */ }
    }
  })

  it('findCustomImageMicroserviceUuids reads override rows from sqlite', async () => {
    await CatalogItemImage.create({
      containerImage: 'custom:v1',
      catalogItemId: 6,
      microserviceUuid: 'ms-custom',
      archId: 1
    })

    await runInTransaction(async (transaction) => {
      const uuids = await CatalogItemImageManager.findCustomImageMicroserviceUuids(transaction)
      expect(uuids).to.deep.equal(['ms-custom'])
    })
  })

  it('drains catalog image propagation and rebuilds only non-custom-image microservices', async () => {
    await sequelize.query(`
      INSERT INTO Microservices (uuid, name, catalog_item_id, iofog_uuid, rebuild, "delete")
      VALUES
        ('ms-standard', 'standard', 6, 'fog-a', 0, 0),
        ('ms-custom', 'custom', 6, 'fog-b', 0, 0)
    `)

    await CatalogItemImage.create({
      containerImage: 'custom:v1',
      catalogItemId: 6,
      microserviceUuid: 'ms-custom',
      archId: 1
    })

    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueAgentPropagation({
        scope: 'catalog',
        reason: 'images_updated',
        catalogItemId: 6,
        actions: ['rebuild', 'notify_microservices']
      }, transaction)
    })

    const result = await drainOnce()
    expect(result.processed).to.equal(1)
    expect(result.failed).to.equal(0)

    const [rows] = await sequelize.query(
      'SELECT uuid, rebuild FROM Microservices ORDER BY uuid ASC'
    )
    const rebuildByUuid = Object.fromEntries(rows.map((row) => [row.uuid, row.rebuild]))
    expect(rebuildByUuid['ms-standard']).to.equal(1)
    expect(rebuildByUuid['ms-custom']).to.equal(0)

    expect(MicroserviceManager.update).to.have.been.calledWith(
      sinon.match({
        catalogItemId: 6,
        delete: false,
        uuid: { [Op.notIn]: ['ms-custom'] }
      }),
      { rebuild: true },
      sinon.match.object
    )

    expect(ChangeTrackingService.update).to.have.been.calledOnceWith(
      'fog-a',
      ChangeTrackingService.events.microserviceCommon,
      sinon.match.object
    )
    expect(ChangeTrackingService.update).to.not.have.been.calledWith(
      'fog-b',
      ChangeTrackingService.events.microserviceCommon,
      sinon.match.object
    )

    const row = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:catalog:6:images' } })
    expect(row.processedAt).to.not.be.null
    expect(row.lastError).to.be.null
  })
})

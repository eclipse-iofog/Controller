'use strict'

const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')
const sinon = require('sinon')

const databaseProvider = require('../../../src/data/providers/database-factory')
const defineReconcileOutbox = require('../../../src/data/models/reconcileOutbox')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const AgentPropagationService = require('../../../src/services/agent-propagation-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const config = require('../../../src/config')
const { runInTransaction } = require('../../../src/helpers/transaction-runner')
const { drainOnce } = require('../../../src/jobs/reconcile-outbox-drainer-job')

describe('reconcile-outbox', () => {
  const sandbox = sinon.createSandbox()
  let originalDbProvider
  let sequelize
  let dbPath
  let ReconcileOutbox

  beforeEach(async () => {
    originalDbProvider = process.env.DB_PROVIDER
    delete process.env.DB_PROVIDER

    dbPath = path.join(os.tmpdir(), `controller-outbox-${Date.now()}-${Math.random()}.sqlite`)
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
      pool: { max: 1, min: 0, idle: 10000 }
    })
    await sequelize.authenticate()

    ReconcileOutbox = defineReconcileOutbox(sequelize, Sequelize.DataTypes)
    await ReconcileOutbox.sync()

    const models = require('../../../src/data/models')
    models.ReconcileOutbox = ReconcileOutbox
    models.sequelize = sequelize
    sandbox.stub(databaseProvider, 'sequelize').value(sequelize)
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

  it('inserts outbox row in same commit as business write', async () => {
    await runInTransaction(async (transaction) => {
      await sequelize.query('CREATE TABLE IF NOT EXISTS business (id INTEGER PRIMARY KEY, label TEXT)', { transaction })
      await sequelize.query('INSERT INTO business (label) VALUES (\'created\')', { transaction })
      await ReconcileOutboxManager.enqueueFogPlatform({
        fogUuid: 'fog-a',
        reason: 'spec-changed',
        specGeneration: 1
      }, transaction)
    })

    const rows = await ReconcileOutbox.findAll()
    expect(rows).to.have.length(1)
    expect(rows[0].kind).to.equal('fog_platform')
    expect(rows[0].processedAt).to.be.null
  })

  it('rolls back outbox row when transaction fails', async () => {
    try {
      await runInTransaction(async (transaction) => {
        await ReconcileOutboxManager.enqueueFogPlatform({
          fogUuid: 'fog-b',
          reason: 'delete'
        }, transaction)
        throw new Error('forced rollback')
      })
    } catch (error) {
      expect(error.message).to.equal('forced rollback')
    }

    const rows = await ReconcileOutbox.findAll()
    expect(rows).to.have.length(0)
  })

  it('deduplicates enqueue by idempotency key', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueFogPlatform({
        fogUuid: 'fog-c',
        reason: 'spec-changed',
        specGeneration: 2
      }, transaction)
      await ReconcileOutboxManager.enqueueFogPlatform({
        fogUuid: 'fog-c',
        reason: 'spec-changed',
        specGeneration: 2
      }, transaction)
    })

    const rows = await ReconcileOutbox.findAll()
    expect(rows).to.have.length(1)
  })

  it('re-opens processed outbox row when the same idempotency key is enqueued again', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueNats({
        reason: 'cluster-routes-changed',
        fogUuids: ['fog-other']
      }, transaction)
    })

    await runInTransaction(async (transaction) => {
      const row = await ReconcileOutbox.findOne({
        where: { idempotencyKey: 'nats:cluster-routes-changed:null:null:null:null:null:null:fog-other' }
      }, transaction)
      await ReconcileOutboxManager.markProcessed(row.id, transaction)
    })

    await runInTransaction(async (transaction) => {
      const row = await ReconcileOutboxManager.enqueueNats({
        reason: 'cluster-routes-changed',
        fogUuids: ['fog-other']
      }, transaction)
      expect(row.processedAt).to.be.null
      await sequelize.query('SELECT 1 AS ok', { transaction, type: sequelize.QueryTypes.SELECT })
    })

    const rows = await ReconcileOutbox.findAll()
    expect(rows).to.have.length(1)
    expect(rows[0].processedAt).to.be.null
  })

  it('drains unprocessed row into reconcile task and marks processed', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueFogPlatform({
        fogUuid: 'fog-d',
        reason: 'manual-retry',
        specGeneration: 5
      }, transaction)
    })

    const enqueueStub = sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').resolves({ id: 99 })

    const result = await drainOnce()
    expect(result.processed).to.equal(1)
    expect(result.failed).to.equal(0)
    expect(enqueueStub).to.have.been.calledOnceWith({
      fogUuid: 'fog-d',
      reason: 'manual-retry',
      specGeneration: 5
    }, sinon.match.object)

    const row = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'fp:fog-d:manual-retry:5' } })
    expect(row.processedAt).to.not.be.null
    expect(row.lastError).to.be.null
  })

  it('records lastError when drain fails', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueFogPlatform({
        fogUuid: 'fog-e',
        reason: 'delete'
      }, transaction)
    })

    sandbox.stub(FogPlatformReconcileTaskManager, 'enqueueFogPlatformReconcileTask').rejects(new Error('enqueue failed'))

    const result = await drainOnce()
    expect(result.processed).to.equal(0)
    expect(result.failed).to.equal(1)

    const row = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'fp:fog-e:delete:null' } })
    expect(row.processedAt).to.be.null
    expect(row.lastError).to.equal('enqueue failed')
  })

  it('drains agent_propagation row and marks processed when complete', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueAgentPropagation({
        scope: 'registry',
        reason: 'created',
        actions: ['notify_registries']
      }, transaction)
    })

    const propagateStub = sandbox.stub(AgentPropagationService, 'propagateAgentChangeTracking').resolves({ complete: true })

    const result = await drainOnce()
    expect(result.processed).to.equal(1)
    expect(result.failed).to.equal(0)
    expect(propagateStub).to.have.been.calledOnceWith({
      scope: 'registry',
      reason: 'created',
      actions: ['notify_registries']
    }, sinon.match.object)

    const row = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:registry:registries' } })
    expect(row.processedAt).to.not.be.null
  })

  it('updates payload and leaves row unprocessed when agent_propagation is incomplete', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueAgentPropagation({
        scope: 'registry',
        reason: 'created',
        actions: ['notify_registries']
      }, transaction)
    })

    const nextPayload = {
      scope: 'registry',
      reason: 'created',
      actions: ['notify_registries'],
      progress: {
        action: 'notify_registries',
        mode: 'all_fogs',
        cursor: 'fog-b',
        batchSize: 2
      }
    }

    sandbox.stub(AgentPropagationService, 'propagateAgentChangeTracking')
      .onFirstCall().resolves({ complete: false, nextPayload })
      .onSecondCall().resolves({ complete: true })

    const firstDrain = await drainOnce()
    expect(firstDrain.processed).to.equal(0)
    expect(firstDrain.failed).to.equal(0)

    const partialRow = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:registry:registries' } })
    expect(partialRow.processedAt).to.be.null
    expect(JSON.parse(partialRow.payload)).to.deep.equal(nextPayload)

    const secondDrain = await drainOnce()
    expect(secondDrain.processed).to.equal(1)

    const completedRow = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:registry:registries' } })
    expect(completedRow.processedAt).to.not.be.null
  })

  it('drains catalog image propagation and runs rebuild plus change tracking', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueAgentPropagation({
        scope: 'catalog',
        reason: 'images_updated',
        catalogItemId: 7,
        actions: ['rebuild', 'notify_microservices']
      }, transaction)
    })

    sandbox.stub(MicroserviceManager, 'update').resolves()
    sandbox.stub(CatalogItemImageManager, 'findCustomImageMicroserviceUuids').resolves([])
    sandbox.stub(MicroserviceManager, 'findDistinctFogUuids').resolves(['fog-a'])
    sandbox.stub(ChangeTrackingService, 'update').resolves()

    const result = await drainOnce()
    expect(result.processed).to.equal(1)
    expect(result.failed).to.equal(0)
    expect(MicroserviceManager.update).to.have.been.calledOnceWith(
      sinon.match({ catalogItemId: 7, delete: false }),
      { rebuild: true },
      sinon.match.object
    )
    expect(ChangeTrackingService.update).to.have.been.calledOnceWith(
      'fog-a',
      ChangeTrackingService.events.microserviceCommon,
      sinon.match.object
    )

    const row = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:catalog:7:images' } })
    expect(row.processedAt).to.not.be.null
  })

  it('resumes agent_propagation notify_registries across 500 fogs via drainer cursor', async () => {
    await runInTransaction(async (transaction) => {
      await ReconcileOutboxManager.enqueueAgentPropagation({
        scope: 'registry',
        reason: 'created',
        actions: ['notify_registries']
      }, transaction)
    })

    const allFogs = Array.from({ length: 500 }, (_, i) => `fog-${String(i).padStart(4, '0')}`)
    sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
      if (key === 'settings.agentPropagationFogNotifyBatchSize') {
        return 100
      }
      return defaultValue
    })
    sandbox.stub(FogManager, 'findUuidsAfterCursor').callsFake(async (cursor, limit) => {
      const remaining = cursor ? allFogs.filter((uuid) => uuid > cursor) : allFogs
      return remaining.slice(0, limit)
    })
    sandbox.stub(ChangeTrackingService, 'update').resolves()

    const firstDrain = await drainOnce()
    expect(firstDrain.processed).to.equal(0)
    expect(firstDrain.failed).to.equal(0)

    const partialRow = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:registry:registries' } })
    expect(partialRow.processedAt).to.be.null
    expect(JSON.parse(partialRow.payload).progress.cursor).to.equal('fog-0099')

    for (let tick = 0; tick < 5; tick += 1) {
      const drainResult = await drainOnce()
      if (tick < 4) {
        expect(drainResult.processed).to.equal(0)
      }
    }

    const completedRow = await ReconcileOutbox.findOne({ where: { idempotencyKey: 'ap:registry:registries' } })
    expect(completedRow.processedAt).to.not.be.null
    expect(ChangeTrackingService.update).to.have.callCount(500)
  })
})

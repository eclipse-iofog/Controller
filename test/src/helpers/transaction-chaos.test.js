'use strict'

const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')
const sinon = require('sinon')

const databaseProvider = require('../../../src/data/providers/database-factory')
const defineReconcileOutbox = require('../../../src/data/models/reconcileOutbox')
const defineFogPlatformReconcileTask = require('../../../src/data/models/fogPlatformReconcileTask')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const { runInTransaction } = require('../../../src/helpers/transaction-runner')
const { drainOnce } = require('../../../src/jobs/reconcile-outbox-drainer-job')

describe('transaction chaos', () => {
  const sandbox = sinon.createSandbox()

  describe('connection kill mid-transaction', () => {
    let sequelize
    let dbPath

    beforeEach(async () => {
      dbPath = path.join(os.tmpdir(), `controller-chaos-kill-${Date.now()}-${Math.random()}.sqlite`)
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false,
        pool: { max: 1, min: 0, idle: 10000 }
      })
      await sequelize.authenticate()
      await sequelize.query(`
        CREATE TABLE chaos_multi (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          step INTEGER NOT NULL
        )
      `)
    })

    afterEach(async () => {
      if (sequelize) {
        try {
          await sequelize.close()
        } catch (_) { /* ignore */ }
      }
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          fs.unlinkSync(dbPath + suffix)
        } catch (_) { /* ignore */ }
      }
    })

    it('does not leave partial multi-row state when the connection is killed mid-transaction', async function () {
      this.timeout(15000)

      try {
        await sequelize.transaction(async (transaction) => {
          await sequelize.query('INSERT INTO chaos_multi (step) VALUES (1)', { transaction })
          await sequelize.connectionManager.close()
          await sequelize.query('INSERT INTO chaos_multi (step) VALUES (2)', { transaction })
        })
      } catch (_) {
        // Expected: connection teardown aborts the open transaction.
      }

      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false,
        pool: { max: 1, min: 0, idle: 10000 }
      })
      await sequelize.authenticate()

      const [rows] = await sequelize.query('SELECT step FROM chaos_multi ORDER BY step ASC')
      expect(rows).to.deep.equal([])
    })
  })

  describe('duplicate outbox drainer', () => {
    let sequelize
    let dbPath
    let ReconcileOutbox
    let FogPlatformReconcileTask

    beforeEach(async () => {
      dbPath = path.join(os.tmpdir(), `controller-chaos-drainer-${Date.now()}-${Math.random()}.sqlite`)
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false,
        pool: { max: 1, min: 0, idle: 10000 }
      })
      await sequelize.authenticate()

      ReconcileOutbox = defineReconcileOutbox(sequelize, Sequelize.DataTypes)
      FogPlatformReconcileTask = defineFogPlatformReconcileTask(sequelize, Sequelize.DataTypes)
      await ReconcileOutbox.sync()
      await FogPlatformReconcileTask.sync()

      const models = require('../../../src/data/models')
      models.ReconcileOutbox = ReconcileOutbox
      models.FogPlatformReconcileTask = FogPlatformReconcileTask
      models.sequelize = sequelize
      sandbox.stub(databaseProvider, 'sequelize').value(sequelize)
    })

    afterEach(async () => {
      sandbox.restore()
      if (sequelize) {
        await sequelize.close()
      }
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          fs.unlinkSync(dbPath + suffix)
        } catch (_) { /* ignore */ }
      }
    })

    it('creates a single reconcile task when two drain ticks run in parallel', async () => {
      await runInTransaction(async (transaction) => {
        await ReconcileOutboxManager.enqueueFogPlatform({
          fogUuid: 'fog-chaos-1',
          reason: 'manual-retry',
          specGeneration: 9
        }, transaction)
      })

      const [resultA, resultB] = await Promise.all([drainOnce(), drainOnce()])
      const processed = (resultA.processed || 0) + (resultB.processed || 0)
      expect(processed).to.be.at.least(1)

      const tasks = await FogPlatformReconcileTask.findAll({
        where: { fogUuid: 'fog-chaos-1' }
      })
      expect(tasks).to.have.length(1)

      const outboxRow = await ReconcileOutbox.findOne({
        where: { idempotencyKey: 'fp:fog-chaos-1:manual-retry:9' }
      })
      expect(outboxRow.processedAt).to.not.be.null
    })
  })

  describe('mysql/postgres HA claim (integration)', function () {
    const haUrl = process.env.RECONCILE_CLAIM_HA_URL

    before(function () {
      if (!haUrl) {
        this.skip()
      }
    })

    it('claims each task at most once with two parallel connections', async function () {
      this.timeout(30000)

      const dialect = process.env.RECONCILE_CLAIM_HA_DIALECT || 'postgres'
      const sequelizeA = new Sequelize(haUrl, { dialect, logging: false })
      const sequelizeB = new Sequelize(haUrl, { dialect, logging: false })

      const FogTaskA = defineFogPlatformReconcileTask(sequelizeA, Sequelize.DataTypes)
      await FogTaskA.sync({ force: true })

      await FogTaskA.bulkCreate([
        { fogUuid: 'fog-chaos-ha-1', reason: 'spec-changed', status: 'pending' },
        { fogUuid: 'fog-chaos-ha-2', reason: 'spec-changed', status: 'pending' }
      ])

      const claimWithConnection = async (conn, controllerUuid) => {
        return conn.transaction(async (transaction) => {
          const rows = await conn.query(
            `SELECT id FROM "FogPlatformReconcileTasks"
             WHERE status IN ('pending', 'in_progress')
               AND (leader_uuid IS NULL)
             ORDER BY id ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`,
            { type: conn.QueryTypes.SELECT, transaction }
          )
          if (!rows.length) {
            return null
          }
          await conn.query(
            `UPDATE "FogPlatformReconcileTasks"
             SET leader_uuid = :leader, claimed_at = NOW(), status = 'in_progress'
             WHERE id = :id AND leader_uuid IS NULL`,
            {
              replacements: { leader: controllerUuid, id: rows[0].id },
              transaction
            }
          )
          return rows[0].id
        })
      }

      const [idA, idB] = await Promise.all([
        claimWithConnection(sequelizeA, 'replica-a'),
        claimWithConnection(sequelizeB, 'replica-b')
      ])

      expect(idA).to.be.a('number')
      expect(idB).to.be.a('number')
      expect(idA).to.not.equal(idB)

      await sequelizeA.close()
      await sequelizeB.close()
    })
  })
})

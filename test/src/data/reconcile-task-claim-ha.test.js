'use strict'

const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')
const sinon = require('sinon')

const databaseProvider = require('../../../src/data/providers/database-factory')
const defineFogPlatformReconcileTask = require('../../../src/data/models/fogPlatformReconcileTask')
const FogPlatformReconcileTaskManager = require('../../../src/data/managers/fog-platform-reconcile-task-manager')
const dbDialect = require('../../../src/helpers/db-dialect')

describe('reconcile-task-claim-ha', () => {
  const sandbox = sinon.createSandbox()

  describe('SKIP LOCKED claim path (mysql/postgres dialect)', () => {
    let queryStub
    let originalDbProvider

    beforeEach(() => {
      originalDbProvider = process.env.DB_PROVIDER
      process.env.DB_PROVIDER = 'postgres'

      queryStub = sandbox.stub(databaseProvider.sequelize, 'query').resolves([])
      sandbox.stub(databaseProvider.sequelize, 'getDialect').returns('postgres')
      sandbox.stub(databaseProvider.sequelize, 'transaction').callsFake(async (fn) => fn({}))
      sandbox.stub(FogPlatformReconcileTaskManager, 'getEntity').returns({
        getTableName: () => 'FogPlatformReconcileTasks',
        build: (row) => row,
        update: sandbox.stub().resolves([0]),
        findOne: sandbox.stub().resolves(null)
      })
    })

    afterEach(() => {
      if (originalDbProvider === undefined) {
        delete process.env.DB_PROVIDER
      } else {
        process.env.DB_PROVIDER = originalDbProvider
      }
      sandbox.restore()
    })

    it('uses FOR UPDATE SKIP LOCKED when dialect supports it', async () => {
      await FogPlatformReconcileTaskManager.claimNextFogTask('controller-a', 300)

      expect(queryStub).to.have.been.calledOnce
      const sql = queryStub.firstCall.args[0]
      expect(sql).to.include('FOR UPDATE SKIP LOCKED')
      expect(sql).to.include('"FogPlatformReconcileTasks"')
    })
  })

  describe('sqlite claim path', () => {
    let sequelize
    let dbPath
    let FogPlatformReconcileTask

    beforeEach(async () => {
      dbPath = path.join(os.tmpdir(), `controller-claim-${Date.now()}-${Math.random()}.sqlite`)
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false,
        pool: { max: 1, min: 0, idle: 10000 }
      })
      await sequelize.authenticate()

      FogPlatformReconcileTask = defineFogPlatformReconcileTask(sequelize, Sequelize.DataTypes)
      await FogPlatformReconcileTask.sync()

      const models = require('../../../src/data/models')
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

    it('claims each pending task at most once under concurrent claimers', async () => {
      await FogPlatformReconcileTask.bulkCreate([
        { fogUuid: 'fog-1', reason: 'spec-changed', status: 'pending' },
        { fogUuid: 'fog-2', reason: 'spec-changed', status: 'pending' },
        { fogUuid: 'fog-3', reason: 'spec-changed', status: 'pending' }
      ])

      const claims = await Promise.all([
        FogPlatformReconcileTaskManager.claimNextFogTask('controller-a', 300),
        FogPlatformReconcileTaskManager.claimNextFogTask('controller-b', 300),
        FogPlatformReconcileTaskManager.claimNextFogTask('controller-c', 300)
      ])

      const claimedIds = claims.filter(Boolean).map((task) => task.id)
      expect(claimedIds).to.have.length(3)
      expect(new Set(claimedIds).size).to.equal(3)

      const leaders = await FogPlatformReconcileTask.findAll({
        where: { status: 'in_progress' },
        order: [['id', 'ASC']]
      })
      expect(leaders).to.have.length(3)
      expect(new Set(leaders.map((row) => row.leaderUuid)).size).to.equal(3)
    })
  })

  describe('concurrent claims on mysql/postgres (integration)', function () {
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
      const FogTaskB = defineFogPlatformReconcileTask(sequelizeB, Sequelize.DataTypes)
      await FogTaskA.sync({ force: true })

      await FogTaskA.bulkCreate([
        { fogUuid: 'fog-ha-1', reason: 'spec-changed', status: 'pending' },
        { fogUuid: 'fog-ha-2', reason: 'spec-changed', status: 'pending' }
      ])

      const claimWithConnection = async (sequelize, controllerUuid) => {
        return sequelize.transaction(async (transaction) => {
          const rows = await sequelize.query(
            `SELECT id FROM "FogPlatformReconcileTasks"
             WHERE status IN ('pending', 'in_progress')
               AND (leader_uuid IS NULL)
             ORDER BY id ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`,
            { type: sequelize.QueryTypes.SELECT, transaction }
          )
          if (!rows.length) {
            return null
          }
          await sequelize.query(
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

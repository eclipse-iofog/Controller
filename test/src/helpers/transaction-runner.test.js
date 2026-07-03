const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')
const Transaction = require('sequelize/lib/transaction')
const sinon = require('sinon')

const databaseProvider = require('../../../src/data/providers/database-factory')
const {
  PRIORITY_BACKGROUND,
  PRIORITY_INTERACTIVE,
  _resetQueueForTests,
  getActiveTransactionContext,
  getWriteQueueDepth,
  runInTransaction,
  runWithTransactionContext
} = require('../../../src/helpers/transaction-runner')
const { registerSqlitePragmas, applySqlitePragmas } = require('../../../src/helpers/sqlite-pragmas')

describe('transaction-runner', () => {
  const sandbox = sinon.createSandbox()
  let originalDbProvider
  let sequelize
  let dbPath

  beforeEach(async () => {
    originalDbProvider = process.env.DB_PROVIDER
    delete process.env.DB_PROVIDER
    _resetQueueForTests()

    dbPath = path.join(os.tmpdir(), `controller-tx-runner-${Date.now()}-${Math.random()}.sqlite`)
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
      pool: { max: 1, min: 0, idle: 10000 }
    })
    registerSqlitePragmas(sequelize, {
      journalMode: 'WAL',
      busyTimeoutMs: 10000,
      synchronous: 'NORMAL'
    })
    await sequelize.authenticate()
    await applySqlitePragmas(sequelize, {
      journalMode: 'WAL',
      busyTimeoutMs: 10000,
      synchronous: 'NORMAL'
    })
    await sequelize.query('CREATE TABLE tx_runner_test (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)')

    sandbox.stub(databaseProvider, 'sequelize').value(sequelize)
  })

  afterEach(async () => {
    sandbox.restore()
    _resetQueueForTests()
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
      } catch (_) { /* ignore missing sidecar files */ }
    }
  })

  it('exports priority constants', () => {
    expect(PRIORITY_INTERACTIVE).to.equal('interactive')
    expect(PRIORITY_BACKGROUND).to.equal('background')
  })

  it('passes a real Sequelize transaction to the callback on sqlite', async () => {
    let seenTransaction
    await runInTransaction(async (transaction) => {
      seenTransaction = transaction
      await sequelize.query('INSERT INTO tx_runner_test (label) VALUES (\'interactive\')', { transaction })
    })

    expect(seenTransaction).to.be.instanceOf(Transaction)
    const [rows] = await sequelize.query('SELECT label FROM tx_runner_test')
    expect(rows).to.deep.equal([{ label: 'interactive' }])
  })

  it('runs interactive tasks before queued background tasks on sqlite', async () => {
    const order = []
    let releaseBg1

    const bg1Gate = new Promise((resolve) => {
      releaseBg1 = resolve
    })

    const bg1 = runInTransaction(async () => {
      order.push('bg1-start')
      await bg1Gate
      order.push('bg1-end')
    }, { priority: PRIORITY_BACKGROUND, label: 'bg1' })

    await new Promise((resolve) => setTimeout(resolve, 20))

    const bg2 = runInTransaction(async () => {
      order.push('bg2')
    }, { priority: PRIORITY_BACKGROUND, label: 'bg2' })

    const interactive = runInTransaction(async () => {
      order.push('interactive')
    }, { priority: PRIORITY_INTERACTIVE, label: 'interactive' })

    releaseBg1()
    await Promise.all([bg1, interactive, bg2])

    expect(order).to.deep.equal(['bg1-start', 'bg1-end', 'interactive', 'bg2'])
  })

  it('tracks sqlite queue depth by priority lane', async () => {
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })

    const first = runInTransaction(async () => {
      await gate
    }, { priority: PRIORITY_BACKGROUND })

    await new Promise((resolve) => setTimeout(resolve, 20))

    runInTransaction(async () => {}, { priority: PRIORITY_INTERACTIVE })
    runInTransaction(async () => {}, { priority: PRIORITY_BACKGROUND })

    expect(getWriteQueueDepth()).to.deep.equal({ interactive: 1, background: 1 })

    release()
    await first
  })

  it('retries on SQLITE_BUSY inside the sqlite queue worker', async () => {
    const originalTransaction = sequelize.transaction.bind(sequelize)
    let attempts = 0

    sequelize.transaction = async (fn) => {
      attempts++
      if (attempts === 1) {
        throw new Error('SQLITE_BUSY: database is locked')
      }
      return originalTransaction(fn)
    }

    await runInTransaction(async (transaction) => {
      await sequelize.query('INSERT INTO tx_runner_test (label) VALUES (\'retried\')', { transaction })
    })

    expect(attempts).to.be.at.least(2)
    const [rows] = await sequelize.query('SELECT label FROM tx_runner_test')
    expect(rows).to.deep.equal([{ label: 'retried' }])
  })

  it('skips the global sqlite queue for mysql provider', async () => {
    process.env.DB_PROVIDER = 'mysql'

    let tx1Running = false
    let tx2StartedWhileTx1Running = false
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    sequelize.transaction = sandbox.stub().callsFake(async (fn) => fn({}))

    await Promise.all([
      runInTransaction(async () => {
        tx1Running = true
        await delay(50)
        tx1Running = false
      }, { priority: PRIORITY_BACKGROUND }),
      runInTransaction(async () => {
        if (tx1Running) {
          tx2StartedWhileTx1Running = true
        }
      }, { priority: PRIORITY_BACKGROUND })
    ])

    expect(tx2StartedWhileTx1Running).to.equal(true)
  })

  it('reuses active sqlite transaction for nested interactive runInTransaction calls', async () => {
    const order = []
    await runInTransaction(async (outerTx) => {
      order.push('outer-start')
      await runInTransaction(async (innerTx) => {
        order.push('inner')
        expect(innerTx).to.equal(outerTx)
      }, { priority: PRIORITY_INTERACTIVE, label: 'nested-interactive' })
      order.push('outer-end')
    }, { priority: PRIORITY_BACKGROUND, label: 'outer-background' })

    expect(order).to.deep.equal(['outer-start', 'inner', 'outer-end'])
  })

  it('enqueues a fresh sqlite transaction for background runInTransaction after parent releases', async () => {
    let outerTx
    let innerTxPromise
    await runInTransaction(async (transaction) => {
      outerTx = transaction
      innerTxPromise = runInTransaction(async (tx) => tx, {
        priority: PRIORITY_BACKGROUND,
        label: 'event.audit'
      })
    }, { priority: PRIORITY_INTERACTIVE, label: 'handler' })

    const innerTx = await innerTxPromise
    expect(innerTx).to.be.instanceOf(Transaction)
    expect(innerTx).to.not.equal(outerTx)
  })

  it('background runInTransaction ignores stale committed parent in ALS', async () => {
    let committedTx
    await runInTransaction(async (transaction) => {
      committedTx = transaction
    }, { priority: PRIORITY_INTERACTIVE, label: 'handler' })

    await runWithTransactionContext(committedTx, PRIORITY_INTERACTIVE, async () => {
      let auditTx
      await runInTransaction(async (tx) => {
        auditTx = tx
        await sequelize.query('INSERT INTO tx_runner_test (label) VALUES (\'audit\')', { transaction: tx })
      }, { priority: PRIORITY_BACKGROUND, label: 'event.audit' })
      expect(auditTx).to.be.instanceOf(Transaction)
      expect(auditTx).to.not.equal(committedTx)
    })

    const [rows] = await sequelize.query('SELECT label FROM tx_runner_test')
    expect(rows).to.deep.equal([{ label: 'audit' }])
  })

  it('skips the global sqlite queue for postgres provider', async () => {
    process.env.DB_PROVIDER = 'postgres'

    let tx1Running = false
    let tx2StartedWhileTx1Running = false
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    sequelize.transaction = sandbox.stub().callsFake(async (fn) => fn({}))

    await Promise.all([
      runInTransaction(async () => {
        tx1Running = true
        await delay(50)
        tx1Running = false
      }),
      runInTransaction(async () => {
        if (tx1Running) {
          tx2StartedWhileTx1Running = true
        }
      })
    ])

    expect(tx2StartedWhileTx1Running).to.equal(true)
  })

  it('runWithTransactionContext skips duplicate ALS frame when same tx active', async () => {
    const tx = { commit: () => {}, rollback: () => {} }
    let nestedCtx

    await runWithTransactionContext(tx, PRIORITY_INTERACTIVE, async () => {
      await runWithTransactionContext(tx, null, async () => {
        nestedCtx = getActiveTransactionContext()
      })
    })

    expect(nestedCtx.transaction).to.equal(tx)
    expect(nestedCtx.priority).to.equal(PRIORITY_INTERACTIVE)
  })

  it('runWithTransactionContext inherits priority from parent when omitted', async () => {
    const tx = { commit: () => {}, rollback: () => {} }
    let nestedCtx

    await runWithTransactionContext(tx, PRIORITY_BACKGROUND, async () => {
      await runWithTransactionContext(tx, null, async () => {
        nestedCtx = getActiveTransactionContext()
      })
    })

    expect(nestedCtx.priority).to.equal(PRIORITY_BACKGROUND)
  })
})

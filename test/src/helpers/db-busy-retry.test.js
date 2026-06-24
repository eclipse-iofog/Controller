const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')

const { isSqliteBusyError, withDbBusyRetry } = require('../../../src/helpers/db-busy-retry')
const { registerSqlitePragmas, applySqlitePragmas } = require('../../../src/helpers/sqlite-pragmas')

describe('db-busy-retry', () => {
  it('detects SQLITE_BUSY on nested Sequelize errors', () => {
    const error = {
      message: 'SQLITE_BUSY: database is locked',
      parent: { message: 'SQLITE_BUSY: database is locked', code: 'SQLITE_BUSY' }
    }
    expect(isSqliteBusyError(error)).to.equal(true)
  })

  it('does not treat unrelated errors as busy', () => {
    expect(isSqliteBusyError(new Error('connection refused'))).to.equal(false)
  })

  it('retries until the operation succeeds', async () => {
    let attempts = 0
    const result = await withDbBusyRetry(async () => {
      attempts++
      if (attempts < 3) {
        throw new Error('SQLITE_BUSY: database is locked')
      }
      return 'ok'
    })

    expect(result).to.equal('ok')
    expect(attempts).to.equal(3)
  })

  it('rethrows non-busy errors immediately', async () => {
    let attempts = 0
    try {
      await withDbBusyRetry(async () => {
        attempts++
        throw new Error('constraint violation')
      })
      throw new Error('expected throw')
    } catch (error) {
      expect(error.message).to.equal('constraint violation')
      expect(attempts).to.equal(1)
    }
  })

  it('exhausts retries and rethrows the last busy error', async () => {
    let attempts = 0
    try {
      await withDbBusyRetry(async () => {
        attempts++
        throw new Error('SQLITE_BUSY: database is locked')
      }, { maxRetries: 2 })
      throw new Error('expected throw')
    } catch (error) {
      expect(error.message).to.contain('SQLITE_BUSY')
      expect(attempts).to.equal(3)
    }
  })
})

describe('sqlite lock contention regression', () => {
  let sequelize
  let dbPath

  beforeEach(async () => {
    dbPath = path.join(os.tmpdir(), `controller-lock-test-${Date.now()}-${Math.random()}.sqlite`)
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
    await sequelize.query('CREATE TABLE lock_test (id INTEGER PRIMARY KEY AUTOINCREMENT, val INTEGER NOT NULL)')
  })

  afterEach(async () => {
    if (sequelize) {
      await sequelize.close()
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix)
      } catch (_) { /* ignore missing sidecar files */ }
    }
  })

  it('completes concurrent writes with withDbBusyRetry under single-connection SQLite', async function () {
    this.timeout(15000)

    const write = () => withDbBusyRetry(() =>
      sequelize.transaction(async (transaction) => {
        await sequelize.query('INSERT INTO lock_test (val) VALUES (1)', { transaction })
      })
    )

    await Promise.all(Array.from({ length: 12 }, () => write()))

    const [rows] = await sequelize.query('SELECT COUNT(*) AS count FROM lock_test')
    expect(Number(rows[0].count)).to.equal(12)
  })
})

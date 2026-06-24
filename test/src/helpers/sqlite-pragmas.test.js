const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Sequelize = require('sequelize')

const { registerSqlitePragmas, applySqlitePragmas } = require('../../../src/helpers/sqlite-pragmas')

describe('sqlite-pragmas', () => {
  let sequelize
  let dbPath

  afterEach(async () => {
    if (sequelize) {
      await sequelize.close()
      sequelize = null
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix)
      } catch (_) { /* ignore */ }
    }
  })

  it('applies WAL and busy_timeout on connect', async () => {
    dbPath = path.join(os.tmpdir(), `controller-pragma-test-${Date.now()}.sqlite`)
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false
    })
    registerSqlitePragmas(sequelize, {
      journalMode: 'WAL',
      busyTimeoutMs: 7500,
      synchronous: 'NORMAL'
    })

    await sequelize.authenticate()
    await applySqlitePragmas(sequelize, {
      journalMode: 'WAL',
      busyTimeoutMs: 7500,
      synchronous: 'NORMAL'
    })

    const [journalRows] = await sequelize.query('PRAGMA journal_mode')
    const journalMode = Object.values(journalRows[0] || {})[0]
    expect(String(journalMode).toLowerCase()).to.equal('wal')

    const [busyRows] = await sequelize.query('PRAGMA busy_timeout')
    const busyTimeout = Object.values(busyRows[0] || {})[0]
    expect(Number(busyTimeout)).to.equal(7500)
  })
})

const { expect } = require('chai')
const sinon = require('sinon')

describe('sqlite-fog-warning', () => {
  const sandbox = sinon.createSandbox()
  let models
  let config
  let logger
  let dbMetrics
  let transactionRunner

  beforeEach(() => {
    models = require('../../../src/data/models')
    models.Fog = { count: sandbox.stub() }
    config = require('../../../src/config')
    logger = require('../../../src/logger')
    dbMetrics = require('../../../src/helpers/db-metrics')
    transactionRunner = require('../../../src/helpers/transaction-runner')

    sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
      if (key === 'settings.sqliteEnterpriseFogWarningThreshold') {
        return 50
      }
      if (key === 'database.provider') {
        return 'sqlite'
      }
      return defaultValue
    })
    sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
    sandbox.stub(logger, 'warn')
    sandbox.stub(dbMetrics, 'recordSqliteFogCountWarning')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('logs warning and records metric when fog count exceeds threshold', async () => {
    models.Fog.count.resolves(75)
    const { checkSqliteFogCountWarning } = require('../../../src/helpers/sqlite-fog-warning')

    await checkSqliteFogCountWarning()

    expect(dbMetrics.recordSqliteFogCountWarning.calledOnce).to.equal(true)
    expect(logger.warn.calledOnce).to.equal(true)
    expect(logger.warn.firstCall.args[0]).to.contain('75 fogs')
    expect(logger.warn.firstCall.args[0]).to.contain('mysql or postgres')
  })

  it('does nothing when fog count is at or below threshold', async () => {
    models.Fog.count.resolves(50)
    const { checkSqliteFogCountWarning } = require('../../../src/helpers/sqlite-fog-warning')

    await checkSqliteFogCountWarning()

    expect(dbMetrics.recordSqliteFogCountWarning.called).to.equal(false)
    expect(logger.warn.called).to.equal(false)
  })

  it('skips check for non-sqlite providers', async () => {
    transactionRunner.isSqliteProvider.returns(false)
    models.Fog.count.resolves(100)
    const { checkSqliteFogCountWarning } = require('../../../src/helpers/sqlite-fog-warning')

    await checkSqliteFogCountWarning()

    expect(models.Fog.count.called).to.equal(false)
  })
})

const { expect } = require('chai')

const {
  isConnectionInvalidatedError,
  maybeRecordConnectionInvalidated,
  recordBusyRetry,
  recordSqliteFogCountWarning,
  recordTransactionDuration,
  recordWriteQueueWaitMs
} = require('../../../src/helpers/db-metrics')

describe('db-metrics', () => {
  it('detects connection invalidation error patterns', () => {
    expect(isConnectionInvalidatedError(new Error('cannot rollback - no transaction is active'))).to.equal(true)
    expect(isConnectionInvalidatedError(new Error('Connection terminated unexpectedly'))).to.equal(true)
    expect(isConnectionInvalidatedError(new Error('SQLITE_BUSY: database is locked'))).to.equal(false)
  })

  it('records transaction duration without throwing when OTEL is not initialized', () => {
    expect(() => recordTransactionDuration({ label: 'test', priority: 'interactive', provider: 'sqlite' }, 12)).to.not.throw()
  })

  it('records queue wait without throwing when OTEL is not initialized', () => {
    expect(() => recordWriteQueueWaitMs('background', 5)).to.not.throw()
  })

  it('records busy retry without throwing when OTEL is not initialized', () => {
    expect(() => recordBusyRetry('agent.updateStatus')).to.not.throw()
  })

  it('records fog count warning without throwing when OTEL is not initialized', () => {
    expect(() => recordSqliteFogCountWarning()).to.not.throw()
  })

  it('maybeRecordConnectionInvalidated is a no-op for unrelated errors', () => {
    expect(() => maybeRecordConnectionInvalidated(new Error('constraint violation'), 'sqlite')).to.not.throw()
  })
})

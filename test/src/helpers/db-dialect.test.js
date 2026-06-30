'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const dbDialect = require('../../../src/helpers/db-dialect')
const databaseProvider = require('../../../src/data/providers/database-factory')

describe('db-dialect', () => {
  const sandbox = sinon.createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  describe('supportsSkipLocked', () => {
    it('returns false for sqlite', () => {
      sandbox.stub(databaseProvider.sequelize, 'getDialect').returns('sqlite')
      expect(dbDialect.supportsSkipLocked()).to.equal(false)
    })

    it('returns true for mysql and postgres', () => {
      const getDialect = sandbox.stub(databaseProvider.sequelize, 'getDialect')
      getDialect.returns('mysql')
      expect(dbDialect.supportsSkipLocked()).to.equal(true)

      getDialect.returns('postgres')
      expect(dbDialect.supportsSkipLocked()).to.equal(true)
    })
  })

  describe('quoteTableName', () => {
    it('quotes for postgres and mysql', () => {
      expect(dbDialect.quoteTableName('FogPlatformReconcileTasks', 'postgres'))
        .to.equal('"FogPlatformReconcileTasks"')
      expect(dbDialect.quoteTableName('FogPlatformReconcileTasks', 'mysql'))
        .to.equal('`FogPlatformReconcileTasks`')
    })
  })
})

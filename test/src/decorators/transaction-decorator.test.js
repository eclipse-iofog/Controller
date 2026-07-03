'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const Transaction = require('sequelize/lib/transaction')

const TransactionDecorator = require('../../../src/decorators/transaction-decorator')
const transactionRunner = require('../../../src/helpers/transaction-runner')

describe('transaction-decorator', () => {
  const sandbox = sinon.createSandbox()
  const parentTransaction = Object.assign(Object.create(Transaction.prototype), {
    commit: () => {},
    rollback: () => {}
  })
  let originalNodeEnv

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    sandbox.restore()
  })

  it('passes through when transaction is not the last argument', async () => {
    sandbox.stub(transactionRunner, 'runInTransaction').rejects(new Error('should not enqueue'))

    async function ensureOperator (transaction, options = {}) {
      return { transaction, options }
    }

    const wrapped = TransactionDecorator.generateTransaction(ensureOperator)
    const result = await wrapped(parentTransaction, { triggerReconcile: false })

    expect(result.transaction).to.equal(parentTransaction)
    expect(result.options).to.deep.equal({ triggerReconcile: false })
    expect(transactionRunner.runInTransaction).to.not.have.been.called
  })

  it('nested runInTransaction reuses explicit parent transaction without decorator enqueue', async () => {
    const runInTransactionSpy = sandbox.spy(transactionRunner, 'runInTransaction')

    async function innerUtil () {
      return transactionRunner.runInTransaction((tx) => tx)
    }

    async function outer (data, transaction) {
      return innerUtil()
    }

    const wrapped = TransactionDecorator.generateTransaction(outer)
    const result = await wrapped({}, parentTransaction)

    expect(result).to.equal(parentTransaction)
    expect(runInTransactionSpy).to.have.been.calledOnce
  })

  it('registers ALS so getActiveTransactionContext sees explicit parent tx', async () => {
    let ctxInsideHandler

    async function outer (data, transaction) {
      ctxInsideHandler = transactionRunner.getActiveTransactionContext()
      return transaction
    }

    const wrapped = TransactionDecorator.generateTransaction(outer)
    await wrapped({}, parentTransaction)

    expect(ctxInsideHandler).to.not.equal(null)
    expect(ctxInsideHandler.transaction).to.equal(parentTransaction)
  })
})

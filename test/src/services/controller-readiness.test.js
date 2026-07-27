const { expect } = require('chai')
const sinon = require('sinon')

const readinessService = require('../../../src/services/controller-readiness-service')
const controllerService = require('../../../src/services/controller-service')
const transactionRunner = require('../../../src/helpers/transaction-runner')
const databaseProvider = require('../../../src/data/providers/database-factory')
const vaultManager = require('../../../src/vault/vault-manager')
const oidcConfig = require('../../../src/config/oidc')
const authJwks = require('../../../src/config/auth-jwks')
const CODES = require('../../../src/helpers/agent-auth-error-codes')
const { ReadinessNotReadyError, TransactionTimeoutError } = require('../../../src/helpers/errors')

describe('controller readiness', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('assertReadiness()', () => {
    it('passes when database, vault, and auth checks succeed', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').callsFake(async (fn) => fn())
      $sandbox.stub(databaseProvider.sequelize, 'query').resolves([[1]])
      $sandbox.stub(vaultManager, 'isEnabled').returns(false)
      $sandbox.stub(oidcConfig, 'isAuthConfigured').returns(false)

      await readinessService.assertReadiness()
    })

    it('uses sqlite read path outside the write queue for database readiness', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      const readOutside = $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').callsFake(async (fn) => fn())
      $sandbox.stub(databaseProvider.sequelize, 'query').resolves([[1]])
      $sandbox.stub(vaultManager, 'isEnabled').returns(false)
      $sandbox.stub(oidcConfig, 'isAuthConfigured').returns(false)

      await readinessService.assertReadiness()

      expect(readOutside).to.have.been.calledOnce
      expect(readOutside.firstCall.args[1]).to.deep.include({ label: transactionRunner.READINESS_LABEL })
    })

    it('throws ReadinessNotReadyError when database check fails', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').rejects(new Error('SQLITE_BUSY: database is locked'))

      try {
        await readinessService.assertReadiness()
        throw new Error('expected failure')
      } catch (error) {
        expect(error).to.be.instanceOf(ReadinessNotReadyError)
        expect(error.code).to.equal(CODES.CONTROLLER_DB_BUSY)
        expect(error.retryable).to.equal(true)
      }
    })

    it('throws ReadinessNotReadyError when database readiness times out', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').rejects(
        new TransactionTimeoutError('readiness.database', 'interactive', 5000)
      )

      try {
        await readinessService.assertReadiness()
        throw new Error('expected failure')
      } catch (error) {
        expect(error).to.be.instanceOf(ReadinessNotReadyError)
        expect(error.code).to.equal(CODES.CONTROLLER_DB_UNAVAILABLE)
        expect(error.retryable).to.equal(true)
      }
    })

    it('throws ReadinessNotReadyError when vault check fails', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').callsFake(async (fn) => fn())
      $sandbox.stub(databaseProvider.sequelize, 'query').resolves([[1]])
      $sandbox.stub(vaultManager, 'isEnabled').returns(true)
      $sandbox.stub(vaultManager, 'getProvider').returns({
        testConnection: () => Promise.reject(new Error('vault down'))
      })

      try {
        await readinessService.assertReadiness()
        throw new Error('expected failure')
      } catch (error) {
        expect(error).to.be.instanceOf(ReadinessNotReadyError)
        expect(error.code).to.equal(CODES.CONTROLLER_VAULT_UNAVAILABLE)
      }
    })

    it('throws ReadinessNotReadyError when embedded auth is not ready', async () => {
      $sandbox.stub(transactionRunner, 'isSqliteProvider').returns(true)
      $sandbox.stub(transactionRunner, 'runSqliteReadOutsideQueue').callsFake(async (fn) => fn())
      $sandbox.stub(databaseProvider.sequelize, 'query').resolves([[1]])
      $sandbox.stub(vaultManager, 'isEnabled').returns(false)
      $sandbox.stub(oidcConfig, 'isAuthConfigured').returns(true)
      $sandbox.stub(oidcConfig, 'getAuthMode').returns('embedded')
      $sandbox.stub(authJwks, 'getActiveSigningMaterial').rejects(new Error('missing key'))

      try {
        await readinessService.assertReadiness()
        throw new Error('expected failure')
      } catch (error) {
        expect(error).to.be.instanceOf(ReadinessNotReadyError)
        expect(error.code).to.equal(CODES.CONTROLLER_NOT_READY)
      }
    })
  })

  describe('statusController()', () => {
    it('returns liveness payload for CLI calls', async () => {
      const response = await controllerService.statusController(true)
      expect(response).to.have.property('status')
      expect(response).to.have.property('timestamp')
      expect(response).to.have.property('uptimeSec')
      expect(response).to.have.property('versions')
    })

    it('throws ReadinessNotReadyError for HTTP when readiness fails', async () => {
      const readinessModule = require('../../../src/services/controller-readiness-service')
      $sandbox.stub(readinessModule, 'assertReadiness').rejects(
        new ReadinessNotReadyError(CODES.CONTROLLER_NOT_READY, 'Authentication subsystem is not ready', null)
      )

      await expect(controllerService.statusController(false)).to.be.rejectedWith(ReadinessNotReadyError)
    })
  })

  describe('ReadinessNotReadyError.toResponseBody()', () => {
    it('includes base payload and structured error fields', () => {
      const basePayload = {
        status: 'online',
        timestamp: 1,
        uptimeSec: 2,
        versions: { controller: '3.8.2', ecnViewer: '1.0.0' }
      }
      const error = new ReadinessNotReadyError(CODES.CONTROLLER_NOT_READY, 'not ready', basePayload)
      const body = error.toResponseBody()

      expect(body.status).to.equal('online')
      expect(body.versions.controller).to.equal('3.8.2')
      expect(body.error).to.equal('ServiceUnavailable')
      expect(body.code).to.equal(CODES.CONTROLLER_NOT_READY)
      expect(body.retryable).to.equal(true)
    })
  })
})

'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const Transaction = require('sequelize/lib/transaction')

const SecretService = require('../../../src/services/secret-service')
const RegistryService = require('../../../src/services/registry-service')
const ConfigMapManager = require('../../../src/data/managers/config-map-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const BaseManager = require('../../../src/data/managers/base-manager')
const SecretHelper = require('../../../src/helpers/secret-helper')
const vaultManager = require('../../../src/vault/vault-manager')

describe('Plan 19-H vault transaction safety (R-09–R-11)', () => {
  def('sandbox', () => sinon.createSandbox())
  def('parentTransaction', () => {
    const tx = Object.create(Transaction.prototype)
    tx.afterCommit = sinon.spy((fn) => fn())
    return tx
  })

  afterEach(() => {
    $sandbox.restore()
  })

  describe('secret-service deleteSecretEndpoint', () => {
    beforeEach(() => {
      $sandbox.stub(vaultManager, 'isEnabled').returns(true)
      $sandbox.stub(SecretHelper, 'deleteSecret').resolves()
      $sandbox.stub(require('../../../src/data/managers/secret-manager'), 'findOne').resolves({
        name: 'test-secret',
        type: 'Opaque'
      })
      $sandbox.stub(require('../../../src/data/managers/secret-manager'), 'deleteSecret').resolves()
      $sandbox.stub(require('../../../src/data/managers/volume-mounting-manager'), 'findAll').resolves([])
    })

    it('schedules vault delete after commit instead of calling SecretHelper inside the tx body', async () => {
      const deferredTx = Object.create(Transaction.prototype)
      let deferredFn
      deferredTx.afterCommit = sinon.spy((fn) => {
        deferredFn = fn
      })

      await SecretService.deleteSecretEndpoint('test-secret', deferredTx)

      expect(deferredTx.afterCommit).to.have.been.calledOnce
      expect(SecretHelper.deleteSecret).to.not.have.been.called

      await deferredFn()

      expect(SecretHelper.deleteSecret).to.have.been.calledOnceWith('test-secret', 'Opaque')
    })
  })

  describe('config-map-manager deleteConfigMap', () => {
    beforeEach(() => {
      $sandbox.stub(vaultManager, 'isEnabled').returns(true)
      $sandbox.stub(ConfigMapManager, 'findOne').resolves({
        name: 'cfg',
        useVault: true
      })
      $sandbox.stub(ConfigMapManager, 'delete').resolves(1)
      $sandbox.stub(SecretHelper, 'deleteSecret').resolves()
    })

    it('deletes DB row in tx and schedules vault cleanup after commit', async () => {
      await ConfigMapManager.deleteConfigMap('cfg', $parentTransaction)

      expect(ConfigMapManager.delete).to.have.been.calledBefore(SecretHelper.deleteSecret)
      expect(SecretHelper.deleteSecret).to.have.been.calledOnceWith('cfg', 'configmap')
    })
  })

  describe('registry-service createRegistry', () => {
    beforeEach(() => {
      $sandbox.stub(vaultManager, 'isEnabled').returns(true)
      $sandbox.stub(require('../../../src/schemas'), 'validate').resolves(true)
      $sandbox.stub(require('../../../src/helpers/app-helper'), 'deleteUndefinedFields').callsFake((v) => v)
      $sandbox.stub(RegistryManager, 'create').resolves({ id: 16 })
      $sandbox.stub(SecretHelper, 'encryptSecretInternal').resolves('internal-encrypted')
      $sandbox.stub(SecretHelper, 'encryptSecret').resolves('vault-ref')
      $sandbox.stub(RegistryManager, 'update').resolves()
      $sandbox.stub(require('../../../src/data/managers/iofog-manager'), 'findAll').resolves([])
      $sandbox.stub(require('../../../src/services/change-tracking-service'), 'update').resolves()
      $sandbox.stub(require('../../../src/helpers/transaction-runner'), 'runInTransaction').resolves()
    })

    it('stores internal encryption in tx and promotes to vault after commit', async () => {
      await RegistryService.createRegistry({
        url: 'https://registry.example.com',
        username: 'user',
        password: 'plain-password',
        isPublic: false,
        email: 'user@example.com'
      }, $parentTransaction)

      expect(SecretHelper.encryptSecretInternal).to.have.been.calledOnce
      expect(SecretHelper.encryptSecret).to.not.have.been.called
    })
  })

  describe('registry-manager delete', () => {
    beforeEach(() => {
      $sandbox.stub(vaultManager, 'isEnabled').returns(true)
      $sandbox.stub(RegistryManager, 'findOne').resolves({ id: 16 })
      $sandbox.stub(BaseManager.prototype, 'delete').resolves(1)
      $sandbox.stub(SecretHelper, 'deleteSecret').resolves()
    })

    it('deletes DB row first and schedules vault cleanup after commit', async () => {
      await RegistryManager.delete({ id: 16 }, $parentTransaction)

      expect(BaseManager.prototype.delete).to.have.been.calledBefore(SecretHelper.deleteSecret)
      expect(SecretHelper.deleteSecret).to.have.been.calledOnceWith('registry-16', 'registry')
    })
  })
})

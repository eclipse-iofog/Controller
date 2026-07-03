'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const Transaction = require('sequelize/lib/transaction')

const SecretService = require('../../../src/services/secret-service')
const CertificateService = require('../../../src/services/certificate-service')
const Errors = require('../../../src/helpers/errors')

describe('Plan 19-H transaction safety fixes', () => {
  def('sandbox', () => sinon.createSandbox())
  def('parentTransaction', () => Object.create(Transaction.prototype))

  afterEach(() => {
    $sandbox.restore()
  })

  describe('certificate-service transaction propagation', () => {
    it('passes parent transaction to SecretService.getSecretEndpoint from getCAEndpoint', async () => {
      const CertificateManager = require('../../../src/data/managers/certificate-manager')
      $sandbox.stub(CertificateManager, 'findCertificateByName').resolves({
        name: 'router-local-ca',
        subject: 'router-local-ca',
        isCA: true,
        validFrom: new Date(),
        validTo: new Date(),
        serialNumber: '1',
        isExpired: () => false
      })
      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
        type: 'tls',
        data: {
          'tls.crt': Buffer.from('cert').toString('base64'),
          'tls.key': Buffer.from('key').toString('base64')
        }
      })

      await CertificateService.getCAEndpoint('router-local-ca', $parentTransaction)

      expect(SecretService.getSecretEndpoint).to.have.been.calledOnceWith(
        'router-local-ca',
        $parentTransaction
      )
    })

    it('passes parent transaction through createCAEndpoint SecretService calls', async () => {
      $sandbox.stub(SecretService, 'getSecretEndpoint').rejects(new Errors.NotFoundError('missing'))
      $sandbox.stub(require('../../../src/utils/cert'), 'generateSelfSignedCA').resolves({
        cert: '-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----',
        key: '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----'
      })
      $sandbox.stub(require('../../../src/utils/cert'), 'storeCA').resolves()
      $sandbox.stub(SecretService, 'createSecretEndpoint').resolves({ id: 1, name: 'test-ca' })
      $sandbox.stub(require('../../../src/data/managers/secret-manager'), 'findOne').resolves({ id: 1 })
      $sandbox.stub(require('../../../src/data/managers/certificate-manager'), 'createCertificateRecord').resolves()

      await CertificateService.createCAEndpoint({
        name: 'test-ca',
        subject: 'test-ca',
        expiration: 60,
        type: 'self-signed'
      }, $parentTransaction)

      expect(SecretService.getSecretEndpoint).to.have.been.calledWith('test-ca', $parentTransaction)
    })

    it('passes parent transaction to loadCA from createCAEndpoint direct type', async () => {
      const certUtil = require('../../../src/utils/cert')
      const forge = require('node-forge')

      const keys = forge.pki.rsa.generateKeyPair(2048)
      const caCert = forge.pki.createCertificate()
      caCert.publicKey = keys.publicKey
      caCert.serialNumber = '01'
      caCert.validity.notBefore = new Date()
      caCert.validity.notAfter = new Date(Date.now() + 86400000)
      caCert.setSubject([{ name: 'commonName', value: 'router-site-ca' }])
      caCert.setIssuer([{ name: 'commonName', value: 'router-site-ca' }])
      caCert.sign(keys.privateKey, forge.md.sha256.create())

      const caCertPem = forge.pki.certificateToPem(caCert)
      const caKeyPem = forge.pki.privateKeyToPem(keys.privateKey)

      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({ type: 'tls', data: {} })
      $sandbox.stub(require('../../../src/data/managers/certificate-manager'), 'findCertificateByName').resolves(null)
      $sandbox.stub(certUtil, 'loadCA').resolves({ cert: caCertPem, key: caKeyPem })
      $sandbox.stub(require('../../../src/data/managers/secret-manager'), 'findOne').resolves({ id: 1 })
      $sandbox.stub(require('../../../src/data/managers/certificate-manager'), 'createCertificateRecord').resolves()

      await CertificateService.createCAEndpoint({
        name: 'router-site-ca',
        secretName: 'router-site-ca',
        type: 'direct'
      }, $parentTransaction)

      expect(certUtil.loadCA).to.have.been.calledOnceWith('router-site-ca', $parentTransaction)
    })
  })

  describe('cert.js transaction propagation', () => {
    it('loadCA uses parent transaction without enqueueing runInTransaction', async () => {
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      const SecretManager = require('../../../src/data/managers/secret-manager')
      const { loadCA } = require('../../../src/utils/cert')

      $sandbox.stub(transactionRunner, 'runInTransaction').throws(new Error('should not enqueue'))
      $sandbox.stub(SecretManager, 'getSecret').resolves({
        type: 'tls',
        data: {
          'tls.crt': Buffer.from('cert').toString('base64'),
          'tls.key': Buffer.from('key').toString('base64')
        }
      })

      const result = await loadCA('router-site-ca', $parentTransaction)

      expect(SecretManager.getSecret).to.have.been.calledOnceWith('router-site-ca', $parentTransaction)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
      expect(result).to.include.keys('cert', 'key')
    })

    it('getCAFromK8sSecret uses parent transaction without enqueueing runInTransaction', async () => {
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      const SecretManager = require('../../../src/data/managers/secret-manager')
      const k8sClient = require('../../../src/utils/k8s-client')
      const { getCAFromK8sSecret } = require('../../../src/utils/cert')

      $sandbox.stub(transactionRunner, 'runInTransaction').throws(new Error('should not enqueue'))
      $sandbox.stub(k8sClient, 'getSecret').resolves({
        data: {
          'tls.crt': Buffer.from('cert').toString('base64'),
          'tls.key': Buffer.from('key').toString('base64')
        }
      })
      $sandbox.stub(SecretManager, 'findOne').resolves({ id: 1, name: 'k8s-ca' })

      await getCAFromK8sSecret('k8s-ca', $parentTransaction)

      expect(SecretManager.findOne).to.have.been.calledOnceWith({ name: 'k8s-ca' }, $parentTransaction)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
    })

    it('generateCertificate passes transaction through getCAFromInput loadCA path', async () => {
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      const SecretManager = require('../../../src/data/managers/secret-manager')
      const certUtil = require('../../../src/utils/cert')
      const forge = require('node-forge')

      const keys = forge.pki.rsa.generateKeyPair(2048)
      const caCert = forge.pki.createCertificate()
      caCert.publicKey = keys.publicKey
      caCert.serialNumber = '01'
      caCert.validity.notBefore = new Date()
      caCert.validity.notAfter = new Date(Date.now() + 86400000)
      caCert.setSubject([{ name: 'commonName', value: 'router-site-ca' }])
      caCert.setIssuer([{ name: 'commonName', value: 'router-site-ca' }])
      caCert.sign(keys.privateKey, forge.md.sha256.create())

      const caCertPem = forge.pki.certificateToPem(caCert)
      const caKeyPem = forge.pki.privateKeyToPem(keys.privateKey)

      $sandbox.stub(transactionRunner, 'runInTransaction').throws(new Error('should not enqueue'))
      $sandbox.stub(SecretManager, 'getSecret').resolves({
        type: 'tls',
        data: {
          'tls.crt': Buffer.from(caCertPem).toString('base64'),
          'tls.key': Buffer.from(caKeyPem).toString('base64')
        }
      })
      $sandbox.stub(SecretService, 'createSecretEndpoint').resolves()

      await certUtil.generateCertificate({
        name: 'site-server',
        subject: '/CN=site-server',
        hosts: '127.0.0.1',
        ca: { type: 'direct', secretName: 'router-site-ca' },
        transaction: $parentTransaction
      })

      expect(SecretManager.getSecret).to.have.been.calledOnceWith('router-site-ca', $parentTransaction)
      expect(transactionRunner.runInTransaction).to.not.have.been.called
      expect(SecretService.createSecretEndpoint).to.have.been.calledWith(
        sinon.match.has('name', 'site-server'),
        $parentTransaction
      )
    })
  })
})

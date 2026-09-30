const { expect } = require('chai')
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

const Constants = require('../../../src/helpers/constants')
const ioFogService = require('../../../src/services/iofog-service')
const CertificateService = require('../../../src/services/certificate-service')
const CertificateManager = require('../../../src/data/managers/certificate-manager')
const SecretService = require('../../../src/services/secret-service')
const RouterManager = require('../../../src/data/managers/router-manager')
const MicroserviceExtraHostManager = require('../../../src/data/managers/microservice-extra-host-manager')

describe('iofog greenfield PKI (central local CAs)', () => {
  def('sandbox', () => sinon.createSandbox())
  def('transaction', () => ({}))

  afterEach(() => $sandbox.restore())

  describe('provision source gates', () => {
    it('does not reference per-agent router-local-ca secrets in iofog-service', () => {
      const source = fs.readFileSync(
        path.join(__dirname, '../../../src/services/iofog-service.js'),
        'utf8'
      )
      const matches = source.match(/router-local-ca-\$\{/g) || []
      expect(matches).to.have.lengthOf(0)
      expect(source).to.include('_processDeleteCommand')
      expect(source).to.not.match(/ensureCA\(\s*`router-local-ca-\$\{/)
      expect(source).to.not.match(/createCAEndpoint\([^)]*router-local-ca-\$\{/)
    })

    it('does not create per-agent nats-local-ca in _ensureNatsCertificates', () => {
      const source = fs.readFileSync(
        path.join(__dirname, '../../../src/services/nats-service.js'),
        'utf8'
      )
      const certBlock = source.slice(
        source.indexOf('async function _ensureNatsCertificates'),
        source.indexOf('async function _buildJwtBundle')
      )
      expect(certBlock).to.include('DEFAULT_NATS_LOCAL_CA')
      expect(certBlock).to.not.include('natsLocalCaName(fog)')
      expect(certBlock).to.not.match(/ensureCA\([^)]*nats-local-ca/)
    })
  })

  describe('_handleRouterCertificates()', () => {
    const uuid = 'fog-uuid-abc'
    const fogData = {
      name: 'edge-node-1',
      host: '10.0.0.5',
      ipAddress: '192.168.1.10',
      routerMode: 'client'
    }

    def('subject', () => ioFogService._handleRouterCertificates(fogData, uuid, false, $transaction))

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'findOne').resolves({ iofogUuid: 'other-fog' })
      $sandbox.stub(CertificateService, 'getCAEndpoint').rejects({ name: 'NotFoundError' })
      $sandbox.stub(CertificateService, 'createCAEndpoint').resolves()
      $sandbox.stub(CertificateService, 'getCertificateEndpoint').rejects({ name: 'NotFoundError' })
      $sandbox.stub(CertificateService, 'createCertificateEndpoint').resolves()
    })

    it('ensures central router local CA and signs certs with it', async () => {
      await $subject

      const createCaCalls = CertificateService.createCAEndpoint.getCalls()
      const caNames = createCaCalls.map((call) => call.args[0].name)
      expect(caNames).to.include(Constants.ROUTER_SITE_CA)
      expect(caNames).to.include(Constants.DEFAULT_ROUTER_LOCAL_CA)
      expect(caNames).to.not.include(`router-local-ca-${fogData.name}`)

      const createCertCalls = CertificateService.createCertificateEndpoint.getCalls()
      const signingCaNames = createCertCalls.map((call) => call.args[0].ca.secretName)
      expect(signingCaNames).to.include(Constants.DEFAULT_ROUTER_LOCAL_CA)
      expect(signingCaNames.every((name) => name !== `router-local-ca-${fogData.name}`)).to.equal(true)
    })

    it('creates router-local-server and router-local-agent certs (not per-agent CA)', async () => {
      await $subject

      const certNames = CertificateService.createCertificateEndpoint.getCalls().map((call) => call.args[0].name)
      expect(certNames).to.include.members([
        `router-local-server-${fogData.name}`,
        `router-local-agent-${fogData.name}`,
        `router-site-server-${fogData.name}`
      ])
      expect(certNames).to.not.include(`router-local-ca-${fogData.name}`)
    })

    it('does not recreate default-router-local-ca when operator imported it', async () => {
      CertificateService.getCAEndpoint
        .withArgs(Constants.DEFAULT_ROUTER_LOCAL_CA, $transaction)
        .resolves({ name: Constants.DEFAULT_ROUTER_LOCAL_CA, isCA: true })

      await $subject

      const createCaCalls = CertificateService.createCAEndpoint.getCalls()
      const caNames = createCaCalls.map((call) => call.args[0].name)
      expect(caNames).to.not.include(Constants.DEFAULT_ROUTER_LOCAL_CA)
    })
  })

  describe('certificate reissue', () => {
    const uuid = 'fog-uuid-abc'
    const operatorHost = 'new.example'
    const fogData = {
      name: 'edge-node-1',
      host: operatorHost,
      ipAddress: '10.1.1.1',
      ipAddressExternal: '203.0.113.9',
      routerMode: 'edge'
    }

    beforeEach(() => {
      $sandbox.stub(RouterManager, 'findOne').resolves({ iofogUuid: 'other-fog' })
      $sandbox.stub(CertificateService, 'getCAEndpoint').resolves({ name: 'ca', isCA: true })
      $sandbox.stub(CertificateService, 'createCAEndpoint').resolves()
      $sandbox.stub(CertificateService, 'getCertificateEndpoint').resolves({ hosts: 'old.example' })
      $sandbox.stub(CertificateService, 'deleteCertificateEndpoint').resolves()
      $sandbox.stub(CertificateService, 'createCertificateEndpoint').resolves()
      $sandbox.stub(CertificateService, 'replaceCertificateEndpoint').resolves()
    })

    function replacedHostLists () {
      return CertificateService.replaceCertificateEndpoint.getCalls().map((call) => call.args[0].hosts.split(','))
    }

    it('recreates certificates when stored hosts omit the operator host', async () => {
      const written = await ioFogService._handleRouterCertificates(fogData, uuid, false, $transaction)

      expect(written).to.equal(true)
      expect(CertificateService.deleteCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.replaceCertificateEndpoint).to.have.been.called
      const hostLists = replacedHostLists()
      expect(hostLists.length).to.be.at.least(1)
      hostLists.forEach((hosts) => {
        expect(hosts).to.include(operatorHost)
        expect(hosts).to.not.include('old.example')
        expect(hosts).to.not.include(fogData.ipAddress)
        expect(hosts).to.not.include(fogData.ipAddressExternal)
      })
    })

    it('does not delete certificates when stored hosts already contain the operator host', async () => {
      CertificateService.getCertificateEndpoint.resolves({
        hosts: ` ${operatorHost}, 10.0.0.1 , `
      })

      const written = await ioFogService._handleRouterCertificates({
        ...fogData,
        ipAddressExternal: '198.51.100.20'
      }, uuid, false, $transaction)

      expect(written).to.equal(false)
      expect(CertificateService.deleteCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.replaceCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.createCertificateEndpoint).to.not.have.been.called
    })

    it('does not delete certificates when the stored host list already matches the operator host', async () => {
      CertificateService.getCertificateEndpoint.resolves({
        hosts: [operatorHost, fogData.ipAddress, fogData.ipAddressExternal].join(',')
      })

      const written = await ioFogService._handleRouterCertificates(fogData, uuid, false, $transaction)

      expect(written).to.equal(false)
      expect(CertificateService.deleteCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.replaceCertificateEndpoint).to.not.have.been.called
    })

    it('replaces router certificates when router mode crosses none and keeps them for edge and interior', async () => {
      CertificateService.getCertificateEndpoint.resolves({ hosts: operatorHost })

      const replaced = await ioFogService._handleRouterCertificates(fogData, uuid, true, $transaction)

      expect(replaced).to.equal(true)
      const replacedNames = CertificateService.replaceCertificateEndpoint.getCalls().map((call) => call.args[0].name)
      expect(replacedNames).to.include.members([
        `router-site-server-${fogData.name}`,
        `router-local-server-${fogData.name}`,
        `router-local-agent-${fogData.name}`
      ])

      CertificateService.replaceCertificateEndpoint.resetHistory()
      CertificateService.createCertificateEndpoint.resetHistory()

      const kept = await ioFogService._handleRouterCertificates(fogData, uuid, false, $transaction)

      expect(kept).to.equal(false)
      expect(CertificateService.deleteCertificateEndpoint).to.not.have.been.called
    })

    it('replaces only the local agent certificate when router mode becomes none', async () => {
      CertificateService.getCertificateEndpoint.resolves({ hosts: operatorHost })

      const written = await ioFogService._handleRouterCertificates({
        ...fogData,
        routerMode: 'none'
      }, uuid, true, $transaction)

      expect(written).to.equal(true)
      const replacedNames = CertificateService.replaceCertificateEndpoint.getCalls().map((call) => call.args[0].name)
      expect(replacedNames).to.eql([`router-local-agent-${fogData.name}`])
    })

    it('replaces the operator host without copying fog IP addresses', async () => {
      const written = await ioFogService._handleRouterCertificates({
        ...fogData,
        ipAddress: '10.2.2.2',
        ipAddressExternal: '0.0.0.0'
      }, uuid, false, $transaction)

      expect(written).to.equal(true)
      const siteCall = CertificateService.replaceCertificateEndpoint.getCalls()
        .find((call) => call.args[0].name === `router-site-server-${fogData.name}`)
      const siteHosts = siteCall.args[0].hosts.split(',')
      expect(siteHosts).to.eql([operatorHost])
      expect(siteHosts).to.not.include('10.2.2.2')
      expect(siteHosts).to.not.include('0.0.0.0')
    })
  })

  describe('_reconcileNatsCertificates()', () => {
    const fogData = {
      name: 'edge-node-1',
      host: 'spec.example',
      ipAddress: '10.2.2.2',
      ipAddressExternal: '203.0.113.10'
    }

    beforeEach(() => {
      $sandbox.stub(CertificateService, 'getCAEndpoint').resolves({ name: 'ca', isCA: true })
      $sandbox.stub(CertificateService, 'createCAEndpoint').resolves()
      $sandbox.stub(CertificateService, 'getCertificateEndpoint').resolves({ hosts: 'spec.example' })
      $sandbox.stub(CertificateService, 'deleteCertificateEndpoint').resolves()
      $sandbox.stub(CertificateService, 'createCertificateEndpoint').resolves()
      $sandbox.stub(CertificateService, 'replaceCertificateEndpoint').resolves()
    })

    it('replaces NATS certificates when NATS mode crosses none even if the operator host is listed', async () => {
      const written = await ioFogService._reconcileNatsCertificates(fogData, true, $transaction)

      expect(written).to.equal(true)
      const replacedNames = CertificateService.replaceCertificateEndpoint.getCalls().map((call) => call.args[0].name)
      expect(replacedNames).to.have.members([
        'nats-server-edge-node-1',
        'nats-mqtt-server-edge-node-1'
      ])
    })

    it('does not replace NATS certificates for leaf and server when the operator host is listed', async () => {
      const written = await ioFogService._reconcileNatsCertificates(fogData, false, $transaction)

      expect(written).to.equal(false)
      expect(CertificateService.deleteCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.replaceCertificateEndpoint).to.not.have.been.called
      expect(CertificateService.createCertificateEndpoint).to.not.have.been.called
    })

    it('issues the NATS server certificate from the spec host without fog IP addresses', async () => {
      CertificateService.getCertificateEndpoint.resolves({ hosts: 'row.example' })

      const written = await ioFogService._reconcileNatsCertificates({
        ...fogData,
        host: 'spec.example',
        ipAddress: '10.2.2.2',
        ipAddressExternal: '0.0.0.0'
      }, false, $transaction)

      expect(written).to.equal(true)
      const serverCall = CertificateService.replaceCertificateEndpoint.getCalls()
        .find((call) => call.args[0].name === 'nats-server-edge-node-1')
      const serverHosts = serverCall.args[0].hosts.split(',')
      expect(serverHosts).to.eql(['spec.example'])
      expect(serverHosts).to.not.include('row.example')
      expect(serverHosts).to.not.include('10.2.2.2')
      expect(serverHosts).to.not.include('0.0.0.0')
      expect(serverCall.args[0].expiration).to.equal(60)
    })
  })

  describe('replaceCertificateEndpoint()', () => {
    it('updates the existing tls secret so the linked volume mount version increments', async () => {
      $sandbox.stub(SecretService, 'updateSecretEndpoint').resolves({})
      $sandbox.stub(SecretService, 'createSecretEndpoint').resolves({})
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').resolves({})
      $sandbox.stub(CertificateManager, 'findCertificateByName').resolves({
        id: 4,
        name: 'router-site-server-lima'
      })
      $sandbox.stub(CertificateManager, 'updateCertificate').resolves()

      await CertificateService.replaceCertificateEndpoint({
        name: 'router-site-server-lima',
        subject: 'fog-uuid',
        hosts: '192.168.106.2',
        ca: { type: 'self-signed' }
      }, $transaction)

      expect(SecretService.deleteSecretEndpoint).to.not.have.been.called
      expect(SecretService.createSecretEndpoint).to.not.have.been.called
      expect(SecretService.updateSecretEndpoint).to.have.been.calledOnce
      expect(SecretService.updateSecretEndpoint.firstCall.args[0]).to.equal('router-site-server-lima')
      expect(SecretService.updateSecretEndpoint.firstCall.args[1].type).to.equal('tls')
      expect(CertificateManager.updateCertificate.firstCall.args[1].hosts).to.equal('192.168.106.2')
    })
  })

  describe('_updateMicroserviceExtraHosts()', () => {
    it('updates only rows whose value differs from the operator host', async () => {
      const unchanged = { value: 'spec.example', save: sinon.stub() }
      const stale = {
        value: 'old.example',
        microserviceUuid: 'ms-1',
        save: sinon.stub().resolves()
      }
      $sandbox.stub(MicroserviceExtraHostManager, 'findAll').resolves([unchanged, stale])
      $sandbox.stub(MicroserviceExtraHostManager, 'updateOriginMicroserviceChangeTracking').resolves()

      await ioFogService._updateMicroserviceExtraHosts('fog-1', 'spec.example', $transaction)

      expect(unchanged.save).to.not.have.been.called
      expect(stale.value).to.equal('spec.example')
      expect(stale.save).to.have.been.calledOnce
      expect(MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking)
        .to.have.been.calledOnceWith(stale, $transaction)
    })
  })
})

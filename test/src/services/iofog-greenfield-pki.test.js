const { expect } = require('chai')
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')

const Constants = require('../../../src/helpers/constants')
const ioFogService = require('../../../src/services/iofog-service')
const CertificateService = require('../../../src/services/certificate-service')
const RouterManager = require('../../../src/data/managers/router-manager')

describe('iofog greenfield PKI (central local CAs)', () => {
  def('sandbox', () => sinon.createSandbox())
  def('transaction', () => ({}))

  afterEach(() => $sandbox.restore())

  describe('provision source gates', () => {
    it('does not create per-agent router-local-ca secrets in iofog-service (delete cleanup only)', () => {
      const source = fs.readFileSync(
        path.join(__dirname, '../../../src/services/iofog-service.js'),
        'utf8'
      )
      const matches = source.match(/router-local-ca-\$\{/g) || []
      expect(matches).to.have.lengthOf(1)
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
  })
})

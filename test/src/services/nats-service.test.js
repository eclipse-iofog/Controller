const { expect } = require('chai')
const sinon = require('sinon')

const NatsService = require('../../../src/services/nats-service')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const VolumeMountService = require('../../../src/services/volume-mount-service')
const ConfigMapManager = require('../../../src/data/managers/config-map-manager')
const SecretService = require('../../../src/services/secret-service')

describe('NATS Service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.cleanupNatsForFog()', () => {
    const transaction = {}
    const fog = { uuid: 'fog-1', name: 'local-agent' }
    const natsInstance = { id: 77 }
    const microservices = [{ uuid: 'ms-1' }]

    def('subject', () => NatsService.cleanupNatsForFog(fog, transaction))

    beforeEach(() => {
      $sandbox.stub(NatsInstanceManager, 'findByFog').returns(Promise.resolve(natsInstance))
      $sandbox.stub(NatsAccountManager, 'findOne').returns(Promise.resolve({ id: 1 }))
      $sandbox.stub(NatsUserManager, 'findOne').returns(Promise.resolve({ credsSecretName: 'nats-creds-sys-admin-hub' }))
      $sandbox.stub(NatsConnectionManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(NatsInstanceManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(MicroserviceManager, 'findAll').returns(Promise.resolve(microservices))
      $sandbox.stub(VolumeMappingManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'findVolumeMountedFogNodes').returns(Promise.resolve([]))
      $sandbox.stub(VolumeMountService, 'deleteVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(ConfigMapManager, 'getConfigMap').returns(Promise.resolve({ name: 'cm' }))
      $sandbox.stub(ConfigMapManager, 'deleteConfigMap').returns(Promise.resolve())
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').returns(Promise.resolve())
    })

    it('cleans up instance, mounts, configmaps, and secrets', async () => {
      await $subject

      expect(NatsInstanceManager.findByFog).to.have.been.calledWith(fog.uuid, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ sourceNats: natsInstance.id }, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ destNats: natsInstance.id }, transaction)
      expect(NatsInstanceManager.delete).to.have.been.calledWith({ id: natsInstance.id }, transaction)
      expect(ConfigMapManager.deleteConfigMap).to.have.been.called
      expect(SecretService.deleteSecretEndpoint).to.have.been.called
    })
  })

  describe('single hub server config (no cluster block)', () => {
    it('server-no-cluster.conf template exists and has no cluster block', () => {
      const fs = require('fs')
      const path = require('path')
      const noClusterPath = path.join(__dirname, '../../../src/templates/nats/server-no-cluster.conf')
      const content = fs.readFileSync(noClusterPath, 'utf8')
      expect(content).to.not.include('cluster {')
      expect(content).to.include('port:')
      expect(content).to.include('jetstream')
    })
  })

  describe('K8s NATS ConfigMaps', () => {
    it('uses constants iofog-nats-config and iofog-nats-jwt-bundle for K8s ConfigMap names', () => {
      const K8S_NATS_SERVER_CONFIG_MAP = 'iofog-nats-config'
      const K8S_NATS_JWT_BUNDLE_CONFIG_MAP = 'iofog-nats-jwt-bundle'
      expect(K8S_NATS_SERVER_CONFIG_MAP).to.equal('iofog-nats-config')
      expect(K8S_NATS_JWT_BUNDLE_CONFIG_MAP).to.equal('iofog-nats-jwt-bundle')
    })
  })

  describe('mergeK8sHubClusterRoutes', () => {
    it('preserves operator routes (nats-headless) and appends controller-managed routes', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222'
      ]
      const desiredControllerRoutes = ['nats://40.120.10.10:6222']
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, desiredControllerRoutes)
      expect(result).to.eql([
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222',
        'nats://40.120.10.10:6222'
      ])
    })

    it('keeps only operator routes when desiredControllerRoutes is empty', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222',
        'nats://40.120.10.10:6222'
      ]
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, [])
      expect(result).to.eql([
        'nats://nats-0.nats-headless:6222',
        'nats://nats-1.nats-headless:6222'
      ])
    })

    it('returns only desiredControllerRoutes when currentRoutes has no operator routes', () => {
      const currentRoutes = ['nats://40.120.10.10:6222']
      const desiredControllerRoutes = ['nats://10.0.0.1:6222']
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, desiredControllerRoutes)
      expect(result).to.eql(['nats://10.0.0.1:6222'])
    })

    it('handles empty or null currentRoutes', () => {
      expect(NatsService.mergeK8sHubClusterRoutes([], ['nats://40.120.10.10:6222'])).to.eql(['nats://40.120.10.10:6222'])
      expect(NatsService.mergeK8sHubClusterRoutes(null, ['nats://40.120.10.10:6222'])).to.eql(['nats://40.120.10.10:6222'])
    })

    it('ignores non-string entries in currentRoutes', () => {
      const currentRoutes = [
        'nats://nats-0.nats-headless:6222',
        123,
        null,
        undefined
      ]
      const result = NatsService.mergeK8sHubClusterRoutes(currentRoutes, [])
      expect(result).to.eql(['nats://nats-0.nats-headless:6222'])
    })
  })

  describe('operator JWT fields', () => {
    it('encodeOperator from @nats-io/jwt accepts account_server_url, operator_service_urls, system_account', async () => {
      const { createOperator, encodeOperator } = require('@nats-io/jwt')
      const kp = createOperator()
      const jwt = await encodeOperator('test-op', kp, {
        account_server_url: 'https://hub:4222',
        operator_service_urls: ['https://hub:4222'],
        system_account: 'ACTPUBKEY123'
      })
      expect(jwt).to.be.a('string')
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))
      expect(payload.nats).to.include({ account_server_url: 'https://hub:4222', system_account: 'ACTPUBKEY123' })
      expect(payload.nats.operator_service_urls).to.eql(['https://hub:4222'])
    })
  })
})

const { expect } = require('chai')
const sinon = require('sinon')

const NatsService = require('../../../src/services/nats-service')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsAccountRuleManager = require('../../../src/data/managers/nats-account-rule-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const VolumeMountService = require('../../../src/services/volume-mount-service')
const ConfigMapService = require('../../../src/services/config-map-service')
const ConfigMapManager = require('../../../src/data/managers/config-map-manager')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const SecretService = require('../../../src/services/secret-service')
const Errors = require('../../../src/helpers/errors')

describe('NATS Service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.cleanupNatsForFog()', () => {
    const transaction = {}
    const fog = { uuid: 'fog-1', name: 'local-agent' }
    const natsInstance = { id: 77, isLeaf: true, isHub: false }
    const microservices = [{ uuid: 'ms-1' }]

    def('subject', () => NatsService.cleanupNatsForFogDb(fog, transaction))

    beforeEach(() => {
      $sandbox.stub(NatsInstanceManager, 'findByFog').returns(Promise.resolve(natsInstance))
      $sandbox.stub(NatsInstanceManager, 'findAll').returns(Promise.resolve([]))
      $sandbox.stub(NatsAccountManager, 'findOne').returns(Promise.resolve({ id: 1 }))
      $sandbox.stub(NatsUserManager, 'findOne').returns(Promise.resolve({ credsSecretName: 'nats-creds-sys-admin-hub' }))
      $sandbox.stub(NatsConnectionManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(NatsInstanceManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(MicroserviceManager, 'findAll').returns(Promise.resolve(microservices))
      $sandbox.stub(VolumeMappingManager, 'delete').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(VolumeMountService, 'findVolumeMountedFogNodes').returns(Promise.resolve([]))
      $sandbox.stub(VolumeMountService, 'deleteVolumeMountEndpoint').returns(Promise.resolve())
      $sandbox.stub(ConfigMapService, 'deleteConfigMapEndpoint').returns(Promise.resolve())
      $sandbox.stub(NatsAuthService, 'getLeafSystemArtifactSecretNames').returns(Promise.resolve(null))
      $sandbox.stub(NatsAuthService, 'deleteLeafSystemArtifactsForFog').returns(Promise.resolve())
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').returns(Promise.resolve())
    })

    it('cleans up instance, mounts, configmaps, and secrets', async () => {
      await $subject

      expect(NatsInstanceManager.findByFog).to.have.been.calledWith(fog.uuid, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ sourceNats: natsInstance.id }, transaction)
      expect(NatsConnectionManager.delete).to.have.been.calledWith({ destNats: natsInstance.id }, transaction)
      expect(NatsInstanceManager.delete).to.have.been.calledWith({ id: natsInstance.id }, transaction)
      expect(ConfigMapService.deleteConfigMapEndpoint).to.have.been.called
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

  describe('._ensureConfigMap()', () => {
    const transaction = {}
    const name = 'iofog-nats-jwt-bundle'
    const data = { 'bundle.jwt': 'jwt-content' }

    def('subject', () => NatsService._ensureConfigMap(name, data, transaction))

    beforeEach(() => {
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint')
      $sandbox.stub(ConfigMapService, 'updateConfigMapEndpoint')
    })

    it('creates the ConfigMap when it does not exist', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      ConfigMapService.createConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnceWith({
        name,
        data,
        immutable: false,
        useVault: true
      }, transaction)
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('updates the ConfigMap when content changed', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves({ name, data: { 'bundle.jwt': 'old' } })
      ConfigMapService.updateConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.not.have.been.called
      expect(ConfigMapService.updateConfigMapEndpoint).to.have.been.calledOnceWith(name, { data, immutable: false }, transaction)
    })

    it('skips update when content is unchanged', async () => {
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves({ name, data })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.not.have.been.called
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('reconciles after concurrent create ConflictError', async () => {
      const conflict = new Errors.ConflictError('ConfigMap already exists')
      $sandbox.stub(ConfigMapManager, 'getConfigMap')
        .onFirstCall().resolves(null)
        .onSecondCall().resolves({ name, data })
      ConfigMapService.createConfigMapEndpoint.rejects(conflict)

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnce
      expect(ConfigMapManager.getConfigMap).to.have.been.calledTwice
      expect(ConfigMapService.updateConfigMapEndpoint).to.not.have.been.called
    })

    it('updates after concurrent create when desired content differs', async () => {
      const conflict = new Errors.ConflictError('ConfigMap already exists')
      $sandbox.stub(ConfigMapManager, 'getConfigMap')
        .onFirstCall().resolves(null)
        .onSecondCall().resolves({ name, data: { 'bundle.jwt': 'old' } })
      ConfigMapService.createConfigMapEndpoint.rejects(conflict)
      ConfigMapService.updateConfigMapEndpoint.resolves({ name })

      await $subject

      expect(ConfigMapService.createConfigMapEndpoint).to.have.been.calledOnce
      expect(ConfigMapService.updateConfigMapEndpoint).to.have.been.calledOnceWith(name, { data, immutable: false }, transaction)
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

  describe('K8s I/O outside transactions (R-04–R-06)', () => {
    const k8sClient = require('../../../src/utils/k8s-client')
    const config = require('../../../src/config')

    function loadNatsServiceWithTxStub (runInTransactionImpl) {
      const txRunnerPath = require.resolve('../../../src/helpers/transaction-runner')
      const natsPath = require.resolve('../../../src/services/nats-service')
      delete require.cache[natsPath]
      delete require.cache[txRunnerPath]
      const transactionRunner = require('../../../src/helpers/transaction-runner')
      $sandbox.stub(transactionRunner, 'runInTransaction').callsFake(runInTransactionImpl)
      return require('../../../src/services/nats-service')
    }

    function stubKubernetesControlPlane () {
      $sandbox.stub(config, 'get').callsFake((key, defaultValue) => {
        if (key === 'app.ControlPlane') return 'kubernetes'
        if (key === 'nats.enabled') return false
        return defaultValue
      })
    }

    function stubCleanupDb (NatsServiceFresh, natsInstance) {
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves(natsInstance)
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves([])
      $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1, isSystem: true })
      $sandbox.stub(NatsUserManager, 'findOne').resolves({ credsSecretName: 'nats-creds-sys-admin' })
      $sandbox.stub(NatsConnectionManager, 'delete').resolves()
      $sandbox.stub(NatsInstanceManager, 'delete').resolves()
      $sandbox.stub(NatsAuthService, 'deleteServerSysUserForFog').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(VolumeMappingManager, 'delete').resolves()
      $sandbox.stub(VolumeMountService, 'unlinkVolumeMountEndpoint').resolves()
      $sandbox.stub(VolumeMountService, 'findVolumeMountedFogNodes').resolves([])
      $sandbox.stub(VolumeMountService, 'deleteVolumeMountEndpoint').resolves()
      $sandbox.stub(ConfigMapService, 'deleteConfigMapEndpoint').resolves()
      $sandbox.stub(SecretService, 'deleteSecretEndpoint').resolves()
      return NatsServiceFresh
    }

    it('cleanupNatsForFog applies K8s patch and rollout after runInTransaction', async () => {
      stubKubernetesControlPlane()
      const fog = { uuid: 'fog-1', name: 'local-agent' }
      const natsInstance = { id: 77, isLeaf: false, isHub: false }
      const callOrder = []
      const txLabels = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        callOrder.push('tx-start')
        const result = await fn({})
        callOrder.push('tx-end')
        return result
      })
      stubCleanupDb(NatsServiceFresh, natsInstance)
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async () => {
        callOrder.push('k8s-get')
        return { data: { 'server.conf': 'routes: []' } }
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async () => {
        callOrder.push('k8s-patch')
      })
      $sandbox.stub(k8sClient, 'rolloutStatefulSet').callsFake(async () => {
        callOrder.push('k8s-rollout')
      })

      await NatsServiceFresh.cleanupNatsForFog(fog)

      expect(txLabels).to.deep.equal(['nats.cleanupForFog'])
      expect(callOrder).to.deep.equal(['tx-start', 'tx-end', 'k8s-get', 'k8s-patch', 'k8s-rollout'])
    })

    it('cleanupNatsForFog reuses parent transaction when provided', async () => {
      const fog = { uuid: 'fog-1', name: 'local-agent' }
      const parentTx = {
        commit: $sandbox.stub(),
        rollback: $sandbox.stub(),
        afterCommit: $sandbox.stub()
      }
      const txLabels = []
      const natsInstance = { id: 77, isLeaf: false, isHub: false }

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        return fn({})
      })
      stubCleanupDb(NatsServiceFresh, natsInstance)

      await NatsServiceFresh.cleanupNatsForFog(fog, parentTx)

      expect(txLabels).to.deep.equal([])
      expect(parentTx.afterCommit).to.have.been.calledOnce
    })

    it('ensureNatsForFog uses phased cert-prep, auth-prep, and topology transaction labels', async () => {
      const txLabels = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          txLabels.push(runOptions.label)
        }
        if (runOptions.label === 'nats.ensure.certPrep') {
          return {
            serverCertName: 'nats-server-local-agent',
            mqttCertName: 'nats-mqtt-server-local-agent',
            jetstreamKey: { secretName: 'jsk', jsk: 'key' }
          }
        }
        if (runOptions.label === 'nats.ensure.authPrep') {
          return {
            mode: 'leaf',
            isHub: false,
            isLeaf: true,
            serverPort: 4222,
            leafPort: 7422,
            clusterPort: 6222,
            mqttPort: 1883,
            httpPort: 8222,
            configMapName: 'nats-server-conf-local-agent',
            configKey: 'server.conf',
            template: 'leaf',
            jwtBundleConfigMapName: 'nats-jwt-bundle-local-agent',
            sysCredsSecretName: null
          }
        }
        if (runOptions.label === 'nats.ensure.topology') {
          return { microservice: { uuid: 'ms-1' }, k8sHubPatch: null }
        }
        return fn({})
      })

      await NatsServiceFresh.ensureNatsForFog(
        { uuid: 'fog-1', name: 'local-agent' },
        { mode: 'leaf' }
      )

      expect(txLabels).to.deep.equal(['nats.ensure.certPrep', 'nats.ensure.authPrep', 'nats.ensure.topology'])
    })

    it('reconcileResolverArtifacts applies JWT bundle K8s patch after runInTransaction', async () => {
      stubKubernetesControlPlane()
      const callOrder = []

      const NatsServiceFresh = loadNatsServiceWithTxStub(async (fn) => {
        callOrder.push('tx-start')
        const result = await fn({})
        callOrder.push('tx-end')
        return result
      })

      $sandbox.stub(require('../../../src/data/managers/iofog-manager'), 'findAll').resolves([])
      $sandbox.stub(require('../../../src/data/managers/application-manager'), 'findAll').resolves([])
      $sandbox.stub(NatsInstanceManager, 'findAll').resolves([])
      $sandbox.stub(NatsAccountRuleManager, 'findOne').resolves({ id: 1, name: 'default-account' })
      $sandbox.stub(NatsAccountManager, 'findOne').resolves({ id: 1, isSystem: true })
      $sandbox.stub(require('../../../src/services/nats-auth-service'), 'ensureSystemAccount').resolves()
      $sandbox.stub(ConfigMapManager, 'getConfigMap').resolves(null)
      $sandbox.stub(ConfigMapService, 'createConfigMapEndpoint').resolves({ name: 'iofog-nats-jwt-bundle' })
      $sandbox.stub(k8sClient, 'getConfigMap').callsFake(async () => {
        callOrder.push('k8s-get')
        return null
      })
      $sandbox.stub(k8sClient, 'patchConfigMap').callsFake(async () => {
        callOrder.push('k8s-patch')
      })

      await NatsServiceFresh.reconcileResolverArtifacts({ fogUuids: [] })

      expect(callOrder).to.deep.equal(['tx-start', 'tx-end', 'k8s-get', 'k8s-patch'])
    })
  })
})

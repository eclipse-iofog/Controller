const { expect } = require('chai')
const sinon = require('sinon')

const FogPlatformService = require('../../../src/services/fog-platform-service')
const Constants = require('../../../src/helpers/constants')
const FogManager = require('../../../src/data/managers/iofog-manager')
const FogPlatformSpecManager = require('../../../src/data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const RouterConnectionManager = require('../../../src/data/managers/router-connection-manager')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const IofogService = require('../../../src/services/iofog-service')
const NatsService = require('../../../src/services/nats-service')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')
const RouterService = require('../../../src/services/router-service')
const ServiceBridgeConfig = require('../../../src/services/service-bridge-config')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceService = require('../../../src/services/microservices-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const SecretManager = require('../../../src/data/managers/secret-manager')
const FogPublicKeyManager = require('../../../src/data/managers/iofog-public-key-manager')
const transactionRunner = require('../../../src/helpers/transaction-runner')

describe('Fog platform service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}
  const fogUuid = 'fog-abc'

  afterEach(() => $sandbox.restore())

  function stubPhasedRunInTransaction (sandbox, options = {}) {
    const labels = options.labels || null
    sandbox.stub(transactionRunner, 'runInTransaction').callsFake(async (fn, runOptions = {}) => {
      if (labels && runOptions.label) {
        labels.push(runOptions.label)
      }
      return fn(transaction)
    })
    return labels
  }

  describe('.validateSystemFogInvariants()', () => {
    it('rejects non-interior router mode for system fog', () => {
      try {
        FogPlatformService.validateSystemFogInvariants(
          { isSystem: true },
          { routerMode: 'edge', natsMode: 'server' }
        )
        throw new Error('expected validation to fail')
      } catch (error) {
        expect(error.name).to.equal('ValidationError')
      }
    })
  })

  describe('.reconcileFog()', () => {
    const fog = {
      uuid: fogUuid,
      name: 'edge-a',
      isSystem: false,
      host: '10.0.0.5',
      bluetoothEnabled: false,
      abstractedHardwareEnabled: false,
      containerEngine: 'edgelet',
      tags: []
    }
    const spec = {
      routerMode: 'edge',
      natsMode: 'leaf',
      host: '10.0.0.5',
      messagingPort: 5671,
      containerEngine: 'edgelet',
      bluetoothEnabled: false,
      abstractedHardwareEnabled: false
    }
    const parsedSpec = { fogUuid, generation: 2, spec }
    const router = {
      id: 11,
      iofogUuid: fogUuid,
      isEdge: true,
      host: '10.0.0.5',
      messagingPort: 5671,
      interRouterPort: null,
      edgeRouterPort: null
    }

    beforeEach(() => {
      stubPhasedRunInTransaction($sandbox)
      $sandbox.stub(FogManager, 'findOneWithTags').resolves({ ...fog })
      $sandbox.stub(FogManager, 'findOne').resolves({ ...fog })
      $sandbox.stub(FogManager, 'update').resolves()
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves(parsedSpec)
      $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
        fogUuid,
        observedGeneration: 1,
        phase: 'Pending'
      })
      $sandbox.stub(FogPlatformStatusManager, 'setPhase').resolves()
      $sandbox.stub(RouterManager, 'findOne').callsFake((query) => {
        if (query && query.isDefault) {
          return Promise.resolve({ id: 1, iofogUuid: 'default', isDefault: true })
        }
        return Promise.resolve({ ...router })
      })
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').resolves([])
      $sandbox.stub(NatsInstanceManager, 'findOne').resolves(null)
      $sandbox.stub(NatsInstanceManager, 'findByFog').resolves({ id: 5, isLeaf: true })
      $sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([])
      $sandbox.stub(IofogService, '_handleRouterCertificates').resolves()
      $sandbox.stub(NatsService, 'ensureNatsForFogPhased').resolves({})
      $sandbox.stub(NatsService, 'cleanupNatsForFogPhased').resolves()
      $sandbox.stub(ReconcileOutboxManager, 'enqueueNats').resolves()
      $sandbox.stub(RouterService, 'validateAndReturnUpstreamRouters').resolves([])
      $sandbox.stub(RouterService, 'updateRouter').resolves(router)
      $sandbox.stub(IofogService, '_getRouterMicroserviceConfig').resolves({ bridges: { tcpListeners: {}, tcpConnectors: {} } })
      $sandbox.stub(ServiceBridgeConfig, 'recomputeServiceBridgeConfig').resolves({ bridges: { tcpListeners: {}, tcpConnectors: {} } })
      $sandbox.stub(ChangeTrackingService, 'create').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('skips reconcile when platform phase is Deleting', async () => {
      FogPlatformStatusManager.getParsedStatus.resolves({ fogUuid, phase: 'Deleting', observedGeneration: 1 })

      const result = await FogPlatformService.reconcileFog(fogUuid)

      expect(result).to.eql({ skipped: true, reason: 'deleting' })
      expect(FogPlatformStatusManager.setPhase).to.not.have.been.called
      expect(IofogService._handleRouterCertificates).to.not.have.been.called
    })

    it('runs ordered reconcile steps and marks platform Ready', async () => {
      const result = await FogPlatformService.reconcileFog(fogUuid)

      expect(IofogService._handleRouterCertificates).to.have.been.calledOnce
      expect(NatsService.ensureNatsForFogPhased).to.have.been.calledOnce
      expect(RouterService.updateRouter).to.have.been.calledOnce
      expect(ServiceBridgeConfig.recomputeServiceBridgeConfig).to.have.been.calledOnce
      expect(FogPlatformStatusManager.setPhase).to.have.been.calledWith(
        fogUuid,
        'Ready',
        sinon.match.has('observedGeneration', 2),
        transaction
      )
      expect(FogManager.update).to.have.been.calledWith(
        { uuid: fogUuid },
        { warningMessage: 'HEALTHY' },
        transaction
      )
      expect(result.phase).to.equal('Ready')
    })

    it('is safe to reconcile the same generation twice', async () => {
      await FogPlatformService.reconcileFog(fogUuid)
      await FogPlatformService.reconcileFog(fogUuid)

      expect(RouterService.updateRouter).to.have.been.calledTwice
      expect(ServiceBridgeConfig.recomputeServiceBridgeConfig).to.have.been.calledTwice
    })

    it('uses phased runInTransaction labels from worker call shape (fogUuid only)', async () => {
      const labels = []
      transactionRunner.runInTransaction.callsFake(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          labels.push(runOptions.label)
        }
        return fn(transaction)
      })

      FogPlatformStatusManager.getParsedStatus.resolves({ fogUuid, phase: 'Deleting', observedGeneration: 1 })

      const result = await FogPlatformService.reconcileFog(fogUuid)

      expect(result).to.eql({ skipped: true, reason: 'deleting' })
      expect(labels).to.deep.equal(['fogPlatform.prepare'])
    })

    it('runs cert, nats, platform, and finalize in separate transaction phases', async () => {
      const labels = []
      transactionRunner.runInTransaction.callsFake(async (fn, runOptions = {}) => {
        if (runOptions.label) {
          labels.push(runOptions.label)
        }
        return fn(transaction)
      })

      await FogPlatformService.reconcileFog(fogUuid)

      expect(labels).to.deep.equal([
        'fogPlatform.prepare',
        'fogPlatform.certPrep',
        'fogPlatform.platform',
        'fogPlatform.finalize'
      ])
      expect(NatsService.ensureNatsForFogPhased).to.have.been.calledOnce
      expect(NatsService.ensureNatsForFogPhased).to.have.been.calledWith(
        sinon.match.any,
        sinon.match.any
      )
    })

    it('enqueues NATS resolver work when topology changes', async () => {
      NatsInstanceManager.findByFog
        .onCall(0).resolves(null)
        .onCall(1).resolves({ id: 5, isLeaf: true })

      await FogPlatformService.reconcileFog(fogUuid)

      expect(ReconcileOutboxManager.enqueueNats).to.have.been.calledWithMatch({
        reason: 'cluster-routes-changed',
        fogUuids: [fogUuid]
      }, transaction)
    })

    context('when upstreamRouters is omitted from spec', () => {
      it('passes undefined to validateAndReturnUpstreamRouters on first create', async () => {
        RouterManager.findOne.callsFake((query) => {
          if (query && query.isDefault) {
            return Promise.resolve({ id: 1, iofogUuid: 'default', isDefault: true })
          }
          if (query && query.iofogUuid === fogUuid) {
            return Promise.resolve(null)
          }
          return Promise.resolve(null)
        })
        RouterConnectionManager.findAllWithRouters.resolves([])
        RouterService.validateAndReturnUpstreamRouters.resolves([{ id: 1, iofogUuid: 'default' }])
        $sandbox.stub(RouterService, 'createRouterForFog').resolves({
          id: 99,
          iofogUuid: fogUuid,
          isEdge: true
        })

        await FogPlatformService.reconcileFog(fogUuid)

        expect(RouterService.validateAndReturnUpstreamRouters).to.have.been.calledWith(
          undefined,
          false,
          sinon.match({ id: 1, isDefault: true }),
          transaction
        )
        expect(RouterService.createRouterForFog).to.have.been.calledOnce
        expect(RouterService.updateRouter).to.not.have.been.called
      })

      it('preserves existing upstream connections when spec omits upstreamRouters', async () => {
        const upstreamConnection = {
          dest: { id: 1, iofogUuid: 'default', isDefault: true }
        }
        RouterConnectionManager.findAllWithRouters.resolves([upstreamConnection])
        RouterService.validateAndReturnUpstreamRouters.resolves([{ id: 1, iofogUuid: 'default' }])

        await FogPlatformService.reconcileFog(fogUuid)

        expect(RouterService.validateAndReturnUpstreamRouters).to.have.been.calledWith(
          [Constants.DEFAULT_ROUTER_NAME],
          false,
          sinon.match({ id: 1, isDefault: true }),
          transaction
        )
      })

      it('passes explicit empty upstreamRouters without applying defaults', async () => {
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid,
          generation: 2,
          spec: { ...spec, upstreamRouters: [] }
        })
        RouterConnectionManager.findAllWithRouters.resolves([])

        await FogPlatformService.reconcileFog(fogUuid)

        expect(RouterService.validateAndReturnUpstreamRouters).to.have.been.calledWith(
          [],
          false,
          sinon.match({ id: 1, isDefault: true }),
          transaction
        )
      })
    })
  })

  describe('.markReconcileFailed()', () => {
    beforeEach(() => {
      $sandbox.stub(FogPlatformStatusManager, 'setPhase').resolves()
      $sandbox.stub(FogManager, 'update').resolves()
    })

    it('marks platform Failed and mirrors warningMessage on fog row', async () => {
      const error = new Error('router create failed')

      await FogPlatformService.markReconcileFailed(fogUuid, error, transaction)

      expect(FogPlatformStatusManager.setPhase).to.have.been.calledOnceWith(
        fogUuid,
        'Failed',
        { lastError: 'router create failed' },
        transaction
      )
      expect(FogManager.update).to.have.been.calledOnceWith(
        { uuid: fogUuid },
        { warningMessage: 'Platform reconcile: router create failed' },
        transaction
      )
    })
  })

  describe('.reconcileFogDelete()', () => {
    const fog = { uuid: fogUuid, name: 'edge-a', containerEngine: 'edgelet' }

    beforeEach(() => {
      $sandbox.stub(FogManager, 'findOne').resolves(fog)
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
        fogUuid,
        generation: 1,
        spec: { routerMode: 'edge', natsMode: 'leaf', containerEngine: 'edgelet' }
      })
      $sandbox.stub(IofogService, '_deleteFogRouter').resolves()
      $sandbox.stub(MicroserviceManager, 'findAll').resolves([])
      $sandbox.stub(ApplicationManager, 'delete').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
      $sandbox.stub(SecretManager, 'findOne').resolves(null)
      $sandbox.stub(NatsService, 'cleanupNatsForFog').resolves()
      $sandbox.stub(FogPublicKeyManager, 'findByFogUuid').resolves(null)
      $sandbox.stub(FogManager, 'delete').resolves()
    })

    it('tears down router runtime before deleting fog resources', async () => {
      const result = await FogPlatformService.reconcileFogDelete(fogUuid, transaction)

      expect(IofogService._deleteFogRouter).to.have.been.calledBefore(FogManager.delete)
      expect(FogManager.delete).to.have.been.calledOnceWith({ uuid: fogUuid }, transaction)
      expect(NatsService.cleanupNatsForFog).to.have.been.calledOnceWith(fog, transaction)
      expect(result).to.eql({ fogUuid, deleted: true })
    })
  })
})

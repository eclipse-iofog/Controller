const { expect } = require('chai')
const sinon = require('sinon')

const ioFogManager = require('../../../src/data/managers/iofog-manager')
const ioFogService = require('../../../src/services/iofog-service')
const RouterManager = require('../../../src/data/managers/router-manager')
const RouterConnectionManager = require('../../../src/data/managers/router-connection-manager')
const RouterService = require('../../../src/services/router-service')
const NatsService = require('../../../src/services/nats-service')
const NatsInstanceManager = require('../../../src/data/managers/nats-instance-manager')
const NatsConnectionManager = require('../../../src/data/managers/nats-connection-manager')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const CatalogService = require('../../../src/services/catalog-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceService = require('../../../src/services/microservices-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const SecretManager = require('../../../src/data/managers/secret-manager')
const FogPublicKeyManager = require('../../../src/data/managers/iofog-public-key-manager')
const TagsManager = require('../../../src/data/managers/tags-manager')
const ioFogProvisionKeyManager = require('../../../src/data/managers/iofog-provision-key-manager')
const ioFogVersionCommandManager = require('../../../src/data/managers/iofog-version-command-manager')
const HWInfoManager = require('../../../src/data/managers/hw-info-manager')
const USBInfoManager = require('../../../src/data/managers/usb-info-manager')
const Errors = require('../../../src/helpers/errors')
const config = require('../../../src/config')
const FogPlatformSpecManager = require('../../../src/data/managers/fog-platform-spec-manager')
const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
const ReconcileOutboxManager = require('../../../src/data/managers/reconcile-outbox-manager')

const isCLI = false
const transaction = {}

function buildFogModel (fields = {}) {
  const fog = {
    tags: [],
    name: 'test-fog',
    uuid: 'testUuid',
    archId: 1,
    host: '1.2.3.4',
    isSystem: false,
    routerId: null,
    ...fields
  }
  fog.getRouter = fields.getRouter || (() => Promise.resolve(null))
  fog.getNats = fields.getNats || (() => Promise.resolve(null))
  fog.getVolumeMounts = fields.getVolumeMounts || (() => Promise.resolve([]))
  fog.setTags = fields.setTags || sinon.stub().resolves()
  fog.toJSON = function toJSON () {
    const { getRouter, getNats, getVolumeMounts, setTags, toJSON, ...json } = this
    return json
  }
  return fog
}

function stubFogReadDeps (sandbox) {
  sandbox.stub(NatsInstanceManager, 'findOne').resolves(null)
  sandbox.stub(NatsConnectionManager, 'findAllWithNats').resolves([])
  sandbox.stub(RouterConnectionManager, 'findAllWithRouters').resolves([])
  sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves(null)
  sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves(null)
  const routerFind = sandbox.stub(RouterManager, 'findOne').resolves(null)
  routerFind.withArgs({ isDefault: true }).resolves({
    id: 99,
    isDefault: true,
    iofogUuid: 'default-router'
  })
}

function stubCreateFogDeps (sandbox, { uuid = 'testUuid', existingFogs = [{ uuid: 'existing' }] } = {}) {
  delete process.env.CONTROL_PLANE
  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(AppHelper, 'generateUUID').returns(uuid)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(ioFogManager, 'findAll').resolves(existingFogs)
  sandbox.stub(ioFogManager, 'findOne').resolves(null)
  sandbox.stub(ioFogManager, 'create').callsFake((data) => Promise.resolve(buildFogModel({ ...data, uuid })))
  sandbox.stub(ioFogManager, 'update').resolves()
  sandbox.stub(RouterManager, 'findOne').resolves({ id: 1, isDefault: true })
  sandbox.stub(RouterService, 'validateAndReturnUpstreamRouters').resolves([])
  sandbox.stub(RouterService, 'createRouterForFog').resolves()
  sandbox.stub(RouterService, 'getNetworkRouter').resolves({ id: 2, host: 'localhost', messagingPort: 5671 })
  sandbox.stub(NatsService, 'ensureNatsForFog').resolves()
  sandbox.stub(ChangeTrackingService, 'create').resolves()
  sandbox.stub(ChangeTrackingService, 'update').resolves()
  sandbox.stub(TagsManager, 'findOne').resolves(null)
  sandbox.stub(TagsManager, 'create').callsFake(({ value }) => Promise.resolve({ value }))
  sandbox.stub(ioFogService, '_handleRouterCertificates').resolves()
  sandbox.stub(FogPlatformSpecManager, 'upsertSpec').resolves({ fogUuid: uuid, generation: 1 })
  sandbox.stub(FogPlatformStatusManager, 'ensurePending').resolves()
  sandbox.stub(ReconcileOutboxManager, 'enqueueFogPlatform').resolves()
}

function stubUpdateFogDeps (sandbox, oldFog) {
  delete process.env.CONTROL_PLANE
  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(ioFogManager, 'findOne').resolves(oldFog)
  sandbox.stub(ioFogManager, 'update').resolves()
  sandbox.stub(RouterConnectionManager, 'findAllWithRouters').resolves([])
  sandbox.stub(RouterManager, 'findOne').resolves({ id: 1, isDefault: true })
  sandbox.stub(RouterService, 'validateAndReturnUpstreamRouters').resolves([])
  sandbox.stub(RouterService, 'createRouterForFog').resolves()
  sandbox.stub(RouterService, 'updateRouter').resolves()
  sandbox.stub(RouterService, 'getNetworkRouter').resolves({ id: 2, host: 'localhost' })
  sandbox.stub(NatsService, 'ensureNatsForFog').resolves()
  sandbox.stub(NatsService, 'cleanupNatsForFog').resolves()
  sandbox.stub(ChangeTrackingService, 'update').resolves()
  sandbox.stub(TagsManager, 'findOne').resolves(null)
  sandbox.stub(TagsManager, 'create').callsFake(({ value }) => Promise.resolve({ value }))
  sandbox.stub(ioFogService, '_handleRouterCertificates').resolves()
  sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves(null)
  sandbox.stub(FogPlatformSpecManager, 'upsertSpec').resolves({ fogUuid: oldFog.uuid, generation: 2 })
  sandbox.stub(FogPlatformStatusManager, 'ensurePending').resolves()
  sandbox.stub(ReconcileOutboxManager, 'enqueueFogPlatform').resolves()
}

describe('ioFog Service', () => {
  def('subject', () => ioFogService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    delete process.env.CONTROL_PLANE
    $sandbox.restore()
  })

  describe('.createFogEndPoint()', () => {
    const uuid = 'testUuid'
    const fogData = {
      name: 'testName',
      host: '1.2.3.4',
      archId: 1,
      containerEngineUrl: 'unix:///var/run/docker.sock',
      pruningFrequency: 10,
      availableDiskThreshold: 20,
      logLevel: 'INFO',
      routerMode: 'edge',
      abstractedHardwareEnabled: false,
      bluetoothEnabled: false
    }

    def('subject', () => $subject.createFogEndPoint(fogData, isCLI, transaction))

    beforeEach(() => {
      stubCreateFogDeps($sandbox, { uuid })
    })

    it('validates input', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogCreate)
    })

    it('creates the fog and returns uuid immediately', async () => {
      const result = await $subject
      expect(result).to.eql({ uuid })
      expect(ioFogManager.create).to.have.been.calledOnce
      const createPayload = ioFogManager.create.firstCall.args[0]
      expect(createPayload).to.include({
        name: fogData.name,
        containerEngineUrl: fogData.containerEngineUrl,
        pruningFrequency: fogData.pruningFrequency
      })
    })

    it('upserts platform spec, status, and enqueues reconcile task', async () => {
      await $subject
      expect(FogPlatformSpecManager.upsertSpec).to.have.been.calledOnce
      expect(FogPlatformSpecManager.upsertSpec.firstCall.args[0]).to.equal(uuid)
      expect(FogPlatformSpecManager.upsertSpec.firstCall.args[1]).to.include({
        routerMode: 'edge',
        natsMode: 'leaf'
      })
      expect(FogPlatformStatusManager.ensurePending).to.have.been.calledWith(uuid, transaction)
      expect(ReconcileOutboxManager.enqueueFogPlatform).to.have.been.calledWith({
        fogUuid: uuid,
        reason: 'spec-changed',
        specGeneration: 1
      }, transaction)
    })

    it('does not run platform orchestration on the synchronous path', async () => {
      await $subject
      expect(RouterService.createRouterForFog).to.not.have.been.called
      expect(NatsService.ensureNatsForFog).to.not.have.been.called
    })

    it('does not run HAL/Bluetooth catalog work on the synchronous path', async () => {
      $sandbox.stub(CatalogService, 'getHalCatalogItem').resolves({ id: 1 })
      $sandbox.stub(CatalogService, 'getBluetoothCatalogItem').resolves({ id: 2 })
      await $subject
      expect(CatalogService.getHalCatalogItem).to.not.have.been.called
      expect(CatalogService.getBluetoothCatalogItem).to.not.have.been.called
    })

    context('when validation fails', () => {
      const validationError = new Error('validation failed')

      beforeEach(() => {
        Validator.validate.restore()
        $sandbox.stub(Validator, 'validate').rejects(validationError)
      })

      it('rejects', () => expect($subject).to.be.rejectedWith(validationError))
    })

    context('when name already exists', () => {
      beforeEach(() => {
        ioFogManager.findOne.withArgs({ name: fogData.name }).resolves({ uuid: 'other' })
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })

    context('when routerMode is none', () => {
      beforeEach(() => {
        fogData.routerMode = 'none'
        fogData.networkRouter = 'default-router'
      })

      afterEach(() => {
        fogData.routerMode = 'edge'
        delete fogData.networkRouter
      })

      it('resolves network router and stores routerId', async () => {
        await $subject
        expect(RouterService.getNetworkRouter).to.have.been.calledWith('default-router')
        const createPayload = ioFogManager.create.firstCall.args[0]
        expect(createPayload.routerId).to.equal(2)
      })

      context('when network router is missing', () => {
        beforeEach(() => {
          RouterService.getNetworkRouter.resolves(null)
        })

        it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
      })
    })

    context('when routerMode is edge', () => {
      it('validates upstream routers for router creation', async () => {
        await $subject
        expect(RouterService.validateAndReturnUpstreamRouters).to.have.been.called
      })
    })
  })

  describe('.updateFogEndPoint()', () => {
    const uuid = 'testUuid'
    const router = {
      id: 1,
      isEdge: true,
      messagingPort: 5671,
      host: '1.2.3.4',
      iofogUuid: uuid
    }
    const oldFog = buildFogModel({
      uuid,
      name: 'immutable-name',
      host: '1.2.3.4',
      isSystem: false,
      getRouter: () => Promise.resolve(router)
    })
    const fogData = {
      uuid,
      location: 'updated-location',
      host: '5.6.7.8',
      archId: 1,
      containerEngineUrl: 'unix:///var/run/docker.sock',
      pruningFrequency: 90,
      routerMode: 'edge'
    }

    def('subject', () => $subject.updateFogEndPoint(fogData, isCLI, transaction))

    beforeEach(() => {
      stubUpdateFogDeps($sandbox, oldFog)
    })

    it('validates input', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogUpdate)
    })

    it('updates fog fields and returns uuid immediately', async () => {
      const result = await $subject
      expect(result).to.eql({ uuid })
      expect(ioFogManager.update).to.have.been.calledWith({ uuid }, sinon.match.has('location', 'updated-location'), transaction)
      expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.config, transaction)
    })

    it('merges platform spec and enqueues reconcile task', async () => {
      await $subject
      expect(FogPlatformSpecManager.upsertSpec).to.have.been.calledOnce
      expect(FogPlatformStatusManager.ensurePending).to.have.been.calledWith(uuid, transaction)
      expect(ReconcileOutboxManager.enqueueFogPlatform).to.have.been.calledWith({
        fogUuid: uuid,
        reason: 'spec-changed',
        specGeneration: 2
      }, transaction)
    })

    it('does not run platform orchestration on the synchronous path', async () => {
      await $subject
      expect(RouterService.createRouterForFog).to.not.have.been.called
      expect(RouterService.updateRouter).to.not.have.been.called
      expect(NatsService.ensureNatsForFog).to.not.have.been.called
    })

    it('rejects rename attempts', () => {
      const renamed = { ...fogData, name: 'new-name' }
      return expect(ioFogService.updateFogEndPoint(renamed, isCLI, transaction))
        .to.be.rejectedWith('Agent Resource Name is immutable')
    })

    context('when fog is not found', () => {
      beforeEach(() => {
        ioFogManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })

    context('when validation fails', () => {
      const validationError = new Error('validation failed')

      beforeEach(() => {
        Validator.validate.restore()
        $sandbox.stub(Validator, 'validate').rejects(validationError)
      })

      it('rejects', () => expect($subject).to.be.rejectedWith(validationError))
    })

    context('when system fog is redeployed with full platform config', () => {
      const systemFog = buildFogModel({
        uuid,
        name: 'controlplane',
        host: '10.0.0.1',
        isSystem: true,
        getRouter: () => Promise.resolve({
          id: 1,
          isEdge: false,
          messagingPort: 5671,
          interRouterPort: 55671,
          edgeRouterPort: 45671,
          host: '10.0.0.1',
          iofogUuid: uuid
        }),
        getNats: () => Promise.resolve({ isLeaf: false })
      })

      beforeEach(() => {
        ioFogManager.findOne.resolves(systemFog)
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid: uuid,
          generation: 1,
          spec: {
            routerMode: 'interior',
            natsMode: 'server',
            host: '10.0.0.1'
          }
        })
      })

      it('accepts potctl redeploy PATCH without Invalid NATS mode undefined', async () => {
        const redeployData = {
          uuid,
          isSystem: true,
          natsMode: 'server',
          routerMode: 'interior',
          host: '10.0.0.1',
          interRouterPort: 55671,
          edgeRouterPort: 45671
        }
        const result = await ioFogService.updateFogEndPoint(redeployData, isCLI, transaction)
        expect(result).to.eql({ uuid })
      })
    })

    context('when PATCH only updates networkInterface', () => {
      beforeEach(() => {
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid: uuid,
          generation: 3,
          spec: {
            routerMode: 'edge',
            natsMode: 'leaf',
            host: '1.2.3.4'
          }
        })
      })

      it('preserves platform modes in merged spec', async () => {
        await ioFogService.updateFogEndPoint({ uuid, networkInterface: 'eth1' }, isCLI, transaction)
        const mergedSpec = FogPlatformSpecManager.upsertSpec.firstCall.args[1]
        expect(mergedSpec.routerMode).to.equal('edge')
        expect(mergedSpec.natsMode).to.equal('leaf')
        expect(mergedSpec.host).to.equal('1.2.3.4')
      })
    })
  })

  describe('.deleteFogEndPoint()', () => {
    const uuid = 'testUuid'
    const fogData = { uuid }
    const fog = buildFogModel({ uuid, name: 'test-fog' })

    def('subject', () => $subject.deleteFogEndPoint(fogData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOne').resolves(fog)
      $sandbox.stub(ioFogManager, 'delete').resolves()
      $sandbox.stub(NatsService, 'cleanupNatsForFog').resolves()
      $sandbox.stub(FogPlatformStatusManager, 'setPhase').resolves()
      $sandbox.stub(ReconcileOutboxManager, 'enqueueFogPlatform').resolves()
    })

    it('marks fog deleting and enqueues async teardown', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogDelete)
      expect(result).to.eql({ uuid })
      expect(FogPlatformStatusManager.setPhase).to.have.been.calledWith(uuid, 'Deleting', {}, transaction)
      expect(ReconcileOutboxManager.enqueueFogPlatform).to.have.been.calledWith({
        fogUuid: uuid,
        reason: 'delete'
      }, transaction)
      expect(ioFogManager.delete).to.not.have.been.called
      expect(NatsService.cleanupNatsForFog).to.not.have.been.called
    })

    context('when fog is missing', () => {
      beforeEach(() => {
        ioFogManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.reconcileFogEndpoint()', () => {
    const uuid = 'testUuid'
    const fogData = { uuid }
    const fog = buildFogModel({ uuid, name: 'test-fog' })

    def('subject', () => $subject.reconcileFogEndpoint(fogData, transaction))

    beforeEach(() => {
      $sandbox.stub(ioFogManager, 'findOne').resolves(fog)
      $sandbox.stub(FogPlatformStatusManager, 'getParsedStatus').resolves({
        phase: 'Failed',
        lastError: 'router create failed'
      })
      $sandbox.stub(FogPlatformStatusManager, 'setPhase').resolves()
      $sandbox.stub(FogPlatformSpecManager, 'getParsedSpec').resolves({
        generation: 4,
        spec: { routerMode: 'edge', natsMode: 'leaf' }
      })
      $sandbox.stub(ReconcileOutboxManager, 'enqueueFogPlatform').resolves()
    })

    it('resets failed platform status and enqueues manual retry', async () => {
      const result = await $subject

      expect(FogPlatformStatusManager.setPhase).to.have.been.calledWith(
        uuid,
        'Pending',
        { lastError: null },
        transaction
      )
      expect(ReconcileOutboxManager.enqueueFogPlatform).to.have.been.calledWith({
        fogUuid: uuid,
        reason: 'manual-retry',
        specGeneration: 4
      }, transaction)
      expect(result).to.eql({ uuid })
    })

    context('when fog is missing', () => {
      beforeEach(() => {
        ioFogManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.getFog()', () => {
    const uuid = 'testUuid'
    const fogData = { uuid }
    const baseFog = buildFogModel({
      uuid,
      name: 'testName',
      location: 'testLocation',
      containerEngineUrl: 'testContainerEngineUrl',
      archId: 1,
      routerMode: 'none'
    })

    def('subject', () => $subject.getFog(fogData, isCLI, transaction))

    beforeEach(() => {
      stubFogReadDeps($sandbox)
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOneWithTags').resolves(baseFog)
    })

    it('validates and returns enriched fog data', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogGet)
      expect(result.uuid).to.equal(uuid)
      expect(result.name).to.equal('testName')
      expect(result.routerMode).to.equal('none')
      expect(result.natsMode).to.equal('none')
      expect(result.tags).to.eql([])
      expect(result.volumeMounts).to.eql([])
      expect(result).to.have.property('platformStatus', null)
    })

    context('when platform status exists', () => {
      const lastTransitionAt = new Date('2026-06-24T12:00:00.000Z')

      beforeEach(() => {
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid: uuid,
          generation: 3,
          spec: { routerMode: 'edge', natsMode: 'leaf' }
        })
        FogPlatformStatusManager.getParsedStatus.resolves({
          fogUuid: uuid,
          observedGeneration: 2,
          phase: 'Pending',
          lastError: null,
          lastTransitionAt,
          conditions: [{ type: 'RouterReady', status: 'False', reason: 'ReconcileComplete' }]
        })
      })

      it('includes platformStatus on GET single fog', async () => {
        const result = await $subject
        expect(result.platformStatus).to.eql({
          generation: 3,
          observedGeneration: 2,
          phase: 'Pending',
          lastError: null,
          lastTransitionAt,
          conditions: [{ type: 'RouterReady', status: 'False', reason: 'ReconcileComplete' }]
        })
      })
    })

    context('when runtime rows are missing but spec has desired modes', () => {
      beforeEach(() => {
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid: uuid,
          generation: 1,
          spec: {
            routerMode: 'interior',
            natsMode: 'server',
            messagingPort: 5671,
            interRouterPort: 55671,
            edgeRouterPort: 45671,
            natsServerPort: 4222,
            natsClusterPort: 6222,
            natsMqttPort: 1883,
            natsHttpPort: 8222,
            upstreamRouters: ['upstream-router'],
            upstreamNatsServers: ['upstream-nats']
          }
        })
      })

      it('returns spec-derived modes instead of none', async () => {
        const result = await $subject
        expect(result.routerMode).to.equal('interior')
        expect(result.messagingPort).to.equal(5671)
        expect(result.interRouterPort).to.equal(55671)
        expect(result.edgeRouterPort).to.equal(45671)
        expect(result.upstreamRouters).to.eql(['upstream-router'])
        expect(result.natsMode).to.equal('server')
        expect(result.natsServerPort).to.equal(4222)
        expect(result.natsClusterPort).to.equal(6222)
        expect(result.upstreamNatsServers).to.eql(['upstream-nats'])
      })
    })

    context('when fog has an edge router', () => {
      const router = { id: 42, isEdge: true, messagingPort: 1234 }

      beforeEach(() => {
        ioFogManager.findOneWithTags.resolves(buildFogModel({
          ...baseFog,
          getRouter: () => Promise.resolve(router)
        }))
      })

      it('includes router config', async () => {
        const result = await $subject
        expect(result.routerMode).to.equal('edge')
        expect(result.messagingPort).to.equal(1234)
        expect(result.upstreamRouters).to.eql([])
      })
    })

    context('when fog is not found', () => {
      beforeEach(() => {
        ioFogManager.findOneWithTags.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.getFogListEndPoint()', () => {
    const filters = []
    const fog = buildFogModel({ uuid: 'testUuid', name: 'testName', archId: 1 })

    def('subject', () => $subject.getFogListEndPoint(filters, isCLI, transaction))

    beforeEach(() => {
      stubFogReadDeps($sandbox)
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findAllWithTags').resolves([fog])
    })

    it('returns enriched fog list', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(filters, Validator.schemas.iofogFilters)
      expect(result.fogs).to.have.length(1)
      expect(result.fogs[0]).to.include({ uuid: 'testUuid', routerMode: 'none', natsMode: 'none' })
      expect(result.fogs[0]).to.not.have.property('platformStatus')
    })

    context('when runtime rows are missing but spec has desired modes', () => {
      beforeEach(() => {
        FogPlatformSpecManager.getParsedSpec.resolves({
          fogUuid: 'testUuid',
          generation: 1,
          spec: {
            routerMode: 'edge',
            natsMode: 'leaf',
            messagingPort: 5671,
            natsLeafPort: 7422
          }
        })
      })

      it('returns spec-derived modes and omits platformStatus', async () => {
        const result = await $subject
        expect(result.fogs[0].routerMode).to.equal('edge')
        expect(result.fogs[0].messagingPort).to.equal(5671)
        expect(result.fogs[0].natsMode).to.equal('leaf')
        expect(result.fogs[0].natsLeafPort).to.equal(7422)
        expect(result.fogs[0]).to.not.have.property('platformStatus')
      })
    })
  })

  describe('.generateProvisioningKeyEndPoint()', () => {
    const uuid = 'testUuid'
    const fogData = { uuid }
    const provisionKey = 'provision-key'
    const expirationTime = 155555555 + (20 * 60 * 1000)

    def('subject', () => $subject.generateProvisioningKeyEndPoint(fogData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(AppHelper, 'generateUUID').returns(provisionKey)
      $sandbox.stub(ioFogManager, 'findOne').resolves({ uuid })
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').callsFake((_where, payload) => Promise.resolve({
        provisionKey: payload.provisionKey,
        expirationTime: payload.expirationTime
      }))
      $sandbox.stub(Date.prototype, 'getTime').returns(155555555)
    })

    it('creates a provisioning key', async () => {
      const result = await $subject
      expect(result).to.eql({ key: provisionKey, expirationTime, caCert: '' })
      expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledOnce
    })

    context('when listener TLS intermediate cert is configured via TLS_PATH_*', () => {
      const fs = require('fs')
      const path = require('path')
      const certDir = path.join(__dirname, '../../tls-cert')

      beforeEach(() => {
        const originalGetBoolean = config.getBoolean.bind(config)
        $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
          if (key === 'server.devMode') {
            return false
          }
          return originalGetBoolean(key, defaultValue)
        })

        process.env.TLS_PATH_KEY = path.join(certDir, 'tls.key')
        process.env.TLS_PATH_CERT = path.join(certDir, 'tls.crt')
        process.env.TLS_PATH_INTERMEDIATE_CERT = path.join(certDir, 'ca.crt')
      })

      afterEach(() => {
        delete process.env.TLS_PATH_KEY
        delete process.env.TLS_PATH_CERT
        delete process.env.TLS_PATH_INTERMEDIATE_CERT
      })

      it('returns base64-encoded caCert for Edgelet trust store', async () => {
        const expectedCaCert = fs.readFileSync(path.join(certDir, 'ca.crt')).toString('base64')
        const result = await $subject
        expect(result.caCert).to.equal(expectedCaCert)
      })
    })

    context('when listener TLS intermediate cert is configured via TLS_BASE64_*', () => {
      const fs = require('fs')
      const path = require('path')
      const certDir = path.join(__dirname, '../../tls-cert')

      beforeEach(() => {
        const originalGetBoolean = config.getBoolean.bind(config)
        $sandbox.stub(config, 'getBoolean').callsFake((key, defaultValue = false) => {
          if (key === 'server.devMode') {
            return false
          }
          return originalGetBoolean(key, defaultValue)
        })

        const toBase64 = (fileName) => fs.readFileSync(path.join(certDir, fileName)).toString('base64')
        process.env.TLS_BASE64_KEY = toBase64('tls.key')
        process.env.TLS_BASE64_CERT = toBase64('tls.crt')
        process.env.TLS_BASE64_INTERMEDIATE_CERT = toBase64('ca.crt')
      })

      afterEach(() => {
        delete process.env.TLS_BASE64_KEY
        delete process.env.TLS_BASE64_CERT
        delete process.env.TLS_BASE64_INTERMEDIATE_CERT
      })

      it('returns base64-encoded caCert regardless of TLS config encoding', async () => {
        const expectedCaCert = fs.readFileSync(path.join(certDir, 'ca.crt')).toString('base64')
        const result = await $subject
        expect(result.caCert).to.equal(expectedCaCert)
      })
    })

    context('when fog is missing', () => {
      beforeEach(() => {
        ioFogManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })

  describe('.setFogVersionCommandEndPoint()', () => {
    const uuid = 'testUuid'

    def('fogVersionData', () => ({ uuid, versionCommand: 'upgrade' }))
    def('subject', () => $subject.setFogVersionCommandEndPoint($fogVersionData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOne').resolves({
        uuid,
        isReadyToUpgrade: true,
        isReadyToRollback: true
      })
      $sandbox.stub(AppHelper, 'generateUUID').returns('provision-key')
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').resolves({
        provisionKey: 'provision-key',
        expirationTime: 155555555
      })
      $sandbox.stub(Date.prototype, 'getTime').returns(155555555)
      $sandbox.stub(ioFogVersionCommandManager, 'updateOrCreate').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('stores version command after provisioning key refresh', async () => {
      await $subject
      expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledOnce
      expect(ioFogVersionCommandManager.updateOrCreate).to.have.been.calledWith(
        { iofogUuid: uuid },
        { iofogUuid: uuid, versionCommand: 'upgrade', semver: null },
        transaction
      )
      expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.version, transaction)
    })

    context('when semver is provided', () => {
      def('fogVersionData', () => ({ uuid, versionCommand: 'upgrade', semver: '3.2.0' }))

      it('stores semver with version command', async () => {
        await $subject
        expect(ioFogVersionCommandManager.updateOrCreate).to.have.been.calledWith(
          { iofogUuid: uuid },
          { iofogUuid: uuid, versionCommand: 'upgrade', semver: '3.2.0' },
          transaction
        )
      })
    })

    context('when upgrade is not allowed', () => {
      beforeEach(() => {
        ioFogManager.findOne.resolves({ uuid, isReadyToUpgrade: false, isReadyToRollback: true })
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })
  })

  describe('.setFogRebootCommandEndPoint()', () => {
    const uuid = 'testUuid'
    const fogData = { uuid }

    def('subject', () => $subject.setFogRebootCommandEndPoint(fogData, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOne').resolves({ uuid })
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
    })

    it('queues reboot change tracking', async () => {
      await $subject
      expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.reboot, transaction)
    })
  })

  describe('.getHalHardwareInfoEndPoint()', () => {
    const uuidObj = { uuid: 'testUuid' }
    const hwInfo = { cpu: 'arm64' }

    def('subject', () => $subject.getHalHardwareInfoEndPoint(uuidObj, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOne').resolves({ uuid: uuidObj.uuid })
      $sandbox.stub(HWInfoManager, 'findOne').resolves(hwInfo)
    })

    it('returns HAL hardware info', async () => {
      const result = await $subject
      expect(result).to.equal(hwInfo)
      expect(HWInfoManager.findOne).to.have.been.calledWith({ iofogUuid: uuidObj.uuid }, transaction)
    })
  })

  describe('.getHalUsbInfoEndPoint()', () => {
    const uuidObj = { uuid: 'testUuid' }
    const usbInfo = { devices: [] }

    def('subject', () => $subject.getHalUsbInfoEndPoint(uuidObj, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ioFogManager, 'findOne').resolves({ uuid: uuidObj.uuid })
      $sandbox.stub(USBInfoManager, 'findOne').resolves(usbInfo)
    })

    it('returns HAL USB info', async () => {
      const result = await $subject
      expect(result).to.equal(usbInfo)
      expect(USBInfoManager.findOne).to.have.been.calledWith({ iofogUuid: uuidObj.uuid }, transaction)
    })
  })
})

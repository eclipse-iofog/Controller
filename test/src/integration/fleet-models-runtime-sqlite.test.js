'use strict'

/**
 * Fleet models, RuntimeClass, and registry gates — sqlite integration paths.
 *
 * Skipped in default `npm test` unless RUN_INTEGRATION=1 (full DB migrate + init).
 *
 *   RUN_INTEGRATION=1 npm run test:integration:fleet-models
 */

describe('fleet models and runtime sqlite integration', function () {
  this.timeout(60000)

  let harness
  let runTx
  let systemFog
  let testCounter = 0

  function uniqueSuffix () {
    testCounter += 1
    return `${Date.now()}-${testCounter}`
  }

  before(function () {
    if (process.env.RUN_INTEGRATION !== '1') {
      this.skip()
    }
  })

  before(async function () {
    const {
      createFirstFogSqliteHarness,
      driveReconcileUntilReady
    } = require('../../support/first-fog-sqlite-harness')

    harness = await createFirstFogSqliteHarness()

    const { runInTransaction, PRIORITY_INTERACTIVE } = require('../../../src/helpers/transaction-runner')
    runTx = (fn, label) => runInTransaction(fn, {
      priority: PRIORITY_INTERACTIVE,
      label: label || 'integration.fleetModelsRuntime'
    })

    systemFog = await createSystemFog('shared')

    const FogPlatformStatusManager = require('../../../src/data/managers/fog-platform-status-manager')
    const { drainOnce } = require('../../../src/jobs/reconcile-outbox-drainer-job')
    const PlatformReconcileWorkerJob = require('../../../src/jobs/platform-reconcile-worker-job')
    await driveReconcileUntilReady(systemFog.uuid, {
      drainOnce,
      processNextFogTask: PlatformReconcileWorkerJob.processNextFogTask,
      getStatus: (uuid) => FogPlatformStatusManager.getParsedStatus(uuid)
    })
  })

  after(async function () {
    if (harness) {
      await harness.teardown()
    }
  })

  async function createSystemFog (suffix) {
    return runTx(
      (transaction) => require('../../../src/services/iofog-service').createFogEndPoint({
        name: `hub-fleet-${suffix}`,
        host: '127.0.0.1',
        archId: 1,
        containerEngine: 'edgelet'
      }, false, transaction),
      'integration.createSystemFog'
    )
  }

  async function createEdgeFog (suffix) {
    return runTx(
      (transaction) => require('../../../src/services/iofog-service').createFogEndPoint({
        name: `edge-fleet-${suffix}`,
        host: '127.0.0.1',
        archId: 1,
        containerEngine: 'edgelet',
        routerMode: 'edge',
        natsMode: 'leaf',
        upstreamRouters: [systemFog.uuid]
      }, false, transaction),
      'integration.createEdgeFog'
    )
  }

  async function createDockerFog (suffix) {
    return runTx(
      (transaction) => require('../../../src/services/iofog-service').createFogEndPoint({
        name: `docker-fleet-${suffix}`,
        host: '127.0.0.1',
        archId: 1,
        containerEngine: 'docker',
        routerMode: 'edge',
        natsMode: 'leaf',
        upstreamRouters: [systemFog.uuid]
      }, false, transaction),
      'integration.createDockerFog'
    )
  }

  async function loadFog (uuid) {
    const FogManager = require('../../../src/data/managers/iofog-manager')
    return runTx((transaction) => FogManager.findOne({ uuid }, transaction), 'integration.loadFog')
  }

  it('returns linked models on agent GET after model create and fog link', async function () {
    const { expect } = require('chai')
    const ModelService = require('../../../src/services/model-service')
    const AgentService = require('../../../src/services/agent-service')

    const suffix = uniqueSuffix()
    const modelName = `test-model-${suffix}`
    const edgeFog = await createEdgeFog(suffix)

    await runTx(
      (transaction) => ModelService.createModelEndpoint({
        name: modelName,
        repo: 'org/repo',
        registryId: 3,
        files: ['file.gguf'],
        format: 'gguf'
      }, transaction),
      'integration.createModel'
    )

    await runTx(
      (transaction) => ModelService.linkModelEndpoint(modelName, [edgeFog.uuid], transaction),
      'integration.linkModel'
    )

    const fog = await loadFog(edgeFog.uuid)
    const models = await runTx(
      (transaction) => AgentService.getAgentLinkedModels(fog, transaction),
      'integration.agentModels'
    )

    expect(models).to.have.length(1)
    expect(models[0]).to.include({
      name: modelName,
      repo: 'org/repo',
      registryId: 3,
      format: 'gguf'
    })
    expect(models[0].files).to.eql(['file.gguf'])
  })

  it('returns linked runtime class on agent GET after link on edgelet fog', async function () {
    const { expect } = require('chai')
    const RuntimeClassService = require('../../../src/services/runtime-class-service')
    const AgentService = require('../../../src/services/agent-service')

    const suffix = uniqueSuffix()
    const edgeFog = await createEdgeFog(suffix)
    const className = `spin-${suffix}`

    await runTx(
      (transaction) => RuntimeClassService.createRuntimeClassEndpoint({
        name: className,
        handler: 'spin'
      }, transaction),
      'integration.createRuntimeClass'
    )

    await runTx(
      (transaction) => RuntimeClassService.linkRuntimeClassEndpoint(className, [edgeFog.uuid], transaction),
      'integration.linkRuntimeClass'
    )

    const fog = await loadFog(edgeFog.uuid)
    const runtimeClasses = await runTx(
      (transaction) => AgentService.getAgentLinkedRuntimeClasses(fog, transaction),
      'integration.agentRuntimeClasses'
    )

    expect(runtimeClasses).to.eql([{ name: className, handler: 'spin' }])
  })

  it('refuses runtime class link on docker fog with validation error', async function () {
    const { expect } = require('chai')
    const RuntimeClassService = require('../../../src/services/runtime-class-service')
    const Errors = require('../../../src/helpers/errors')

    const suffix = uniqueSuffix()
    const dockerFog = await createDockerFog(suffix)
    const className = `spin-docker-${suffix}`

    await runTx(
      (transaction) => RuntimeClassService.createRuntimeClassEndpoint({
        name: className,
        handler: 'spin'
      }, transaction),
      'integration.createRuntimeClassDocker'
    )

    await expect(runTx(
      (transaction) => RuntimeClassService.linkRuntimeClassEndpoint(className, [dockerFog.uuid], transaction),
      'integration.linkRuntimeClassDocker'
    )).to.be.rejectedWith(Errors.ValidationError, /edgelet/)
  })

  it('sets microserviceModels change flag and rebuild on catalog PATCH', async function () {
    const { expect } = require('chai')
    const ApplicationService = require('../../../src/services/application-service')
    const MicroserviceService = require('../../../src/services/microservices-service')
    const ModelService = require('../../../src/services/model-service')
    const AgentService = require('../../../src/services/agent-service')
    const MicroserviceManager = require('../../../src/data/managers/microservice-manager')

    const suffix = uniqueSuffix()
    const edgeFog = await createEdgeFog(suffix)
    const modelName = `catalog-model-${suffix}`
    const appName = `fleet-catalog-app-${suffix}`

    await runTx(
      (transaction) => ModelService.createModelEndpoint({
        name: modelName,
        repo: 'org/repo',
        registryId: 3,
        files: ['weights.gguf']
      }, transaction),
      'integration.createCatalogModel'
    )

    await runTx(
      (transaction) => ApplicationService.createApplicationEndPoint({
        name: appName,
        description: 'catalog patch integration'
      }, false, transaction),
      'integration.createCatalogApp'
    )

    const microservice = await runTx(
      (transaction) => MicroserviceService.createMicroserviceEndPoint({
        name: `catalog-ms-${suffix}`,
        application: appName,
        iofogUuid: edgeFog.uuid,
        images: [{ containerImage: 'demo:latest', archId: 1 }],
        registryId: 1
      }, false, transaction),
      'integration.createCatalogMs'
    )

    await runTx(
      (transaction) => MicroserviceService.updateMicroserviceCatalogEndPoint(microservice.uuid, {
        bindPath: '/models',
        permissions: 'ro',
        items: [{ name: modelName }]
      }, false, transaction),
      'integration.patchCatalog'
    )

    const updated = await runTx(
      (transaction) => MicroserviceManager.findOne({ uuid: microservice.uuid }, transaction),
      'integration.loadCatalogMs'
    )
    expect(updated.rebuild).to.equal(true)

    const MicroserviceModelManager = require('../../../src/data/managers/microservice-model-manager')
    const MicroserviceModelItemManager = require('../../../src/data/managers/microservice-model-item-manager')
    const catalogRow = await runTx(
      (transaction) => MicroserviceModelManager.findOne({ microserviceUuid: microservice.uuid }, transaction),
      'integration.loadCatalogRow'
    )
    const catalogItems = await runTx(
      (transaction) => MicroserviceModelItemManager.findAll({ microserviceUuid: microservice.uuid }, transaction),
      'integration.loadCatalogItems'
    )
    expect(catalogRow.bindPath).to.equal('/models')
    expect(catalogItems.map((item) => item.name)).to.eql([modelName])

    const fog = await loadFog(edgeFog.uuid)
    const changes = await runTx(
      (transaction) => AgentService.getAgentConfigChanges(fog, transaction),
      'integration.catalogChanges'
    )
    expect(changes.microserviceList).to.equal(true)
  })

  it('auto-links model and runtime class rows when microservice deploy references them', async function () {
    const { expect } = require('chai')
    const ApplicationService = require('../../../src/services/application-service')
    const MicroserviceService = require('../../../src/services/microservices-service')
    const ModelService = require('../../../src/services/model-service')
    const RuntimeClassService = require('../../../src/services/runtime-class-service')
    const FogManager = require('../../../src/data/managers/iofog-manager')

    const suffix = uniqueSuffix()
    const className = `spin-${suffix}`
    const modelName = `deploy-model-${suffix}`
    const appName = `fleet-deploy-app-${suffix}`
    const edgeFog = await createEdgeFog(suffix)

    await runTx(
      (transaction) => FogManager.update(
        { uuid: edgeFog.uuid },
        { availableRuntimes: JSON.stringify([className]) },
        transaction
      ),
      'integration.setAvailableRuntimes'
    )

    await runTx(
      (transaction) => ModelService.createModelEndpoint({
        name: modelName,
        repo: 'org/repo',
        registryId: 3,
        files: ['weights.gguf']
      }, transaction),
      'integration.createDeployModel'
    )

    await runTx(
      (transaction) => RuntimeClassService.createRuntimeClassEndpoint({
        name: className,
        handler: 'spin'
      }, transaction),
      'integration.createDeployRuntimeClass'
    )

    await runTx(
      (transaction) => ApplicationService.createApplicationEndPoint({
        name: appName,
        description: 'deploy auto-link integration'
      }, false, transaction),
      'integration.createDeployApp'
    )

    await runTx(
      (transaction) => MicroserviceService.createMicroserviceEndPoint({
        name: `deploy-ms-${suffix}`,
        application: appName,
        iofogUuid: edgeFog.uuid,
        images: [{ containerImage: 'demo:latest', archId: 1 }],
        registryId: 1,
        runtime: className,
        models: {
          bindPath: '/models',
          permissions: 'ro',
          items: [{ name: modelName }]
        }
      }, false, transaction),
      'integration.createDeployMs'
    )

    const fog = await loadFog(edgeFog.uuid)
    const linkedModels = await runTx(
      (transaction) => fog.getModels({ transaction }),
      'integration.loadModelLinks'
    )
    const linkedRuntimeClasses = await runTx(
      (transaction) => fog.getRuntimeClassLinks({ transaction }),
      'integration.loadRuntimeLinks'
    )

    expect(linkedModels).to.have.length(1)
    expect(linkedModels[0].name).to.equal(modelName)
    expect(linkedRuntimeClasses).to.have.length(1)
    expect(linkedRuntimeClasses[0].name).to.equal(className)
  })

  it('rejects Hugging Face registry for microservice images', async function () {
    const { expect } = require('chai')
    const ApplicationService = require('../../../src/services/application-service')
    const MicroserviceService = require('../../../src/services/microservices-service')
    const AppHelper = require('../../../src/helpers/app-helper')
    const ErrorMessages = require('../../../src/helpers/error-messages')

    const suffix = uniqueSuffix()
    const appName = `fleet-registry-app-${suffix}`
    const edgeFog = await createEdgeFog(suffix)

    await runTx(
      (transaction) => ApplicationService.createApplicationEndPoint({
        name: appName,
        description: 'registry gate integration'
      }, false, transaction),
      'integration.createRegistryApp'
    )

    await expect(runTx(
      (transaction) => MicroserviceService.createMicroserviceEndPoint({
        name: `registry-ms-${suffix}`,
        application: appName,
        iofogUuid: edgeFog.uuid,
        images: [{ containerImage: 'demo:latest', archId: 1 }],
        registryId: 3
      }, false, transaction),
      'integration.createRegistryMs'
    )).to.be.rejectedWith(AppHelper.formatMessage(ErrorMessages.REGISTRY_NOT_OCI_FOR_IMAGE, 3))
  })

  it('persists modelStatus from agent PUT and returns parseable JSON on user GET', async function () {
    const { expect } = require('chai')
    const AgentService = require('../../../src/services/agent-service')
    const IofogService = require('../../../src/services/iofog-service')

    const modelStatusPayload = [{ name: 'test-model', state: 'ready' }]
    const modelStatusJson = JSON.stringify(modelStatusPayload)

    await runTx(
      (transaction) => AgentService.updateAgentStatus({
        daemonStatus: 'RUNNING',
        warningMessage: '',
        daemonOperatingDuration: 1,
        daemonLastStart: 1,
        memoryUsage: 1,
        diskUsage: 1,
        cpuUsage: 1,
        memoryViolation: false,
        diskViolation: false,
        cpuViolation: false,
        systemAvailableDisk: 1,
        systemAvailableMemory: 1,
        systemTotalCpu: 1,
        repositoryCount: 0,
        repositoryStatus: '[]',
        systemTime: 1,
        lastStatusTime: 1,
        ipAddress: '127.0.0.1',
        ipAddressExternal: '127.0.0.1',
        lastCommandTime: 1,
        tunnelStatus: '{}',
        version: '1.1.0',
        isReadyToUpgrade: false,
        isReadyToRollback: false,
        gpsStatus: 'OK',
        microserviceStatus: '[]',
        modelStatus: modelStatusJson,
        activeModels: 1,
        modelLastUpdate: 1710000000
      }, { uuid: systemFog.uuid }, transaction),
      'integration.agentStatusModel'
    )

    const fog = await runTx(
      (transaction) => IofogService.getFogEndPoint({ uuid: systemFog.uuid }, false, transaction),
      'integration.userGetFog'
    )

    expect(fog.modelStatus).to.equal(modelStatusJson)
    expect(fog.activeModels).to.equal(1)
    expect(fog.modelLastUpdate).to.equal(1710000000)
    expect(JSON.parse(fog.modelStatus)).to.eql(modelStatusPayload)
  })
})

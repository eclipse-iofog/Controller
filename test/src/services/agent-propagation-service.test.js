'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const Op = require('sequelize').Op

const AgentPropagationService = require('../../../src/services/agent-propagation-service')
const config = require('../../../src/config')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const FogManager = require('../../../src/data/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')

describe('agent-propagation-service', () => {
  const sandbox = sinon.createSandbox()
  const transaction = {}

  afterEach(() => {
    sandbox.restore()
  })

  it('runs actions in mandatory order', async () => {
    const calls = []
    sandbox.stub(MicroserviceManager, 'update').callsFake(async (where, data) => {
      calls.push({ where, data })
    })
    sandbox.stub(MicroserviceManager, 'findDistinctFogUuids').resolves(['fog-a'])
    sandbox.stub(FogManager, 'findUuidsAfterCursor').resolves(['fog-a'])
    sandbox.stub(ChangeTrackingService, 'update').callsFake(async (fogUuid, event) => {
      calls.push({ fogUuid, event })
    })

    await AgentPropagationService.propagateAgentChangeTracking({
      scope: 'catalog',
      reason: 'registry_id_updated',
      catalogItemId: 5,
      registryId: 2,
      actions: [
        'notify_registries',
        'rebuild',
        'propagate_registry_id',
        'notify_microservices'
      ]
    }, transaction)

    expect(calls[0].data).to.deep.equal({ registryId: 2 })
    expect(calls[1].data).to.deep.equal({ rebuild: true })
    expect(calls[2].event).to.equal(ChangeTrackingService.events.microserviceCommon)
    expect(calls[3].event).to.equal(ChangeTrackingService.events.registries)
  })

  it('returns incomplete when notify_registries has more fogs than batch size', async () => {
    sandbox.stub(MicroserviceManager, 'update').resolves()
    sandbox.stub(FogManager, 'findUuidsAfterCursor')
      .onFirstCall().resolves(['fog-a', 'fog-b'])
      .onSecondCall().resolves(['fog-c'])
    sandbox.stub(ChangeTrackingService, 'update').resolves()

    const payload = {
      scope: 'registry',
      reason: 'created',
      actions: ['notify_registries'],
      progress: { batchSize: 2 }
    }

    const first = await AgentPropagationService.propagateAgentChangeTracking(payload, transaction)
    expect(first.complete).to.equal(false)
    expect(first.nextPayload.progress).to.deep.equal({
      action: 'notify_registries',
      mode: 'all_fogs',
      cursor: 'fog-b',
      batchSize: 2
    })

    const second = await AgentPropagationService.propagateAgentChangeTracking(first.nextPayload, transaction)
    expect(second.complete).to.equal(true)
    expect(ChangeTrackingService.update).to.have.callCount(3)
  })

  it('resumes notify_microservices from cursor', async () => {
    sandbox.stub(MicroserviceManager, 'update').resolves()
    sandbox.stub(MicroserviceManager, 'findDistinctFogUuids').resolves(['fog-a', 'fog-b', 'fog-c'])
    sandbox.stub(ChangeTrackingService, 'update').resolves()

    const payload = {
      scope: 'registry',
      reason: 'updated',
      registryId: 4,
      actions: ['rebuild', 'notify_microservices'],
      progress: {
        action: 'notify_microservices',
        mode: 'fog_list',
        cursor: 'fog-a',
        batchSize: 1
      }
    }

    const result = await AgentPropagationService.propagateAgentChangeTracking(payload, transaction)
    expect(result.complete).to.equal(false)
    expect(ChangeTrackingService.update).to.have.been.calledOnceWith(
      'fog-b',
      ChangeTrackingService.events.microserviceCommon,
      transaction
    )
    expect(result.nextPayload.progress.cursor).to.equal('fog-b')
  })

  it('excludes delete:true microservices from rebuild updates', async () => {
    sandbox.stub(MicroserviceManager, 'update').resolves()

    await AgentPropagationService.propagateAgentChangeTracking({
      scope: 'registry',
      reason: 'updated',
      registryId: 8,
      actions: ['rebuild']
    }, transaction)

    expect(MicroserviceManager.update).to.have.been.calledOnceWith(
      { registryId: 8, delete: false },
      { rebuild: true },
      transaction
    )
  })

  it('excludes custom-image and delete:true microservices from catalog image rebuild', async () => {
    sandbox.stub(CatalogItemImageManager, 'findCustomImageMicroserviceUuids').resolves(['ms-custom'])
    sandbox.stub(MicroserviceManager, 'update').resolves()
    sandbox.stub(MicroserviceManager, 'findDistinctFogUuids').resolves([])

    await AgentPropagationService.propagateAgentChangeTracking({
      scope: 'catalog',
      reason: 'images_updated',
      catalogItemId: 3,
      actions: ['rebuild', 'notify_microservices']
    }, transaction)

    const rebuildWhere = MicroserviceManager.update.getCall(0).args[0]
    expect(rebuildWhere.catalogItemId).to.equal(3)
    expect(rebuildWhere.delete).to.equal(false)
    expect(rebuildWhere.uuid).to.deep.equal({ [Op.notIn]: ['ms-custom'] })

    const notifyWhere = MicroserviceManager.findDistinctFogUuids.getCall(0).args[0]
    expect(notifyWhere.catalogItemId).to.equal(3)
    expect(notifyWhere.delete).to.equal(false)
    expect(notifyWhere.uuid).to.deep.equal({ [Op.notIn]: ['ms-custom'] })
    expect(notifyWhere.iofogUuid).to.deep.equal({ [Op.ne]: null })
  })

  it('reads agentPropagationFogNotifyBatchSize from config when progress has no batchSize', async () => {
    sandbox.stub(config, 'get').withArgs('settings.agentPropagationFogNotifyBatchSize', 100).returns(100)
    sandbox.stub(MicroserviceManager, 'update').resolves()
    const allFogs = Array.from({ length: 500 }, (_, i) => `fog-${String(i).padStart(4, '0')}`)
    sandbox.stub(FogManager, 'findUuidsAfterCursor').callsFake(async (cursor, limit) => {
      const remaining = cursor ? allFogs.filter((uuid) => uuid > cursor) : allFogs
      return remaining.slice(0, limit)
    })
    sandbox.stub(ChangeTrackingService, 'update').resolves()

    let payload = {
      scope: 'registry',
      reason: 'created',
      actions: ['notify_registries']
    }

    const first = await AgentPropagationService.propagateAgentChangeTracking(payload, transaction)
    expect(first.complete).to.equal(false)
    expect(first.nextPayload.progress.batchSize).to.equal(100)
    expect(first.nextPayload.progress.cursor).to.equal('fog-0099')
    expect(ChangeTrackingService.update).to.have.callCount(100)

    let tickCount = 1
    payload = first.nextPayload
    while (true) {
      const result = await AgentPropagationService.propagateAgentChangeTracking(payload, transaction)
      tickCount += 1
      if (result.complete) {
        break
      }
      payload = result.nextPayload
      expect(result.nextPayload.processedAt).to.be.undefined
    }

    expect(tickCount).to.equal(6)
    expect(ChangeTrackingService.update).to.have.callCount(500)
  })

  it('does not rebuild microservices with per-MS catalog image overrides on catalog image change', async () => {
    sandbox.stub(CatalogItemImageManager, 'findCustomImageMicroserviceUuids').resolves(['ms-custom'])
    sandbox.stub(MicroserviceManager, 'update').resolves()

    await AgentPropagationService.propagateAgentChangeTracking({
      scope: 'catalog',
      reason: 'images_updated',
      catalogItemId: 12,
      actions: ['rebuild']
    }, transaction)

    expect(CatalogItemImageManager.findCustomImageMicroserviceUuids).to.have.been.calledOnceWith(transaction)
    expect(MicroserviceManager.update).to.have.been.calledOnceWith(
      {
        catalogItemId: 12,
        delete: false,
        uuid: { [Op.notIn]: ['ms-custom'] }
      },
      { rebuild: true },
      transaction
    )
  })
})

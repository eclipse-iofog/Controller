const Op = require('sequelize').Op

const config = require('../config')
const MicroserviceManager = require('../data/managers/microservice-manager')
const CatalogItemImageManager = require('../data/managers/catalog-item-image-manager')
const FogManager = require('../data/managers/iofog-manager')
const ChangeTrackingService = require('./change-tracking-service')

const DEFAULT_FOG_NOTIFY_BATCH_SIZE = 100

const ACTION_PROPAGATE_REGISTRY_ID = 'propagate_registry_id'
const ACTION_REBUILD = 'rebuild'
const ACTION_NOTIFY_MICROSERVICES = 'notify_microservices'
const ACTION_NOTIFY_REGISTRIES = 'notify_registries'

const EXECUTION_ORDER = [
  ACTION_PROPAGATE_REGISTRY_ID,
  ACTION_REBUILD,
  ACTION_NOTIFY_MICROSERVICES,
  ACTION_NOTIFY_REGISTRIES
]

function getBatchSize (payload) {
  if (payload.progress?.batchSize != null) {
    return payload.progress.batchSize
  }
  return config.get('settings.agentPropagationFogNotifyBatchSize', DEFAULT_FOG_NOTIFY_BATCH_SIZE)
}

async function catalogImageMicroserviceWhere (catalogItemId, excludeCustomImages, transaction) {
  const where = { catalogItemId, delete: false }
  if (excludeCustomImages) {
    const excludeUuids = await CatalogItemImageManager.findCustomImageMicroserviceUuids(transaction)
    if (excludeUuids.length > 0) {
      where.uuid = { [Op.notIn]: excludeUuids }
    }
  }
  return where
}

function registryMicroserviceWhere (registryId) {
  return { registryId, delete: false, iofogUuid: { [Op.ne]: null } }
}

async function propagateRegistryId (payload, transaction) {
  await MicroserviceManager.update(
    { catalogItemId: payload.catalogItemId, delete: false },
    { registryId: payload.registryId },
    transaction
  )
}

async function rebuildMicroservices (payload, transaction) {
  if (payload.scope === 'catalog') {
    const excludeCustomImages = payload.reason === 'images_updated'
    const where = excludeCustomImages
      ? await catalogImageMicroserviceWhere(payload.catalogItemId, true, transaction)
      : { catalogItemId: payload.catalogItemId, delete: false }
    await MicroserviceManager.update(where, { rebuild: true }, transaction)
    return
  }

  if (payload.scope === 'registry') {
    await MicroserviceManager.update(
      { registryId: payload.registryId, delete: false },
      { rebuild: true },
      transaction
    )
  }
}

async function findDistinctFogUuids (where, transaction) {
  return MicroserviceManager.findDistinctFogUuids(where, transaction)
}

async function findAllFogUuidsAfterCursor (cursor, limit, transaction) {
  return FogManager.findUuidsAfterCursor(cursor, limit, transaction)
}

async function notifyFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.registries, transaction)
  }
}

async function notifyMicroserviceFogs (fogUuids, transaction) {
  for (const fogUuid of fogUuids) {
    await ChangeTrackingService.update(fogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

function fogUuidsAfterCursor (fogUuids, cursor) {
  if (!cursor) {
    return fogUuids
  }
  const startIndex = fogUuids.findIndex((uuid) => uuid > cursor)
  return startIndex === -1 ? [] : fogUuids.slice(startIndex)
}

async function processFogBatch (payload, action, fogUuids, transaction) {
  const batchSize = getBatchSize(payload)
  const cursor = payload.progress?.action === action ? payload.progress.cursor : undefined
  const remaining = fogUuidsAfterCursor(fogUuids, cursor)
  const batch = remaining.slice(0, batchSize)

  if (action === ACTION_NOTIFY_MICROSERVICES) {
    await notifyMicroserviceFogs(batch, transaction)
  } else {
    await notifyFogs(batch, transaction)
  }

  if (batch.length < remaining.length) {
    const nextPayload = {
      ...payload,
      progress: {
        action,
        mode: action === ACTION_NOTIFY_REGISTRIES ? 'all_fogs' : 'fog_list',
        cursor: batch[batch.length - 1],
        batchSize
      }
    }
    return { complete: false, nextPayload }
  }

  const { progress, ...rest } = payload
  return { complete: true, nextPayload: rest }
}

async function processAllFogsBatch (payload, action, transaction) {
  const batchSize = getBatchSize(payload)
  const cursor = payload.progress?.action === action ? payload.progress.cursor : undefined
  const batch = await findAllFogUuidsAfterCursor(cursor, batchSize, transaction)

  if (action === ACTION_NOTIFY_MICROSERVICES) {
    await notifyMicroserviceFogs(batch, transaction)
  } else {
    await notifyFogs(batch, transaction)
  }

  if (batch.length === batchSize) {
    const nextPayload = {
      ...payload,
      progress: {
        action,
        mode: 'all_fogs',
        cursor: batch[batch.length - 1],
        batchSize
      }
    }
    return { complete: false, nextPayload }
  }

  const { progress, ...rest } = payload
  return { complete: true, nextPayload: rest }
}

async function runNotifyMicroservices (payload, transaction) {
  const excludeCustomImages = payload.scope === 'catalog' && payload.reason === 'images_updated'
  let where
  if (payload.scope === 'catalog') {
    where = await catalogImageMicroserviceWhere(payload.catalogItemId, excludeCustomImages, transaction)
    where.iofogUuid = { [Op.ne]: null }
  } else {
    where = registryMicroserviceWhere(payload.registryId)
  }

  const fogUuids = await findDistinctFogUuids(where, transaction)
  if (fogUuids.length <= getBatchSize(payload)) {
    await notifyMicroserviceFogs(fogUuids, transaction)
    const { progress, ...rest } = payload
    return { complete: true, nextPayload: rest }
  }

  return processFogBatch(payload, ACTION_NOTIFY_MICROSERVICES, fogUuids, transaction)
}

async function runNotifyRegistries (payload, transaction) {
  return processAllFogsBatch(payload, ACTION_NOTIFY_REGISTRIES, transaction)
}

async function runAction (action, payload, transaction) {
  switch (action) {
    case ACTION_PROPAGATE_REGISTRY_ID:
      await propagateRegistryId(payload, transaction)
      return { complete: true, nextPayload: payload }
    case ACTION_REBUILD:
      await rebuildMicroservices(payload, transaction)
      return { complete: true, nextPayload: payload }
    case ACTION_NOTIFY_MICROSERVICES:
      return runNotifyMicroservices(payload, transaction)
    case ACTION_NOTIFY_REGISTRIES:
      return runNotifyRegistries(payload, transaction)
    default:
      throw new Error(`Unknown agent propagation action: ${action}`)
  }
}

function orderedActions (payload) {
  const requested = new Set(payload.actions || [])
  return EXECUTION_ORDER.filter((action) => requested.has(action))
}

function resumeActionIndex (payload, actions) {
  const inProgress = payload.progress?.action
  if (!inProgress) {
    return 0
  }
  const index = actions.indexOf(inProgress)
  return index === -1 ? 0 : index
}

async function propagateAgentChangeTracking (payload, transaction) {
  const actions = orderedActions(payload)
  let currentPayload = payload

  for (let i = resumeActionIndex(currentPayload, actions); i < actions.length; i += 1) {
    const result = await runAction(actions[i], currentPayload, transaction)
    currentPayload = result.nextPayload

    if (!result.complete) {
      return { complete: false, nextPayload: currentPayload }
    }
  }

  return { complete: true }
}

module.exports = {
  propagateAgentChangeTracking,
  DEFAULT_FOG_NOTIFY_BATCH_SIZE,
  ACTION_PROPAGATE_REGISTRY_ID,
  ACTION_REBUILD,
  ACTION_NOTIFY_MICROSERVICES,
  ACTION_NOTIFY_REGISTRIES
}

const crypto = require('crypto')

function stableHash (value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)
}

function buildFogPlatformIdempotencyKey (payload = {}) {
  const { fogUuid, reason, specGeneration } = payload
  return `fp:${fogUuid}:${reason}:${specGeneration != null ? specGeneration : 'null'}`
}

function buildServicePlatformIdempotencyKey (payload = {}) {
  const { serviceName, reason, specSnapshot } = payload
  const snapshotPart = specSnapshot != null ? stableHash(specSnapshot) : 'null'
  return `sp:${serviceName}:${reason}:${snapshotPart}`
}

function buildNatsIdempotencyKey (payload = {}) {
  const {
    reason,
    applicationId,
    accountRuleId,
    userRuleId,
    fogUuids,
    microserviceUuid,
    mutationKind,
    authGeneration
  } = payload

  const scopeSuffix = [
    applicationId ?? 'null',
    accountRuleId ?? 'null',
    userRuleId ?? 'null',
    microserviceUuid ?? 'null',
    mutationKind ?? 'null',
    authGeneration ?? 'null'
  ].join(':')

  if (Array.isArray(fogUuids) && fogUuids.length > 0) {
    const sorted = [...fogUuids].sort().join(',')
    return `nats:${reason}:${scopeSuffix}:${sorted}`
  }

  return `nats:${reason}:${scopeSuffix}`
}

function buildIdempotencyKey (kind, payload = {}) {
  switch (kind) {
    case 'fog_platform':
      return buildFogPlatformIdempotencyKey(payload)
    case 'service_platform':
      return buildServicePlatformIdempotencyKey(payload)
    case 'nats':
      return buildNatsIdempotencyKey(payload)
    default:
      throw new Error(`Unknown reconcile outbox kind: ${kind}`)
  }
}

module.exports = {
  stableHash,
  buildFogPlatformIdempotencyKey,
  buildServicePlatformIdempotencyKey,
  buildNatsIdempotencyKey,
  buildIdempotencyKey
}

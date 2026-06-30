const { expect } = require('chai')
const crypto = require('crypto')
const {
  buildFogPlatformIdempotencyKey,
  buildServicePlatformIdempotencyKey,
  buildNatsIdempotencyKey,
  buildIdempotencyKey
} = require('../../../src/helpers/reconcile-outbox-keys')

describe('reconcile-outbox-keys', () => {
  it('builds stable fog platform keys', () => {
    const key = buildFogPlatformIdempotencyKey({
      fogUuid: 'fog-1',
      reason: 'spec-changed',
      specGeneration: 3
    })
    expect(key).to.equal('fp:fog-1:spec-changed:3')
  })

  it('builds service platform keys with snapshot hash', () => {
    const snapshot = { name: 'svc-a', resource: '10m' }
    const key = buildServicePlatformIdempotencyKey({
      serviceName: 'svc-a',
      reason: 'spec-changed',
      specSnapshot: snapshot
    })
    const expectedHash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 16)
    expect(key).to.equal(`sp:svc-a:spec-changed:${expectedHash}`)
  })

  it('builds nats keys with sorted fog uuids', () => {
    const key = buildNatsIdempotencyKey({
      reason: 'cluster-routes-changed',
      applicationId: null,
      accountRuleId: null,
      userRuleId: null,
      fogUuids: ['b', 'a']
    })
    expect(key).to.equal('nats:cluster-routes-changed:null:null:null:a,b')
  })

  it('builds nats keys without fog uuids from scope fields', () => {
    const key = buildNatsIdempotencyKey({
      reason: 'account-created',
      applicationId: 42,
      accountRuleId: null,
      userRuleId: null
    })
    expect(key).to.equal('nats:account-created:42:null:null')
  })

  it('routes buildIdempotencyKey by kind', () => {
    expect(buildIdempotencyKey('fog_platform', { fogUuid: 'x', reason: 'delete' }))
      .to.equal('fp:x:delete:null')
  })
})

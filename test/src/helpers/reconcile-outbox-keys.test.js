const { expect } = require('chai')
const crypto = require('crypto')
const {
  buildFogPlatformIdempotencyKey,
  buildServicePlatformIdempotencyKey,
  buildNatsIdempotencyKey,
  buildAgentPropagationIdempotencyKey,
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
    expect(key).to.equal('nats:cluster-routes-changed:null:null:null:null:null:null:a,b')
  })

  it('builds nats keys without fog uuids from scope fields', () => {
    const key = buildNatsIdempotencyKey({
      reason: 'account-created',
      applicationId: 42,
      accountRuleId: null,
      userRuleId: null
    })
    expect(key).to.equal('nats:account-created:42:null:null:null:null:null')
  })

  it('distinguishes distinct mutations via microserviceUuid and mutationKind', () => {
    const enableKey = buildNatsIdempotencyKey({
      reason: 'account-created',
      applicationId: 42,
      microserviceUuid: 'ms-a',
      mutationKind: 'access-enable'
    })
    const ruleKey = buildNatsIdempotencyKey({
      reason: 'account-created',
      applicationId: 42,
      microserviceUuid: 'ms-a',
      mutationKind: 'rule-change'
    })
    expect(enableKey).to.not.equal(ruleKey)
  })

  it('routes buildIdempotencyKey by kind', () => {
    expect(buildIdempotencyKey('fog_platform', { fogUuid: 'x', reason: 'delete' }))
      .to.equal('fp:x:delete:null')
  })

  it('builds catalog image propagation keys', () => {
    const key = buildAgentPropagationIdempotencyKey({
      scope: 'catalog',
      catalogItemId: 7,
      actions: ['rebuild', 'notify_microservices']
    })
    expect(key).to.equal('ap:catalog:7:images')
  })

  it('builds catalog registry propagation keys', () => {
    const key = buildAgentPropagationIdempotencyKey({
      scope: 'catalog',
      catalogItemId: 7,
      actions: ['propagate_registry_id', 'rebuild', 'notify_microservices']
    })
    expect(key).to.equal('ap:catalog:7:registry')
  })

  it('builds registry global notify keys', () => {
    const key = buildAgentPropagationIdempotencyKey({
      scope: 'registry',
      registryId: 3,
      actions: ['notify_registries']
    })
    expect(key).to.equal('ap:registry:registries')
  })

  it('builds registry microservice propagation keys', () => {
    const key = buildAgentPropagationIdempotencyKey({
      scope: 'registry',
      registryId: 3,
      actions: ['rebuild', 'notify_microservices']
    })
    expect(key).to.equal('ap:registry:3:microservices')
  })

  it('routes agent_propagation through buildIdempotencyKey', () => {
    expect(buildIdempotencyKey('agent_propagation', {
      scope: 'registry',
      registryId: 9,
      actions: ['notify_registries']
    })).to.equal('ap:registry:registries')
  })
})

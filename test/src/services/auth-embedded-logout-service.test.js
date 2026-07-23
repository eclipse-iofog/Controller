'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const {
  snapshotOidcEnv,
  createEmbeddedAuthHarness,
  teardownEmbeddedAuth
} = require('../../support/embedded-auth-harness')

describe('Auth embedded logout service', () => {
  def('sandbox', () => sinon.createSandbox())
  def('envSnapshot', () => snapshotOidcEnv())
  def('harness', async () => createEmbeddedAuthHarness($sandbox))

  beforeEach(async () => {
    await $harness
  })

  afterEach(() => {
    $sandbox.restore()
    teardownEmbeddedAuth($envSnapshot)
  })

  it('destroys issuer Session, Grant, and Interaction rows for the user', async () => {
    const { store } = await $harness
    const { user } = await store.seedUser({
      email: 'viewer@example.com',
      groupNames: ['viewer']
    })

    const db = require('../../../src/data/models')
    const destroyed = []
    const rows = [
      {
        model: 'Session',
        payload: JSON.stringify({ accountId: user.id }),
        destroy: async () => { destroyed.push('Session') }
      },
      {
        model: 'Grant',
        payload: JSON.stringify({ accountId: user.id }),
        destroy: async () => { destroyed.push('Grant') }
      },
      {
        model: 'Interaction',
        payload: JSON.stringify({ accountId: user.id }),
        destroy: async () => { destroyed.push('Interaction') }
      },
      {
        model: 'Session',
        payload: JSON.stringify({ accountId: 'other-user' }),
        destroy: async () => { destroyed.push('other') }
      }
    ]

    db.AuthOidcProviderState.findAll.callsFake(async () => rows)

    const { destroyEmbeddedOidcStateForUser } = require('../../../src/services/auth-embedded-logout-service')
    await destroyEmbeddedOidcStateForUser(user.id, null)

    expect(destroyed).to.have.members(['Session', 'Grant', 'Interaction'])
  })
})

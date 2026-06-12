'use strict'

const { expect } = require('chai')
const sinon = require('sinon')
const {
  getConfidentialClientId,
  resolveConfidentialClientSecret
} = require('../../../src/config/embedded-oidc-client-secret')
const {
  snapshotOidcEnv,
  restoreOidcEnv,
  applyOidcEnv
} = require('../../support/oidc-test-helpers')

describe('embedded-oidc-client-secret', () => {
  def('envSnapshot', () => snapshotOidcEnv())
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => {
    $sandbox.restore()
    restoreOidcEnv($envSnapshot)
  })

  it('returns env client secret when configured', async () => {
    applyOidcEnv({
      OIDC_CLIENT_ID: 'controller',
      OIDC_CLIENT_SECRET: 'env-client-secret'
    })

    const secretHelper = require('../../../src/helpers/secret-helper')
    $sandbox.stub(secretHelper, 'encryptSecret').resolves('encrypted-ref')

    const db = {
      AuthOidcClient: {
        findOne: sinon.stub().resolves(null),
        create: sinon.stub().resolves({ clientId: 'controller', secretRef: 'encrypted-ref' }),
        update: sinon.stub()
      }
    }

    const result = await resolveConfidentialClientSecret(db)

    expect(result).to.deep.equal({
      clientId: 'controller',
      clientSecret: 'env-client-secret'
    })
    expect(db.AuthOidcClient.create).to.have.been.calledOnce
  })

  it('reconciles DB secret when env value changes', async () => {
    applyOidcEnv({
      OIDC_CLIENT_ID: 'controller',
      OIDC_CLIENT_SECRET: 'new-env-secret'
    })

    const secretHelper = require('../../../src/helpers/secret-helper')
    $sandbox.stub(secretHelper, 'decryptSecret').resolves({ secret: 'old-db-secret' })
    $sandbox.stub(secretHelper, 'encryptSecret').resolves('encrypted-new-ref')

    const existingRow = {
      clientId: 'controller',
      secretRef: 'old-ref',
      update: sinon.stub().resolves()
    }

    const db = {
      AuthOidcClient: {
        findOne: sinon.stub().resolves(existingRow),
        create: sinon.stub(),
        update: sinon.stub().resolves()
      }
    }

    const result = await resolveConfidentialClientSecret(db)

    expect(result.clientSecret).to.equal('new-env-secret')
    expect(existingRow.update).to.have.been.calledOnce
  })

  it('loads client secret from AuthOidcClients when env is unset', async () => {
    applyOidcEnv({ OIDC_CLIENT_ID: 'controller' })

    const db = {
      AuthOidcClient: {
        findOne: sinon.stub().resolves({
          clientId: 'controller',
          secretRef: 'stored-secret-ref'
        }),
        create: sinon.stub()
      }
    }

    const secretHelper = require('../../../src/helpers/secret-helper')
    $sandbox.stub(secretHelper, 'decryptSecret').resolves({ secret: 'db-client-secret' })

    const result = await resolveConfidentialClientSecret(db)

    expect(result).to.deep.equal({
      clientId: 'controller',
      clientSecret: 'db-client-secret'
    })
  })

  it('generates and persists a secret when createIfMissing is true', async () => {
    applyOidcEnv({ OIDC_CLIENT_ID: 'controller' })

    const createdRow = { clientId: 'controller', secretRef: 'generated-ref' }
    const db = {
      AuthOidcClient: {
        findOne: sinon.stub().resolves(null),
        create: sinon.stub().resolves(createdRow)
      }
    }

    const secretHelper = require('../../../src/helpers/secret-helper')
    $sandbox.stub(secretHelper, 'encryptSecret').callsFake(async (data) => data.secret)

    const result = await resolveConfidentialClientSecret(db, { createIfMissing: true })

    expect(result.clientId).to.equal('controller')
    expect(result.clientSecret).to.be.a('string').that.is.not.empty
    expect(db.AuthOidcClient.create).to.have.been.calledOnce
  })

  it('throws when secret is unavailable and createIfMissing is false', async () => {
    applyOidcEnv({ OIDC_CLIENT_ID: 'controller' })

    const db = {
      AuthOidcClient: {
        findOne: sinon.stub().resolves(null)
      }
    }

    try {
      await resolveConfidentialClientSecret(db)
      expect.fail('expected secret resolution to fail')
    } catch (error) {
      expect(error.message).to.include('Embedded OIDC client secret')
    }
  })

  it('defaults client id to controller', () => {
    applyOidcEnv({})
    expect(getConfidentialClientId()).to.equal('controller')
  })
})

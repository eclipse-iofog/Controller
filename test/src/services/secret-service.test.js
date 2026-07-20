'use strict'

const { expect } = require('chai')
const sinon = require('sinon')

const SecretManager = require('../../../src/data/managers/secret-manager')
const SecretService = require('../../../src/services/secret-service')
const VolumeMountingManager = require('../../../src/data/managers/volume-mounting-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')
const Errors = require('../../../src/helpers/errors')

describe('Secret Service', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  afterEach(() => {
    $sandbox.restore()
  })

  describe('.updateSecretEndpoint()', () => {
    const secretName = 'test-db-secret'
    const existingSecret = {
      id: 91,
      name: secretName,
      type: 'Opaque',
      data: { db: 'test-value', password: 'old', user: 'test-value' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    }
    const updatedSecret = {
      ...existingSecret,
      data: { db: 'test-value', password: 'new', user: 'test-value' },
      updated_at: '2026-01-02T00:00:00.000Z'
    }

    beforeEach(() => {
      $sandbox.stub(SecretManager, 'findOne').resolves(existingSecret)
      $sandbox.stub(SecretManager, 'updateSecret').resolves(updatedSecret)
      $sandbox.stub(VolumeMountingManager, 'findAll').resolves([])
      $sandbox.stub(MicroserviceEnvManager, 'findAll').resolves([])
    })

    it('updates when type is omitted and defaults to the existing secret type', async () => {
      const patchData = {
        data: { db: 'test-value', password: 'new', user: 'test-value' }
      }

      const result = await SecretService.updateSecretEndpoint(secretName, patchData, transaction)

      expect(SecretManager.updateSecret).to.have.been.calledOnceWith(
        secretName,
        'Opaque',
        patchData.data,
        transaction
      )
      expect(result.type).to.equal('Opaque')
    })

    it('updates when type matches the existing secret type', async () => {
      const patchData = {
        type: 'Opaque',
        data: { db: 'test-value', password: 'new', user: 'test-value' }
      }

      await SecretService.updateSecretEndpoint(secretName, patchData, transaction)

      expect(SecretManager.updateSecret).to.have.been.calledOnceWith(
        secretName,
        'Opaque',
        patchData.data,
        transaction
      )
    })

    it('rejects when type does not match the existing secret type', async () => {
      const patchData = {
        type: 'tls',
        data: { cert: Buffer.from('cert').toString('base64'), key: Buffer.from('key').toString('base64') }
      }

      await expect(
        SecretService.updateSecretEndpoint(secretName, patchData, transaction)
      ).to.be.rejectedWith(Errors.ValidationError, /Secret type mismatch/)

      expect(SecretManager.updateSecret).to.not.have.been.called
    })
  })
})

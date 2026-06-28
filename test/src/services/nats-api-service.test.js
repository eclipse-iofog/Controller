const { expect } = require('chai')
const sinon = require('sinon')

const NatsApiService = require('../../../src/services/nats-api-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const NatsAccountManager = require('../../../src/data/managers/nats-account-manager')
const NatsUserManager = require('../../../src/data/managers/nats-user-manager')
const SecretService = require('../../../src/services/secret-service')

describe('NatsApiService', () => {
  def('sandbox', () => sinon.createSandbox())
  const transaction = {}

  const sampleCredsText = [
    '-----BEGIN NATS USER JWT-----',
    'test-jwt',
    '------END NATS USER JWT------',
    ''
  ].join('\n')

  afterEach(() => $sandbox.restore())

  describe('getUserCreds()', () => {
    it('returns creds for platform controller NATS account', async () => {
      const platformAccount = {
        id: 42,
        name: NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME,
        applicationId: null,
        isSystem: false,
        isLeafSystem: false
      }
      const platformUser = {
        id: 7,
        accountId: platformAccount.id,
        name: NatsAuthService.CONTROLLER_NATS_USER_NAME,
        credsSecretName: NatsAuthService.controllerNatsCredsSecretName()
      }

      $sandbox.stub(NatsAccountManager, 'findOne').resolves(platformAccount)
      $sandbox.stub(ApplicationManager, 'findOne').resolves(null)
      $sandbox.stub(NatsUserManager, 'findOne').resolves(platformUser)
      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
        data: {
          'controller/controller.creds': sampleCredsText
        }
      })

      const result = await NatsApiService.getUserCreds(
        NatsAuthService.CONTROLLER_NATS_ACCOUNT_NAME,
        NatsAuthService.CONTROLLER_NATS_USER_NAME,
        transaction
      )

      expect(result.credsBase64).to.equal(Buffer.from(sampleCredsText, 'utf8').toString('base64'))
      expect(ApplicationManager.findOne).to.not.have.been.called
    })

    it('returns creds for SYS account by account name', async () => {
      const sysAccount = {
        id: 1,
        name: 'SYS',
        applicationId: null,
        isSystem: true,
        isLeafSystem: false
      }
      const sysUser = {
        id: 2,
        accountId: sysAccount.id,
        name: 'admin-hub',
        credsSecretName: 'nats-creds-sys-admin-hub'
      }

      $sandbox.stub(NatsAccountManager, 'findOne').resolves(sysAccount)
      $sandbox.stub(ApplicationManager, 'findOne').resolves(null)
      $sandbox.stub(NatsUserManager, 'findOne').resolves(sysUser)
      $sandbox.stub(SecretService, 'getSecretEndpoint').resolves({
        data: {
          'sys/admin-hub.creds': sampleCredsText
        }
      })

      const result = await NatsApiService.getUserCreds('SYS', 'admin-hub', transaction)

      expect(result.credsBase64).to.equal(Buffer.from(sampleCredsText, 'utf8').toString('base64'))
    })

    it('rejects unknown account names that are not applications or system accounts', async () => {
      $sandbox.stub(NatsAccountManager, 'findOne').resolves(null)
      $sandbox.stub(ApplicationManager, 'findOne').resolves(null)

      try {
        await NatsApiService.getUserCreds('missing-account', 'some-user', transaction)
        expect.fail('expected getUserCreds to fail')
      } catch (error) {
        expect(error.name).to.equal('NotFoundError')
        expect(error.message).to.include('missing-account')
      }
    })
  })
})

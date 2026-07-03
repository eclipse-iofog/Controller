const { expect } = require('chai')
const sinon = require('sinon')

const RbacService = require('../../../src/services/rbac-service')
const RbacRoleManager = require('../../../src/data/managers/rbac-role-manager')
const RbacRoleBindingManager = require('../../../src/data/managers/rbac-role-binding-manager')
const RbacServiceAccountManager = require('../../../src/data/managers/rbac-service-account-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')

describe('Rbac Service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('R22 change tracking', () => {
    const transaction = {}

    describe('.updateServiceAccountEndpoint()', () => {
      const appName = 'my-app'
      const saName = 'my-msvc'
      const iofogUuid = 'agent-uuid-1'
      const microserviceUuid = 'msvc-uuid-1'
      const saData = { roleRef: 'custom-role' }

      def('subject', () => RbacService.updateServiceAccountEndpoint(appName, saName, saData, transaction))

      beforeEach(() => {
        $sandbox.stub(Validator, 'validate').resolves(true)
        $sandbox.stub(RbacServiceAccountManager, 'updateServiceAccount').resolves({
          name: saName,
          microserviceUuid,
          roleRef: 'custom-role'
        })
        $sandbox.stub(MicroserviceManager, 'findOne').resolves({
          uuid: microserviceUuid,
          iofogUuid
        })
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('sets microserviceList change tracking on the hosting agent', async () => {
        await $subject
        expect(ChangeTrackingService.update).to.have.been.calledOnceWith(
          iofogUuid,
          ChangeTrackingService.events.microserviceList,
          transaction
        )
      })

      context('when service account is not linked to a microservice', () => {
        beforeEach(() => {
          RbacServiceAccountManager.updateServiceAccount.resolves({
            name: saName,
            microserviceUuid: null
          })
        })

        it('does not set microserviceList change tracking', async () => {
          await $subject
          expect(ChangeTrackingService.update).to.not.have.been.called
        })
      })
    })

    describe('.updateRoleEndpoint()', () => {
      const roleName = 'custom-role'
      const roleId = 99
      const roleRef = { kind: 'Role', name: roleName }
      const roleData = {
        rules: [{
          apiGroups: ['edgelet.iofog.org/v1'],
          resources: ['microservices/config/self'],
          verbs: ['get', 'patch']
        }]
      }
      const agentOne = 'agent-uuid-1'
      const agentTwo = 'agent-uuid-2'

      def('subject', () => RbacService.updateRoleEndpoint(roleName, roleData, transaction))

      beforeEach(() => {
        $sandbox.stub(Validator, 'validate').resolves(true)
        $sandbox.stub(RbacRoleManager, 'isSystemRole').returns(false)
        $sandbox.stub(RbacRoleManager, 'findOne')
          .onFirstCall().resolves({ id: roleId, name: roleName })
          .onSecondCall().resolves({ id: roleId, name: roleName })
        $sandbox.stub(RbacRoleManager, 'updateRole').resolves({ name: roleName })
        $sandbox.stub(RbacRoleBindingManager, 'findAll').resolves([
          { name: 'binding1', roleRef: roleRef }
        ])
        $sandbox.stub(RbacRoleBindingManager, 'updateRoleBinding').resolves({})
        $sandbox.stub(RbacServiceAccountManager, 'findAll').resolves([
          { name: 'sa1', microserviceUuid: 'msvc-1', applicationId: 1, roleRef },
          { name: 'sa2', microserviceUuid: 'msvc-2', applicationId: 1, roleRef },
          { name: 'sa3', microserviceUuid: 'msvc-3', applicationId: 2, roleRef }
        ])
        $sandbox.stub(ApplicationManager, 'findOne')
          .withArgs({ id: 1 }).resolves({ name: 'app1' })
          .withArgs({ id: 2 }).resolves({ name: 'app2' })
        $sandbox.stub(RbacServiceAccountManager, 'updateServiceAccount').resolves({})
        $sandbox.stub(MicroserviceManager, 'findOne')
          .withArgs({ uuid: 'msvc-1' }, transaction).resolves({ uuid: 'msvc-1', iofogUuid: agentOne })
          .withArgs({ uuid: 'msvc-2' }, transaction).resolves({ uuid: 'msvc-2', iofogUuid: agentOne })
          .withArgs({ uuid: 'msvc-3' }, transaction).resolves({ uuid: 'msvc-3', iofogUuid: agentTwo })
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('sets microserviceList change tracking on every distinct hosting agent', async () => {
        await $subject
        expect(ChangeTrackingService.update).to.have.been.calledTwice
        expect(ChangeTrackingService.update).to.have.been.calledWith(
          agentOne,
          ChangeTrackingService.events.microserviceList,
          transaction
        )
        expect(ChangeTrackingService.update).to.have.been.calledWith(
          agentTwo,
          ChangeTrackingService.events.microserviceList,
          transaction
        )
      })

      it('refreshes roleRef.name on linked bindings and service accounts', async () => {
        await $subject
        expect(RbacRoleBindingManager.updateRoleBinding).to.have.been.calledOnceWith(
          'binding1',
          { roleRef: { kind: 'Role', name: roleName } },
          transaction
        )
        expect(RbacServiceAccountManager.updateServiceAccount).to.have.been.calledWith(
          'app1',
          'sa1',
          { roleRef: { kind: 'Role', name: roleName } },
          transaction
        )
      })

      context('when the role is renamed', () => {
        const renamedRole = 'custom-role-v2'
        const renameRoleData = { name: renamedRole }

        def('subject', () => RbacService.updateRoleEndpoint(roleName, renameRoleData, transaction))

        beforeEach(() => {
          RbacRoleManager.findOne.restore()
          $sandbox.stub(RbacRoleManager, 'findOne')
            .onFirstCall().resolves({ id: roleId, name: roleName })
            .onSecondCall().resolves({ id: roleId, name: renamedRole })
        })

        it('rewrites roleRef.name on linked bindings and service accounts', async () => {
          await $subject
          expect(RbacRoleBindingManager.updateRoleBinding).to.have.been.calledOnceWith(
            'binding1',
            { roleRef: { kind: 'Role', name: renamedRole } },
            transaction
          )
          expect(RbacServiceAccountManager.updateServiceAccount).to.have.been.calledWith(
            'app2',
            'sa3',
            { roleRef: { kind: 'Role', name: renamedRole } },
            transaction
          )
        })
      })
    })

    describe('.updateRoleBindingEndpoint()', () => {
      const bindingName = 'developer-binding'
      const bindingData = { roleRef: 'developer' }

      def('subject', () => RbacService.updateRoleBindingEndpoint(bindingName, bindingData, transaction))

      beforeEach(() => {
        $sandbox.stub(Validator, 'validate').resolves(true)
        $sandbox.stub(RbacRoleBindingManager, 'updateRoleBinding').resolves({ name: bindingName })
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('does not set microserviceList change tracking', async () => {
        await $subject
        expect(ChangeTrackingService.update).to.not.have.been.called
      })
    })
  })
})

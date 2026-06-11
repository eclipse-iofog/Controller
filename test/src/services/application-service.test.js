const { expect } = require('chai')
const sinon = require('sinon')

const ApplicationManager = require('../../../src/data/managers/application-manager')
const ApplicationService = require('../../../src/services/application-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const MicroserviceService = require('../../../src/services/microservices-service')
const NatsAuthService = require('../../../src/services/nats-auth-service')
const Errors = require('../../../src/helpers/errors')

const transaction = {}
const isCLI = true

function buildApplicationRecord (fields = {}) {
  return {
    id: 42,
    name: 'my-app',
    description: 'test app',
    isActivated: true,
    isSystem: false,
    natsAccess: false,
    natsRuleId: null,
    ...fields
  }
}

function stubCreateApplicationDeps (sandbox, { appId = 25, name = 'test-name' } = {}) {
  const created = buildApplicationRecord({ id: appId, name })

  sandbox.stub(Validator, 'validate').resolves(true)
  sandbox.stub(ApplicationManager, 'findOne').resolves(null)
  sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
  sandbox.stub(ApplicationManager, 'create').resolves(created)
}

describe('Application Service', () => {
  def('service', () => ApplicationService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createApplicationEndPoint()', () => {
    const applicationData = {
      name: 'test-name',
      description: 'testDescription',
      isActivated: false,
      isSystem: false
    }

    def('subject', () => $service.createApplicationEndPoint(applicationData, isCLI, transaction))

    beforeEach(() => {
      stubCreateApplicationDeps($sandbox)
    })

    it('validates input and creates an application', async () => {
      const result = await $subject
      expect(Validator.validate).to.have.been.calledWith(applicationData, Validator.schemas.applicationCreate)
      expect(ApplicationManager.create).to.have.been.calledOnce
      expect(result).to.eql({ id: 25, name: 'test-name' })
    })

    it('rejects top-level natsAccess (use natsConfig)', () => {
      const badPayload = { ...applicationData, natsAccess: true }
      return expect(
        $service.createApplicationEndPoint(badPayload, isCLI, transaction)
      ).to.be.rejectedWith('natsAccess must be provided under natsConfig.natsAccess')
    })

    context('when name already exists', () => {
      beforeEach(() => {
        ApplicationManager.findOne.resolves(buildApplicationRecord({ name: applicationData.name }))
      })

      it('rejects with DuplicatePropertyError', () => expect($subject).to.be.rejectedWith(Errors.DuplicatePropertyError))
    })

    context('when microservices are included', () => {
      const microservices = [{ name: 'test-msvc' }, { name: 'test-msvc-2' }]
      const data = { ...applicationData, microservices }

      def('subject', () => $service.createApplicationEndPoint(data, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(MicroserviceService, 'createMicroserviceEndPoint').resolves({ uuid: 'msvc-uuid', name: 'test-msvc' })
      })

      it('creates each microservice with application name set', async () => {
        await $subject
        for (const msvc of microservices) {
          expect(MicroserviceService.createMicroserviceEndPoint).to.have.been.calledWith(
            { ...msvc, application: applicationData.name },
            isCLI,
            transaction
          )
        }
      })

      context('when microservice creation fails', () => {
        beforeEach(() => {
          MicroserviceService.createMicroserviceEndPoint.rejects(new Error('create failed'))
          $sandbox.stub(ApplicationManager, 'findApplicationMicroservices').resolves([])
          $sandbox.stub(NatsAuthService, 'deleteAccountForApplication').resolves()
          $sandbox.stub(ApplicationManager, 'delete').resolves()
          ApplicationManager.findOne.onFirstCall().resolves(null)
          ApplicationManager.findOne.onSecondCall().resolves(buildApplicationRecord({ id: 25, name: applicationData.name }))
        })

        it('rolls back by deleting the application', () => {
          return expect($subject).to.be.rejectedWith('create failed').then(() => {
            expect(ApplicationManager.delete).to.have.been.calledWith({ name: applicationData.name }, transaction)
          })
        })
      })
    })
  })

  describe('.deleteApplicationEndPoint()', () => {
    const name = 'my-app'
    const application = buildApplicationRecord({ name })
    const microservices = [{ uuid: 'msvc-1', iofogUuid: 'fog-uuid' }]

    def('subject', () => $service.deleteApplicationEndPoint({ name }, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findOne').resolves(application)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(ApplicationManager, 'findApplicationMicroservices').resolves(microservices)
      $sandbox.stub(MicroserviceService, 'deleteMicroserviceWithRoutesAndPortMappings').resolves()
      $sandbox.stub(ChangeTrackingService, 'update').resolves()
      $sandbox.stub(NatsAuthService, 'deleteAccountForApplication').resolves()
      $sandbox.stub(ApplicationManager, 'delete').resolves()
    })

    it('deletes microservices, NATS account, and the application', async () => {
      await $subject
      expect(MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings).to.have.been.calledWith(microservices[0], transaction)
      expect(NatsAuthService.deleteAccountForApplication).to.have.been.calledWith(application.id, transaction)
      expect(ApplicationManager.delete).to.have.been.calledWith({ name }, transaction)
    })

    context('when application is system', () => {
      beforeEach(() => {
        ApplicationManager.findOne.resolves({ ...application, isSystem: true })
      })

      it('rejects with ValidationError', () => expect($subject).to.be.rejectedWith(Errors.ValidationError))
    })
  })

  describe('.updateApplicationEndPoint()', () => {
    const name = 'my-app'
    const oldApplication = buildApplicationRecord({ name })

    def('subject', () => $service.updateApplicationEndPoint($updateData, name, isCLI, transaction))
    def('updateData', () => ({ description: 'updated description', isActivated: true }))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ApplicationManager, 'findOne').callsFake((where) => {
        if (where && where.name === name && !where.id) {
          return Promise.resolve(oldApplication)
        }
        return Promise.resolve(null)
      })
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(ApplicationManager, 'update').resolves()
    })

    it('updates mutable application fields', async () => {
      await $subject
      expect(ApplicationManager.update).to.have.been.calledWith({ id: oldApplication.id }, sinon.match.object, transaction)
    })

    context('when renaming', () => {
      def('updateData', () => ({ name: 'new-app-name' }))

      it('rejects rename attempts', () => expect($subject).to.be.rejectedWith('Application Resource Name is immutable'))
    })

    context('when microservices are included', () => {
      const existingMsvc = { name: 'test-msvc', uuid: 'msvc-1', iofogUuid: 'fog-1' }
      const removedMsvc = { name: 'old-msvc', uuid: 'old-uuid', iofogUuid: 'fog-2' }
      const newMsvc = { name: 'new-msvc' }
      const updateData = {
        description: 'updated',
        microservices: [existingMsvc, newMsvc]
      }

      def('subject', () => $service.updateApplicationEndPoint(updateData, name, isCLI, transaction))

      beforeEach(() => {
        $sandbox.stub(ApplicationManager, 'findApplicationMicroservices').resolves([existingMsvc, removedMsvc])
        $sandbox.stub(MicroserviceService, 'updateMicroserviceEndPoint').resolves({
          microserviceIofogUuid: 'fog-1',
          updatedMicroserviceIofogUuid: 'fog-1'
        })
        $sandbox.stub(MicroserviceService, 'createMicroserviceEndPoint').resolves({ uuid: 'new-uuid', name: 'new-msvc' })
        $sandbox.stub(MicroserviceService, 'deleteMicroserviceWithRoutesAndPortMappings').resolves()
        $sandbox.stub(MicroserviceService, 'updateChangeTracking').resolves()
        $sandbox.stub(ChangeTrackingService, 'update').resolves()
      })

      it('updates, creates, and deletes microservices as needed', async () => {
        await $subject
        expect(MicroserviceService.updateMicroserviceEndPoint).to.have.been.calledWith(
          existingMsvc.uuid,
          { ...existingMsvc, application: name },
          isCLI,
          transaction,
          false
        )
        expect(MicroserviceService.createMicroserviceEndPoint).to.have.been.calledWith(
          { ...newMsvc, application: name },
          isCLI,
          transaction
        )
        expect(MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings).to.have.been.calledWith(removedMsvc, transaction)
      })
    })
  })

  describe('.patchApplicationEndPoint()', () => {
    const conditions = { name: 'my-app' }
    const oldApplication = buildApplicationRecord(conditions)
    const patchData = { description: 'patched description', isActivated: true }

    def('subject', () => $service.patchApplicationEndPoint($patchData, conditions, isCLI, transaction))
    def('patchData', () => patchData)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').resolves(true)
      $sandbox.stub(ApplicationManager, 'findOne').resolves(oldApplication)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').callsFake((value) => value)
      $sandbox.stub(ApplicationManager, 'update').resolves()
    })

    it('patches application metadata', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(patchData, Validator.schemas.applicationPatch)
      expect(ApplicationManager.update).to.have.been.calledWith({ id: oldApplication.id }, sinon.match.object, transaction)
    })

    context('when application is missing', () => {
      beforeEach(() => {
        ApplicationManager.findOne.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })

    context('when renaming', () => {
      def('patchData', () => ({ name: 'new-name' }))

      it('rejects rename attempts', () => expect($subject).to.be.rejectedWith('Application Resource Name is immutable'))
    })
  })

  describe('.getUserApplicationsEndPoint()', () => {
    const appRow = buildApplicationRecord()

    def('subject', () => $service.getUserApplicationsEndPoint(isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findAllPopulated').resolves([appRow])
      $sandbox.stub(MicroserviceService, 'buildGetMicroserviceResponse').callsFake(async (m) => m)
    })

    it('lists non-system applications', async () => {
      const result = await $subject
      expect(ApplicationManager.findAllPopulated).to.have.been.calledWith(
        { isSystem: false },
        { exclude: ['created_at', 'updated_at'] },
        transaction
      )
      expect(result.applications).to.have.length(1)
      expect(result.applications[0].natsConfig).to.eql({ natsAccess: false, natsRule: null })
    })
  })

  describe('.getAllApplicationsEndPoint()', () => {
    def('subject', () => $service.getAllApplicationsEndPoint(isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findAllPopulated').resolves([])
    })

    it('lists all applications', async () => {
      await $subject
      expect(ApplicationManager.findAllPopulated).to.have.been.calledWith(
        {},
        { exclude: ['created_at', 'updated_at'] },
        transaction
      )
    })
  })

  describe('.getApplication()', () => {
    const name = 'my-app'
    const appRow = buildApplicationRecord({ name })

    def('subject', () => $service.getApplication({ name }, isCLI, transaction))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findOnePopulated').resolves(appRow)
      $sandbox.stub(MicroserviceService, 'buildGetMicroserviceResponse').callsFake(async (m) => m)
    })

    it('returns application with natsConfig', async () => {
      const result = await $subject
      expect(ApplicationManager.findOnePopulated).to.have.been.calledWith(
        { name, isSystem: false },
        { exclude: ['created_at', 'updated_at'] },
        transaction
      )
      expect(result.natsConfig).to.eql({ natsAccess: false, natsRule: null })
    })

    context('when application is missing', () => {
      beforeEach(() => {
        ApplicationManager.findOnePopulated.resolves(null)
      })

      it('rejects with NotFoundError', () => expect($subject).to.be.rejectedWith(Errors.NotFoundError))
    })
  })
})

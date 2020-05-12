const { expect } = require('chai')
const sinon = require('sinon')

const MicroservicesController = require('../../../src/controllers/microservices-controller')
const MicroservicesService = require('../../../src/services/microservices-service')

describe('Microservices Controller', () => {
  def('subject', () => MicroservicesController)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createMicroserviceOnFogEndPoint()', () => {
    def('user', () => 'user!')

    def('name', () => 'testName')
    def('config', () => '{}')
    def('catalogItemId', () => 5)
    def('flowId', () => 1)
    def('iofogUuid', () => 'testUuid')
    def('rootHostAccess', () => true)
    def('logSize', () => 15)
    def('volumeMappings', () => [{
      hostDestination: '/var/dest',
      containerDestination: '/var/dest',
      accessMode: true,
    }])
    def('ports', () => [
      {
        internal: 15,
        external: 55,
        publicMode: true,
      },
    ])
    def('routes', () => [
      'testAnotherUuid',
    ])

    def('req', () => ({
      body: {
        name: $name,
        config: $config,
        catalogItemId: $catalogItemId,
        flowId: $flowId,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings,
        ports: $ports,
        routes: $routes,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.createMicroserviceOnFogEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createMicroserviceEndPoint').returns($response)
    })

    it('calls MicroservicesService.createMicroserviceEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.createMicroserviceEndPoint).to.have.been.calledWith({
        name: $name,
        config: $config,
        catalogItemId: $catalogItemId,
        flowId: $flowId,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings,
        ports: $ports,
        routes: $routes,
      }, $user, false)
    })

    context('when MicroservicesService#createMicroserviceEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#createMicroserviceEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getMicroserviceEndPoint()', () => {
    def('user', () => 'user!')

    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getMicroserviceEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'getMicroserviceEndPoint').returns($response)
    })

    it('calls MicroservicesService.getMicroserviceEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.getMicroserviceEndPoint).to.have.been.calledWith($uuid, $user, false)
    })

    context('when MicroservicesService#getMicroserviceEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#getMicroserviceEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.updateMicroserviceEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'newTestUuid')

    def('name', () => 'testName')
    def('config', () => '{}')
    def('rebuild', () => true)
    def('iofogUuid', () => 'testUuid')
    def('rootHostAccess', () => true)
    def('logSize', () => 15)
    def('volumeMappings', () => [{
      hostDestination: '/var/dest',
      containerDestination: '/var/dest',
      accessMode: true,
    }])

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        name: $name,
        config: $config,
        rebuild: $rebuild,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings,
      },
    }))

    def('response', () => Promise.resolve())
    def('subject', () => $subject.updateMicroserviceEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'updateMicroserviceEndPoint').returns($response)
    })

    it('calls MicroservicesService.updateMicroserviceEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.updateMicroserviceEndPoint).to.have.been.calledWith($uuid, {
        name: $name,
        config: $config,
        rebuild: $rebuild,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings,
      }, $user, false)
    })

    context('when MicroservicesService#updateMicroserviceEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#updateMicroserviceEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.deleteMicroserviceEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('withCleanup', () => 'withCleanup')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        withCleanup: $withCleanup,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteMicroserviceEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteMicroserviceEndPoint').returns($response)
    })

    it('calls MicroservicesService.deleteMicroserviceEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.deleteMicroserviceEndPoint).to.have.been.calledWith($uuid, {
        withCleanup: $withCleanup,
      }, $user, false)
    })

    context('when MicroservicesService#deleteMicroserviceEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#deleteMicroserviceEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.getMicroservicesByFlowEndPoint()', () => {
    def('user', () => 'user!')
    def('application', () => 'my-app')

    def('req', () => ({
      query: {
        application: $application,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getMicroservicesByFlowEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservicesEndPoint').returns($response)
    })

    it('calls MicroservicesService.listMicroservicesEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.listMicroservicesEndPoint).to.have.been.calledWith($application, $user, false)
    })

    context('when MicroservicesService#listMicroservicesEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#listMicroservicesEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('.createMicroserviceRouteEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('receiverUuid', () => 'testReceiverUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
        receiverUuid: $receiverUuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.createMicroserviceRouteEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createRouteEndPoint').returns($response)
    })

    it('calls MicroservicesService.createRouteEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.createRouteEndPoint).to.have.been.calledWith($uuid, $receiverUuid, $user, false)
    })

    context('when MicroservicesService#createRouteEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#createRouteEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('deleteMicroserviceRouteEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('receiverUuid', () => 'testReceiverUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
        receiverUuid: $receiverUuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteMicroserviceRouteEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteRouteEndPoint').returns($response)
    })

    it('calls MicroservicesService.deleteRouteEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.deleteRouteEndPoint).to.have.been.calledWith($uuid, $receiverUuid, $user, false)
    })

    context('when MicroservicesService#deleteRouteEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#deleteRouteEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('createMicroservicePortMappingEndPoint.()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('internal', () => 55)
    def('external', () => 66)
    def('publicMode', () => true)

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        internal: $internal,
        external: $external,
        publicMode: $publicMode,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.createMicroservicePortMappingEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createPortMappingEndPoint').returns($response)
    })

    it('calls MicroservicesService.createPortMappingEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.createPortMappingEndPoint).to.have.been.calledWith($uuid, {
        internal: $internal,
        external: $external,
        publicMode: $publicMode,
      }, $user, false)
    })

    context('when MicroservicesService#createPortMappingEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#createPortMappingEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('deleteMicroservicePortMappingEndPoint.()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('internalPort', () => 55)

    def('req', () => ({
      params: {
        uuid: $uuid,
        internalPort: $internalPort,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteMicroservicePortMappingEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deletePortMappingEndPoint').returns($response)
    })

    it('calls MicroservicesService.deletePortMappingEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.deletePortMappingEndPoint).to.have.been.calledWith($uuid, $internalPort, $user, false)
    })

    context('when MicroservicesService#deletePortMappingEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#deletePortMappingEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

  describe('getMicroservicePortMappingListEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.getMicroservicePortMappingListEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservicePortMappingsEndPoint').returns($response)
    })

    it('calls MicroservicesService.listMicroservicePortMappingsEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.listMicroservicePortMappingsEndPoint).to.have.been.calledWith($uuid, $user, false)
    })

    context('when MicroservicesService#listMicroservicePortMappingsEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#listMicroservicePortMappingsEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('ports')
      })
    })
  })

  describe('createMicroserviceVolumeMappingEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('hostDestination', () => '/var/dest')
    def('containerDestination', () => '/var/dest')
    def('accessMode', () => 'rw')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
      body: {
        hostDestination: $hostDestination,
        containerDestination: $containerDestination,
        accessMode: $accessMode,
      },
    }))
    def('response', () => Promise.resolve({ id: 15 }))
    def('subject', () => $subject.createMicroserviceVolumeMappingEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createVolumeMappingEndPoint').returns($response)
    })

    it('calls MicroservicesService.createVolumeMappingEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.createVolumeMappingEndPoint).to.have.been.calledWith($uuid, {
        hostDestination: $hostDestination,
        containerDestination: $containerDestination,
        accessMode: $accessMode,
      }, $user, false)
    })

    context('when MicroservicesService#createVolumeMappingEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#createVolumeMappingEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('id')
      })
    })
  })

  describe('listMicroserviceVolumeMappingsEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')

    def('req', () => ({
      params: {
        uuid: $uuid,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.listMicroserviceVolumeMappingsEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listVolumeMappingsEndPoint').returns($response)
    })

    it('calls MicroservicesService.listVolumeMappingsEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.listVolumeMappingsEndPoint).to.have.been.calledWith($uuid, $user, false)
    })

    context('when MicroservicesService#listVolumeMappingsEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#listVolumeMappingsEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('volumeMappings')
      })
    })
  })

  describe('deleteMicroserviceVolumeMappingEndPoint()', () => {
    def('user', () => 'user!')
    def('uuid', () => 'testUuid')
    def('id', () => 35)

    def('req', () => ({
      params: {
        uuid: $uuid,
        id: $id,
      },
    }))
    def('response', () => Promise.resolve())
    def('subject', () => $subject.deleteMicroserviceVolumeMappingEndPoint($req, $user))

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteVolumeMappingEndPoint').returns($response)
    })

    it('calls MicroservicesService.deleteVolumeMappingEndPoint with correct args', async () => {
      await $subject
      expect(MicroservicesService.deleteVolumeMappingEndPoint).to.have.been.calledWith($uuid, $id, $user, false)
    })

    context('when MicroservicesService#deleteVolumeMappingEndPoint fails', () => {
      const error = 'Error!'

      def('response', () => Promise.reject(error))

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroservicesService#deleteVolumeMappingEndPoint succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})

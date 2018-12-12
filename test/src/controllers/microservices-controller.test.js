const {expect} = require('chai');
const sinon = require('sinon');

const MicroservicesController = require('../../../src/controllers/microservices-controller');
const MicroservicesService = require('../../../src/services/microservices-service');

describe('Microservices Controller', () => {
  def('subject', () => MicroservicesController);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.createMicroserviceOnFogEndPoint()', () => {
    def('user', () => 'user!');

    def('name', () => 'testName');
    def('config', () => "{}");
    def('catalogItemId', () => 5);
    def('flowId', () => 1);
    def('iofogUuid', () => "testUuid");
    def('rootHostAccess', () => true);
    def('logSize', () => 15);
    def('volumeMappings', () => [{
      hostDestination: "/var/dest",
      containerDestination: "/var/dest",
      accessMode: true
    }]);
    def('ports', () => [
      {
        internal: 15,
        external: 55,
        publicMode: true
      }
    ]);
    def('routes', () => [
      "testAnotherUuid"
    ]);

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
        routes: $routes
      }
    }));

    def('response', () => Promise.resolve());
    def('subject', () => $subject.createMicroserviceOnFogEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createMicroserviceOnFog').returns($response);
    });

    it('calls MicroservicesService.createMicroserviceOnFog with correct args', async () => {
      await $subject;
      expect(MicroservicesService.createMicroserviceOnFog).to.have.been.calledWith({
        name: $name,
        config: $config,
        catalogItemId: $catalogItemId,
        flowId: $flowId,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings,
        ports: $ports,
        routes: $routes
      }, $user, false);
    });

    context('when MicroservicesService#createMicroserviceOnFog fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#createMicroserviceOnFog succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.getMicroserviceEndPoint()', () => {
    def('user', () => 'user!');

    def('uuid', () => 'testUuid');

    def('req', () => ({
      params: {
        uuid: $uuid
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.getMicroserviceEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'getMicroservice').returns($response);
    });

    it('calls MicroservicesService.getMicroservice with correct args', async () => {
      await $subject;
      expect(MicroservicesService.getMicroservice).to.have.been.calledWith($uuid, $user, false)
    });

    context('when MicroservicesService#getMicroservice fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#getMicroservice succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })

  });

  describe('.updateMicroserviceEndPoint()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'newTestUuid');

    def('name', () => 'testName');
    def('config', () => "{}");
    def('rebuild', () => true);
    def('iofogUuid', () => "testUuid");
    def('rootHostAccess', () => true);
    def('logSize', () => 15);
    def('volumeMappings', () => [{
      hostDestination: "/var/dest",
      containerDestination: "/var/dest",
      accessMode: true
    }]);

    def('req', () => ({
      params: {
        uuid: $uuid
      },
      body: {
        name: $name,
        config: $config,
        rebuild: $rebuild,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings
      }
    }));

    def('response', () => Promise.resolve());
    def('subject', () => $subject.updateMicroserviceEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'updateMicroservice').returns($response);
    });

    it('calls MicroservicesService.updateMicroservice with correct args', async () => {
      await $subject;
      expect(MicroservicesService.updateMicroservice).to.have.been.calledWith($uuid, {
        name: $name,
        config: $config,
        rebuild: $rebuild,
        iofogUuid: $iofogUuid,
        rootHostAccess: $rootHostAccess,
        logSize: $logSize,
        volumeMappings: $volumeMappings
      }, $user, false);
    });

    context('when MicroservicesService#updateMicroservice fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#updateMicroservice succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.deleteMicroserviceEndPoint()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');

    def('withCleanup', () => 'withCleanup');

    def('req', () => ({
      params: {
        uuid: $uuid
      },
      body: {
        withCleanup: $withCleanup
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.deleteMicroserviceEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteMicroservice').returns($response);
    });

    it('calls MicroservicesService.deleteMicroservice with correct args', async () => {
      await $subject;
      expect(MicroservicesService.deleteMicroservice).to.have.been.calledWith($uuid, {
        withCleanup: $withCleanup
      }, $user, false);
    });

    context('when MicroservicesService#deleteMicroservice fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#deleteMicroservice succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.getMicroservicesByFlowEndPoint()', () => {
    def('user', () => 'user!');
    def('flowId', () => 1);

    def('req', () => ({
      query: {
        flowId: $flowId
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.getMicroservicesByFlowEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservices').returns($response);
    });

    it('calls MicroservicesService.listMicroservices with correct args', async () => {
      await $subject;
      expect(MicroservicesService.listMicroservices).to.have.been.calledWith($flowId, $user, false);
    });

    context('when MicroservicesService#listMicroservices fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#listMicroservices succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('.createMicroserviceRouteEndPoint()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');
    def('receiverUuid', () => 'testReceiverUuid');

    def('req', () => ({
      params: {
        uuid: $uuid,
        receiverUuid: $receiverUuid
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.createMicroserviceRouteEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createRoute').returns($response);
    });

    it('calls MicroservicesService.createRoute with correct args', async () => {
      await $subject;
      expect(MicroservicesService.createRoute).to.have.been.calledWith($uuid, $receiverUuid, $user, false);
    });

    context('when MicroservicesService#createRoute fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#createRoute succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('deleteMicroserviceRouteEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');
    def('receiverUuid', () => 'testReceiverUuid');

    def('req', () => ({
      params: {
        uuid: $uuid,
        receiverUuid: $receiverUuid
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.deleteMicroserviceRouteEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteRoute').returns($response);
    });

    it('calls MicroservicesService.deleteRoute with correct args', async () => {
      await $subject;
      expect(MicroservicesService.deleteRoute).to.have.been.calledWith($uuid, $receiverUuid, $user, false);
    });

    context('when MicroservicesService#deleteRoute fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#deleteRoute succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('createMicroservicePortMappingEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');
    def('internal', () => 55);
    def('external', () => 66);
    def('publicMode', () => true);

    def('req', () => ({
      params: {
        uuid: $uuid
      },
      body: {
        internal: $internal,
        external: $external,
        publicMode: $publicMode
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.createMicroservicePortMappingEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createPortMapping').returns($response);
    });

    it('calls MicroservicesService.createPortMapping with correct args', async () => {
      await $subject;
      expect(MicroservicesService.createPortMapping).to.have.been.calledWith($uuid, {
        internal: $internal,
        external: $external,
        publicMode: $publicMode
      }, $user, false);
    });

    context('when MicroservicesService#createPortMapping fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#createPortMapping succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('deleteMicroservicePortMappingEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');
    def('internalPort', () => 55);

    def('req', () => ({
      params: {
        uuid: $uuid,
        internalPort: $internalPort
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.deleteMicroservicePortMappingEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deletePortMapping').returns($response);
    });

    it('calls MicroservicesService.deletePortMapping with correct args', async () => {
      await $subject;
      expect(MicroservicesService.deletePortMapping).to.have.been.calledWith($uuid, $internalPort, $user, false);
    });

    context('when MicroservicesService#deletePortMapping fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#deletePortMapping succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

  describe('getMicroservicePortMappingListEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');

    def('req', () => ({
      params: {
        uuid: $uuid
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.getMicroservicePortMappingListEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listMicroservicePortMappings').returns($response);
    });

    it('calls MicroservicesService.listMicroservicePortMappings with correct args', async () => {
      await $subject;
      expect(MicroservicesService.listMicroservicePortMappings).to.have.been.calledWith($uuid, $user, false);
    });

    context('when MicroservicesService#listMicroservicePortMappings fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#listMicroservicePortMappings succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('ports');
      })
    })
  });

  describe('createMicroserviceVolumeMappingEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');

    def('hostDestination', () => '/var/dest');
    def('containerDestination', () => '/var/dest');
    def('accessMode', () => 'rw');

    def('req', () => ({
      params: {
        uuid: $uuid
      },
      body: {
        hostDestination: $hostDestination,
        containerDestination: $containerDestination,
        accessMode: $accessMode
      }
    }));
    def('response', () => Promise.resolve({id: 15}));
    def('subject', () => $subject.createMicroserviceVolumeMappingEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'createVolumeMapping').returns($response);
    });

    it('calls MicroservicesService.createVolumeMapping with correct args', async () => {
      await $subject;
      expect(MicroservicesService.createVolumeMapping).to.have.been.calledWith($uuid, {
        hostDestination: $hostDestination,
        containerDestination: $containerDestination,
        accessMode: $accessMode
      }, $user, false);
    });

    context('when MicroservicesService#createVolumeMapping fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#createVolumeMapping succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('id');
      })
    })
  });

  describe('listMicroserviceVolumeMappingsEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');

    def('req', () => ({
      params: {
        uuid: $uuid
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.listMicroserviceVolumeMappingsEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'listVolumeMappings').returns($response);
    });

    it('calls MicroservicesService.listVolumeMappings with correct args', async () => {
      await $subject;
      expect(MicroservicesService.listVolumeMappings).to.have.been.calledWith($uuid, $user, false);
    });

    context('when MicroservicesService#listVolumeMappings fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#listVolumeMappings succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('volumeMappings');
      })
    })
  });

  describe('deleteMicroserviceVolumeMappingEndPoint.()', () => {
    def('user', () => 'user!');
    def('uuid', () => 'testUuid');
    def('id', () => 35);

    def('req', () => ({
      params: {
        uuid: $uuid,
        id: $id
      }
    }));
    def('response', () => Promise.resolve());
    def('subject', () => $subject.deleteMicroserviceVolumeMappingEndPoint($req, $user));

    beforeEach(() => {
      $sandbox.stub(MicroservicesService, 'deleteVolumeMapping').returns($response);
    });

    it('calls MicroservicesService.deleteVolumeMapping with correct args', async () => {
      await $subject;
      expect(MicroservicesService.deleteVolumeMapping).to.have.been.calledWith($uuid, $id, $user, false);
    });

    context('when MicroservicesService#deleteVolumeMapping fails', () => {
      const error = 'Error!';

      def('response', () => Promise.reject(error));

      it(`fails with "${error}"`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroservicesService#deleteVolumeMapping succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  });

});
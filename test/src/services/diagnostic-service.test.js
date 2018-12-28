const {expect} = require('chai');
const sinon = require('sinon');

const StraceDiagnosticManager = require('../../../src/sequelize/managers/strace-diagnostics-manager');
const DiagnosticService = require('../../../src/services/diagnostic-service');
const MicroserviceService = require('../../../src/services/microservices-service');
const ChangeTrackingService = require('../../../src/services/change-tracking-service');
const Validator = require('../../../src/schemas');
const MicroserviceManager = require('../../../src/sequelize/managers/microservice-manager');
const Config = require('../../../src/config');

describe('DiagnosticService Service', () => {
  def('subject', () => DiagnosticService);
  def('sandbox', () => sinon.createSandbox());

  const isCLI = true;

  afterEach(() => $sandbox.restore());

  describe('.changeMicroserviceStraceState()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = 'user!';

    const uuid = 'testUuid';

    const data = {
      enable: true
    };

    const straceObj = {
      straceRun: data.enable,
      microserviceUuid: uuid
    };

    const microservice = {
      iofogUuid: 'testIoFogUuid'
    };

    def('subject', () => $subject.changeMicroserviceStraceState(uuid, data, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('getMicroserviceResponse', () => Promise.resolve(microservice));
    def('updateOrCreateDiagnosticResponse', () => Promise.resolve());
    def('updateChangeTrackingResponse', () => Promise.resolve());


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(MicroserviceService, 'getMicroservice').returns($getMicroserviceResponse);
      $sandbox.stub(StraceDiagnosticManager, 'updateOrCreate').returns($updateOrCreateDiagnosticResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.straceStateUpdate);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls MicroserviceService#getMicroservice() with correct args', async () => {
        await $subject;
        expect(MicroserviceService.getMicroservice).to.have.been.calledWith(uuid, user, isCLI, transaction);
      });

      context('when MicroserviceService#getMicroservice() fails', () => {
        def('getMicroserviceResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when MicroserviceService#getMicroservice() succeeds', () => {
        it('calls StraceDiagnosticManager#updateOrCreate() with correct args', async () => {
          await $subject;
          expect(StraceDiagnosticManager.updateOrCreate).to.have.been.calledWith({
            microserviceUuid: uuid
          }, straceObj, transaction);
        });

        context('when StraceDiagnosticManager#updateOrCreate() fails', () => {
          def('updateOrCreateDiagnosticResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        });

        context('when StraceDiagnosticManager#updateOrCreate() succeeds', () => {
          it('calls ChangeTrackingService#update() with correct args', async () => {
            await $subject;
            expect(ChangeTrackingService.update).to.have.been.calledWith(microservice.iofogUuid,
              ChangeTrackingService.events.diagnostics, transaction);
          });

          context('when ChangeTrackingService#update() fails', () => {
            def('updateChangeTrackingResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          });

          context('when ChangeTrackingService#update() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })
        })
      })
    })
  });

  describe('.getMicroserviceStraceData()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const data = {
      format: 'string'
    };

    const microservice = {
      iofogUuid: 'testIoFogUuid'
    };

    def('subject', () => $subject.getMicroserviceStraceData(uuid, data, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('getMicroserviceResponse', () => Promise.resolve(microservice));
    def('findStraceResponse', () => Promise.resolve({}));
    def('configGetResponse', () => Promise.resolve());


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(MicroserviceManager, 'findOne').returns($getMicroserviceResponse);
      $sandbox.stub(StraceDiagnosticManager, 'findOne').returns($findStraceResponse);
      $sandbox.stub(Config, 'get').returns($configGetResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.straceGetData);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls MicroserviceManager#findOne() with correct args', async () => {
        await $subject;
        const microserviceWhere = isCLI
          ? {uuid: uuid}
          : {uuid: uuid, userId: user.id};
        expect(MicroserviceManager.findOne).to.have.been.calledWith(microserviceWhere, transaction);
      });


      context('when MicroserviceManager#findOne() fails', () => {
        def('getMicroserviceResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when MicroserviceManager#findOne() succeeds', () => {
        it('calls StraceDiagnosticManager#findOne() with correct args', async () => {
          await $subject;
          expect(StraceDiagnosticManager.findOne).to.have.been.calledWith({
            microserviceUuid: uuid
          }, transaction);
        });

        context('when StraceDiagnosticManager#findOne() fails', () => {
          def('findStraceResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        });

        context('when StraceDiagnosticManager#findOne() succeeds', () => {
          it('calls Config#get() with correct args', async () => {
            await $subject;
            expect(Config.get).to.have.been.calledWith('Diagnostics:DiagnosticDir');
          });

          context('when Config#get() fails', () => {
            def('configGetResponse', () => error);

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.eventually.have.property('data')
            })
          });

          context('when Config#get() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.have.property('data')
            })
          })
        })
      })
    })
  });

  // TODO handle FTP stuff
  // describe('.postMicroserviceStraceDatatoFtp()', () => {
  //   const transaction = {};
  //   const error = 'Error!';
  //
  //   const user = {
  //     id: 15
  //   };
  //
  //   const uuid = 'testUuid';
  //
  //   const data = {
  //     ftpHost: 'testHost',
  //     ftpPort: 5555,
  //     ftpUser: 'testUser',
  //     ftpPass: 'testPass',
  //     ftpDestDir: 'testDir'
  //   };
  //
  //   const microservice = {
  //     iofogUuid: 'testIoFogUuid'
  //   };
  //
  //   def('subject', () => $subject.postMicroserviceStraceDatatoFtp(uuid, data, user, isCLI, transaction));
  //   def('validatorResponse', () => Promise.resolve(true));
  //   def('getMicroserviceResponse', () => Promise.resolve(microservice));
  //   def('findStraceResponse', () => Promise.resolve({}));
  //   def('configGetResponse', () => Promise.resolve());
  //
  //
  //   beforeEach(() => {
  //     $sandbox.stub(Validator, 'validate').returns($validatorResponse);
  //     $sandbox.stub(MicroserviceManager, 'findOne').returns($getMicroserviceResponse);
  //     $sandbox.stub(StraceDiagnosticManager, 'findOne').returns($findStraceResponse);
  //     $sandbox.stub(Config, 'get').returns($configGetResponse);
  //   });
  //
  //   it('calls Validator#validate() with correct args', async () => {
  //     await $subject;
  //     expect(Validator.validate).to.have.been.calledWith(data, Validator.schemas.stracePostToFtp);
  //   });
  //
  //   context('when Validator#validate() fails', () => {
  //     def('validatorResponse', () => Promise.reject(error));
  //
  //     it(`fails with ${error}`, () => {
  //       return expect($subject).to.be.rejectedWith(error)
  //     })
  //   });
  //
  //   context('when Validator#validate() succeeds', () => {
  //     it('calls MicroserviceManager#findOne() with correct args', async () => {
  //       await $subject;
  //       const microserviceWhere = isCLI
  //         ? {uuid: uuid}
  //         : {uuid: uuid, userId: user.id};
  //       expect(MicroserviceManager.findOne).to.have.been.calledWith(microserviceWhere, transaction);
  //     });
  //
  //
  //     context('when MicroserviceManager#findOne() fails', () => {
  //       def('getMicroserviceResponse', () => Promise.reject(error));
  //
  //       it(`fails with ${error}`, () => {
  //         return expect($subject).to.be.rejectedWith(error)
  //       })
  //     });
  //
  //     context('when MicroserviceManager#findOne() succeeds', () => {
  //       it('calls StraceDiagnosticManager#findOne() with correct args', async () => {
  //         await $subject;
  //         expect(StraceDiagnosticManager.findOne).to.have.been.calledWith({
  //           microserviceUuid: uuid
  //         }, transaction);
  //       });
  //
  //       context('when StraceDiagnosticManager#findOne() fails', () => {
  //         def('findStraceResponse', () => Promise.reject(error));
  //
  //         it(`fails with ${error}`, () => {
  //           return expect($subject).to.be.rejectedWith(error)
  //         })
  //       });
  //
  //       context('when StraceDiagnosticManager#findOne() succeeds', () => {
  //         it('calls Config#get() with correct args', async () => {
  //           await $subject;
  //           expect(Config.get).to.have.been.calledWith('Diagnostics:DiagnosticDir');
  //         });
  //
  //         context('when Config#get() fails', () => {
  //           def('configGetResponse', () => error);
  //
  //           it(`fails with ${error}`, () => {
  //             return expect($subject).to.be.eventually.have.property('data')
  //           })
  //         });
  //
  //         context('when Config#get() succeeds', () => {
  //           it('fulfills the promise', () => {
  //             return expect($subject).to.eventually.have.property('data')
  //           })
  //         })
  //       })
  //     })
  //   })
  // });

  describe('.postMicroserviceImageSnapshotCreate()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = 'user!';

    const microserviceUuid = 'testUuid';

    const microserviceToUpdate = {
      imageSnapshot: 'get_image'
    };

    const microservice = {
      iofogUuid: 'testIoFogUuid',
      uuid: 'testMicroserviceUuid'
    };


    def('subject', () => $subject.postMicroserviceImageSnapshotCreate(microserviceUuid, user, isCLI, transaction));
    def('findMicroserviceResponse', () => Promise.resolve(microservice));
    def('updateMicroserviceResponse', () => Promise.resolve());
    def('updateChangeTrackingResponse', () => Promise.resolve());


    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithDependencies').returns($findMicroserviceResponse);
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);
    });

    it('calls MicroserviceManager#findOneWithDependencies() with correct args', async () => {
      await $subject;
      const where = isCLI ?
        {
          uuid: microserviceUuid
        }
        :
        {
          uuid: microserviceUuid,
          userId: user.id
        };
      expect(MicroserviceManager.findOneWithDependencies).to.have.been.calledWith(where, {}, transaction);
    });

    context('when MicroserviceManager#findOneWithDependencies() fails', () => {
      def('findMicroserviceResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroserviceManager#findOneWithDependencies() succeeds', () => {
      it('calls MicroserviceManager#update() with correct args', async () => {
        await $subject;
        expect(MicroserviceManager.update).to.have.been.calledWith({
          uuid: microservice.uuid
        }, microserviceToUpdate, transaction);
      });

      context('when MicroserviceManager#update() fails', () => {
        def('updateMicroserviceResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when MicroserviceManager#update() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject;
          expect(ChangeTrackingService.update).to.have.been.calledWith(microservice.iofogUuid,
            ChangeTrackingService.events.imageSnapshot, transaction);
        });

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        });

        context('when ChangeTrackingService#update() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  });

  describe('.getMicroserviceImageSnapshot()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = 'user!';

    const microserviceUuid = 'testUuid';

    const microserviceToUpdate = {
      imageSnapshot: ''
    };

    const microservice = {
      iofogUuid: 'testIoFogUuid',
      uuid: 'testMicroserviceUuid',
      imageSnapshot: 'testImagePath'
    };


    def('subject', () => $subject.getMicroserviceImageSnapshot(microserviceUuid, user, isCLI, transaction));
    def('findMicroserviceResponse', () => Promise.resolve(microservice));
    def('updateMicroserviceResponse', () => Promise.resolve());


    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithDependencies').returns($findMicroserviceResponse);
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse);
    });

    it('calls MicroserviceManager#findOneWithDependencies() with correct args', async () => {
      await $subject;
      const where = isCLI ?
        {
          uuid: microserviceUuid
        }
        :
        {
          uuid: microserviceUuid,
          userId: user.id
        };
      expect(MicroserviceManager.findOneWithDependencies).to.have.been.calledWith(where, {}, transaction);
    });

    context('when MicroserviceManager#findOneWithDependencies() fails', () => {
      def('findMicroserviceResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    });

    context('when MicroserviceManager#findOneWithDependencies() succeeds', () => {
      it('calls MicroserviceManager#update() with correct args', async () => {
        await $subject;
        expect(MicroserviceManager.update).to.have.been.calledWith({
          uuid: microservice.uuid
        }, microserviceToUpdate, transaction);
      });

      context('when MicroserviceManager#update() fails', () => {
        def('updateMicroserviceResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when MicroserviceManager#update() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.equal(microservice.imageSnapshot)
        })
      })
    })
  });


});
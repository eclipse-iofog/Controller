const {expect} = require('chai');
const sinon = require('sinon');

const AgentService = require('../../../src/services/agent-service');
const Validator = require('../../../src/schemas');
const FogProvisionKeyManager = require('../../../src/sequelize/managers/iofog-provision-key-manager');
const MicroserviceManager = require('../../../src/sequelize/managers/microservice-manager');
const ioFogManager = require('../../../src/sequelize/managers/iofog-manager');
const FogAccessTokenService = require('../../../src/services/iofog-access-token-service');
const AppHelper = require('../../../src/helpers/app-helper');
const ChangeTrackingService = require('../../../src/services/change-tracking-service');
const MicroserviceStatusManager = require('../../../src/sequelize/managers/microservice-status-manager');
const MicroserviceService = require('../../../src/services/microservices-service');

describe('Agent Service', () => {
  def('subject', () => AgentService);
  def('sandbox', () => sinon.createSandbox());

  afterEach(() => $sandbox.restore());

  describe('.agentProvision()', () => {
    const provisionData = {
      type: 1,
      key: 'dpodkqwdpj'
    };

    const transaction = {};
    const error = 'Error!';

    def('uuid', () => 'testUuid');
    def('token', () => 'testToken');

    def('provisionResponse', () => 'provisionResponse');

    def('subject', () => $subject.agentProvision(provisionData, transaction));
    def('accessTokenResponse', () => Promise.resolve($accessTokenObj));

    def('validatorResponse', () => Promise.resolve(true));
    def('fogProvisionKeyManagerResponse', () => Promise.resolve({
      uuid: $uuid
    }));
    def('microserviceManagerResponse', () => Promise.resolve());
    def('iofogManagerResponse', () => Promise.resolve({
      uuid: $uuid
    }));
    def('fogAccessTokenServiceGenerateResponse', () => Promise.resolve({
      token: $token
    }));
    def('fogAccessTokenServiceUpdateResponse', () => Promise.resolve());
    def('iofogManagerUpdateResponse', () => Promise.resolve());
    def('fogProvisionKeyManagerDeleteResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(FogProvisionKeyManager, 'findOne').returns($fogProvisionKeyManagerResponse);
      $sandbox.stub(MicroserviceManager, 'findAllWithDependencies').returns($microserviceManagerResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($iofogManagerResponse);
      $sandbox.stub(FogAccessTokenService, 'generateAccessToken').returns($fogAccessTokenServiceGenerateResponse);
      $sandbox.stub(FogAccessTokenService, 'updateAccessToken').returns($fogAccessTokenServiceUpdateResponse);
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse);
      $sandbox.stub(FogProvisionKeyManager, 'delete').returns($fogProvisionKeyManagerDeleteResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(provisionData, Validator.schemas.agentProvision);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls FogProvisionKeyManager.findOne with correct args', async () => {
        await $subject;
        expect(FogProvisionKeyManager.findOne).to.have.been.calledWith({
          provisionKey: provisionData.key
        }, transaction);
      });

      context('when FogProvisionKeyManager#findOne fails', () => {
        const error = 'Error!';

        def('fogProvisionKeyManagerResponse', () => Promise.reject(error));

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      });

      context('when ioFogManager#findOne succeeds', () => {
        it('calls ioFogManager.findOne with correct args', async () => {
          await $subject;
          expect(ioFogManager.findOne).to.have.been.calledWith({
            uuid: $fogProvisionKeyManagerResponse.uuid
          }, transaction);
        });

        context('when ioFogManager#findOne fails', () => {
          const error = 'Error!';

          def('iofogManagerResponse', () => Promise.reject(error));

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        });

        context('when ioFogManager#findOne succeeds', () => {
          it('calls MicroserviceManager.findAllWithDependencies with correct args', async () => {
            await $subject;
            expect(MicroserviceManager.findAllWithDependencies).to.have.been.calledWith({
              iofogUuid: $uuid
            }, {}, transaction);
          });

          context('when MicroserviceManager#findAllWithDependencies fails', () => {
            const error = 'Error!';

            def('microserviceManagerResponse', () => Promise.reject(error));

            it(`fails with "${error}"`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          });

          context('when MicroserviceManager#findAllWithDependencies succeeds', () => {
            it('calls FogAccessTokenService.generateAccessToken with correct args', async () => {
              await $subject;
              expect(FogAccessTokenService.generateAccessToken).to.have.been.calledWith(transaction);
            });

            context('when FogAccessTokenService#generateAccessToken fails', () => {
              const error = 'Error!';

              def('fogAccessTokenServiceGenerateResponse', () => Promise.reject(error));

              it(`fails with "${error}"`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            });

            context('when FogAccessTokenService#generateAccessToken succeeds', () => {
              it('calls FogAccessTokenService.updateAccessToken with correct args', async () => {
                await $subject;
                expect(FogAccessTokenService.updateAccessToken).to.have.been.calledWith($uuid, {
                  token: $token
                }, transaction);
              });

              context('when FogAccessTokenService#updateAccessToken fails', () => {
                const error = 'Error!';

                def('fogAccessTokenServiceUpdateResponse', () => Promise.reject(error));

                it(`fails with "${error}"`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              });

              context('when FogAccessTokenService#updateAccessToken succeeds', () => {
                it('calls ioFogManager.update with correct args', async () => {
                  await $subject;
                  expect(ioFogManager.update).to.have.been.calledWith({
                    uuid: $uuid
                  }, {
                    fogTypeId: provisionData.type
                  }, transaction);
                });

                context('when ioFogManager#update fails', () => {
                  const error = 'Error!';

                  def('iofogManagerUpdateResponse', () => Promise.reject(error));

                  it(`fails with "${error}"`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                });

                context('when ioFogManager#update succeeds', () => {
                  it('calls FogProvisionKeyManager.delete with correct args', async () => {
                    await $subject;
                    expect(FogProvisionKeyManager.delete).to.have.been.calledWith({
                      provisionKey: provisionData.key
                    }, transaction);
                  });

                  context('when FogProvisionKeyManager#delete fails', () => {
                    const error = 'Error!';

                    def('fogProvisionKeyManagerDeleteResponse', () => Promise.reject(error));

                    it(`fails with "${error}"`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  });

                  context('when FogProvisionKeyManager#delete succeeds', () => {
                    it(`succeeds`, () => {
                      return expect($subject).to.eventually.have.property('uuid') &&
                        expect($subject).to.eventually.have.property('token');
                    })
                  })
                })
              })
            })
          })
        })
      })
    });
  });

  describe('.updateAgentConfig()', () => {
    const agentConfig = {
      networkInterface: "testNetworkInterface",
      dockerUrl: "testDockerUrl",
      diskLimit: 5,
      diskDirectory: "testDiskDirectory",
      memoryLimit: 15,
      cpuLimit: 25,
      logLimit: 35,
      logDirectory: 'testLogDirectory',
      logFileCount: 15,
      statusFrequency: 40,
      changeFrequency: 45,
      deviceScanFrequency: 50,
      watchdogEnabled: false,
      latitude: 35,
      longitude: 36,
      gpsMode: 'testGpsMode'
    };

    const transaction = {};
    const error = 'Error!';

    def('uuid', () => 'testUuid');

    def('fog', () => ({
      uuid: $uuid
    }));

    def('token', () => 'testToken');

    def('updateAgentResponse', () => 'updateAgentResponse');

    def('subject', () => $subject.updateAgentConfig(agentConfig, $fog, transaction));

    def('validatorResponse', () => Promise.resolve(true));
    def('deleteUndefinedFieldsResponse', () => agentConfig);
    def('iofogManagerUpdateResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse);
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(agentConfig, Validator.schemas.updateAgentConfig);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
        await $subject;
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(agentConfig);
      });

      context('when AppHelper#deleteUndefinedFields fails', () => {
        const error = 'Error!';

        def('deleteUndefinedFieldsResponse', () => error);

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      });

      context('when AppHelper#deleteUndefinedFields succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject;
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid
          }, agentConfig, transaction);
        });

        context('when ioFogManager#update fails', () => {
          const error = 'Error!';

          def('iofogManagerUpdateResponse', () => Promise.reject(error));

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        });

        context('when ioFogManager#update succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.eventually.equal(undefined);
          })
        })

      })
    });
  });

  describe('.getAgentConfigChanges()', () => {
    const configChanges = {
      config: undefined,
      version: undefined,
      reboot: undefined,
      deleteNode: undefined,
      microserviceList: undefined,
      microserviceConfig: undefined,
      routing: undefined,
      registries: undefined,
      tunnel: undefined,
      diagnostics: undefined,
      isImageSnapshot: undefined
    };

    const transaction = {};
    const error = 'Error!';

    def('uuid', () => 'testUuid');

    def('fog', () => ({
      uuid: $uuid
    }));

    def('token', () => 'testToken');

    def('subject', () => $subject.getAgentConfigChanges($fog, transaction));

    def('getByFogIdResponse', () => 'getByFogIdResponse');
    def('updateIfChangedResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(ChangeTrackingService, 'getByFogId').returns($getByFogIdResponse);
      $sandbox.stub(ChangeTrackingService, 'updateIfChanged').returns($updateIfChangedResponse);
    });

    it('calls ChangeTrackingService#getByFogId() with correct args', async () => {
      await $subject;
      expect(ChangeTrackingService.getByFogId).to.have.been.calledWith($uuid, transaction);
    });

    context('when ChangeTrackingService#getByFogId() fails', () => {
      def('getByFogIdResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when ChangeTrackingService#getByFogId() succeeds', () => {
      it('calls ChangeTrackingService.updateIfChanged with correct args', async () => {
        await $subject;
        expect(ChangeTrackingService.updateIfChanged).to.have.been.calledWith($uuid,
          ChangeTrackingService.events.clean, transaction);
      });

      context('when ChangeTrackingService#updateIfChanged fails', () => {
        const error = 'Error!';

        def('deleteUndefinedFieldsResponse', () => error);

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      });

      context('when ChangeTrackingService#updateIfChanged succeeds', () => {
        it(`succeeds`, () => {
          return expect($subject).to.eventually.deep.equal(configChanges);
        })
      })
    });
  });

  describe('.updateAgentStatus()', () => {
    const microservicesStatus = "[{\"containerId\":\"testContainerId\", \"status\":\"RUNNING\"" +
      ",\"startTime\":5325543453454,\"operatingDuration\":534535435435,\"cpuUsage\":35,\"memoryUsage\":45}]";

    const microserviceStatus = {
      "containerId": "testContainerId",
      "status": "RUNNING",
      "startTime": 5325543453454,
      "operatingDuration": 534535435435,
      "cpuUsage": 35,
      "memoryUsage": 45
    };

    const microserviceStatusArray = [microserviceStatus];

    const fogStatus = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      repositoryCount: 5,
      repositoryStatus: 'testStatus',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      processedMessages: 155,
      microserviceMessageCounts: 'testMessageCounts',
      messageSpeed: 255,
      lastCommandTime: 15325235253,
      tunnelStatus: 'testTunnelStatus',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false,
      microserviceStatus: microservicesStatus
    };

    const agentStatus = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      repositoryCount: 5,
      repositoryStatus: 'testStatus',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      processedMessages: 155,
      microserviceMessageCounts: 'testMessageCounts',
      messageSpeed: 255,
      lastCommandTime: 15325235253,
      tunnelStatus: 'testTunnelStatus',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false
    };

    const transaction = {};
    const error = 'Error!';

    def('uuid', () => 'testUuid');

    def('fog', () => ({
      uuid: $uuid
    }));

    def('token', () => 'testToken');

    def('subject', () => $subject.updateAgentStatus(fogStatus, $fog, transaction));

    def('validatorResponse', () => Promise.resolve(true));
    def('deleteUndefinedFieldsResponse', () => agentStatus);
    def('deleteUndefinedFieldsResponse2', () => microserviceStatus);
    def('updateResponse', () => Promise.resolve());
    def('jsonParseResponse', () => microserviceStatusArray);
    def('updateMicroserviceStatusesResponse', () => Promise.resolve());
    def('deleteNotRunningResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields')
        .onFirstCall().returns($deleteUndefinedFieldsResponse)
        .onSecondCall().returns($deleteUndefinedFieldsResponse2);
      $sandbox.stub(ioFogManager, 'update').returns($updateResponse);
      $sandbox.stub(JSON, 'parse').returns($jsonParseResponse);
      $sandbox.stub(MicroserviceStatusManager, 'update').returns($updateMicroserviceStatusesResponse);
      $sandbox.stub(MicroserviceService, 'deleteNotRunningMicroservices').returns($deleteNotRunningResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogStatus, Validator.schemas.updateAgentStatus);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
        await $subject;
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(agentStatus);
      });

      context('when AppHelper#deleteUndefinedFields fails', () => {
        const error = 'Error!';

        def('$deleteUndefinedFieldsResponse', () => error);

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      });

      context('when AppHelper#deleteUndefinedFields succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject;
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid
          }, agentStatus, transaction);
        });

        context('when ioFogManager#update fails', () => {
          const error = 'Error!';

          def('updateResponse', () => error);

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith = (error)
          })
        });

        context('when ioFogManager#update succeeds', () => {
          it('calls JSON.parse with correct args', async () => {
            await $subject;
            expect(JSON.parse).to.have.been.calledWith(fogStatus.microserviceStatus);
          });

          context('when JSON#parse fails', () => {
            const error = 'Error!';

            def('jsonParseResponse', () => error);

            it(`fails with "${error}"`, () => {
              return expect($subject).to.be.rejectedWith = (error)
            })
          });

          context('when JSON#parse succeeds', () => {
            it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
              await $subject;
              expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(microserviceStatus);
            });

            context('when AppHelper#deleteUndefinedFields fails', () => {
              const error = 'Error!';

              def('$deleteUndefinedFieldsResponse2', () => error);

              it(`fails with "${error}"`, () => {
                return expect($subject).to.be.rejectedWith = (error)
              })
            });

            context('when AppHelper#deleteUndefinedFields succeeds', () => {
              it('calls MicroserviceStatusManager.update with correct args', async () => {
                await $subject;
                expect(MicroserviceStatusManager.update).to.have.been.calledWith({
                  microserviceUuid: microserviceStatus.id
                }, microserviceStatus, transaction);
              });

              context('when MicroserviceStatusManager#update fails', () => {
                const error = 'Error!';

                def('updateMicroserviceStatusesResponse', () => error);

                it(`fails with "${error}"`, () => {
                  return expect($subject).to.be.rejectedWith = (error)
                })
              });

              context('when MicroserviceStatusManager#update succeeds', () => {
                it('calls MicroserviceService.deleteNotRunningMicroservices with correct args', async () => {
                  await $subject;
                  expect(MicroserviceService.deleteNotRunningMicroservices).to.have.been.calledWith(transaction);
                });

                context('when MicroserviceService#deleteNotRunningMicroservices fails', () => {
                  const error = 'Error!';

                  def('deleteNotRunningResponse', () => error);

                  it(`fails with "${error}"`, () => {
                    return expect($subject).to.be.rejectedWith = (error)
                  })
                });

                context('when MicroserviceService#deleteNotRunningMicroservices succeeds', () => {
                  it(`succeeds`, () => {
                    return expect($subject).to.eventually.equal(undefined);
                  })
                })
              })
            })
          })
        })
      })
    });
  });


});
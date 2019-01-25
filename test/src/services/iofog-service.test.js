const {expect} = require('chai');
const sinon = require('sinon');

const ioFogManager = require('../../../src/sequelize/managers/iofog-manager');
const ioFogService = require('../../../src/services/iofog-service');
const AppHelper = require('../../../src/helpers/app-helper');
const Validator = require('../../../src/schemas');
const ChangeTrackingService = require('../../../src/services/change-tracking-service');
const CatalogService = require('../../../src/services/catalog-service');
const MicroserviceManager = require('../../../src/sequelize/managers/microservice-manager');
const ioFogProvisionKeyManager = require('../../../src/sequelize/managers/iofog-provision-key-manager');
const ioFogVersionCommandManager = require('../../../src/sequelize/managers/iofog-version-command-manager');
const HWInfoManager = require('../../../src/sequelize/managers/hw-info-manager');
const USBInfoManager = require('../../../src/sequelize/managers/usb-info-manager');

describe('ioFog Service', () => {
  def('subject', () => ioFogService);
  def('sandbox', () => sinon.createSandbox());

  const isCLI = false;

  afterEach(() => $sandbox.restore());

  describe('.createFog()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const date = 155555555;

    const uuid = 'testUuid';
    const uuid2 = 'testUuid2';
    const uuid3 = 'testUuid3';

    const fogData = {
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      deviceScanFrequency: 26,
      bluetoothEnabled: true,
      watchdogEnabled: false,
      abstractedHardwareEnabled: true,
      fogType: 1
    };

    const createFogData = {
      uuid: uuid,
      name: fogData.name,
      location: fogData.location,
      latitude: fogData.latitude,
      longitude: fogData.longitude,
      gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
      description: fogData.description,
      dockerUrl: fogData.dockerUrl,
      diskLimit: fogData.diskLimit,
      diskDirectory: fogData.diskDirectory,
      memoryLimit: fogData.memoryLimit,
      cpuLimit: fogData.cpuLimit,
      logLimit: fogData.logLimit,
      logDirectory: fogData.logDirectory,
      logFileCount: fogData.logFileCount,
      statusFrequency: fogData.statusFrequency,
      changeFrequency: fogData.changeFrequency,
      deviceScanFrequency: fogData.deviceScanFrequency,
      bluetoothEnabled: fogData.bluetoothEnabled,
      watchdogEnabled: fogData.watchdogEnabled,
      abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
      fogTypeId: fogData.fogType,
      userId: user.id
    };

    const halItem = {
      id: 10
    };

    const oldFog = null;
    const halMicroserviceData = {
      uuid: uuid2,
      name: `Hal for Fog ${createFogData.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: createFogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date
    };


    const bluetoothItem = {
      id: 10
    };
    const bluetoothMicroserviceData = {
      uuid: uuid3,
      name: `Bluetooth for Fog ${createFogData.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: createFogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date
    };


    const response = {
      uuid: uuid
    };

    def('subject', () => $subject.createFog(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('generateRandomStringResponse', () => uuid);
    def('generateRandomStringResponse2', () => uuid2);
    def('generateRandomStringResponse3', () => uuid3);
    def('deleteUndefinedFieldsResponse', () => createFogData);
    def('createIoFogResponse', () => Promise.resolve(response));
    def('createChangeTrackingResponse', () => Promise.resolve());
    def('getHalCatalogItemResponse', () => Promise.resolve(halItem));
    def('createMicroserviceResponse', () => Promise.resolve());
    def('createMicroserviceResponse2', () => Promise.resolve());
    def('getBluetoothCatalogItemResponse', () => Promise.resolve(bluetoothItem));
    def('updateChangeTrackingResponse', () => Promise.resolve());

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'generateRandomString')
        .onFirstCall().returns($generateRandomStringResponse)
        .onSecondCall().returns($generateRandomStringResponse2)
        .onThirdCall().returns($generateRandomStringResponse3);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse);
      $sandbox.stub(ioFogManager, 'create').returns($createIoFogResponse);
      $sandbox.stub(ChangeTrackingService, 'create').returns($createChangeTrackingResponse);
      $sandbox.stub(CatalogService, 'getHalCatalogItem').returns($getHalCatalogItemResponse);
      $sandbox.stub(MicroserviceManager, 'create')
        .onFirstCall().returns($createMicroserviceResponse)
        .onSecondCall().returns($createMicroserviceResponse2);
      $sandbox.stub(CatalogService, 'getBluetoothCatalogItem').returns($getBluetoothCatalogItemResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);

      $sandbox.stub(Date, 'now').returns($dateResponse);

    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogCreate);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#generateRandomString() with correct args', async () => {
        await $subject;
        expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
      });

      context('when AppHelper#generateRandomString() fails', () => {
        def('generateRandomStringResponse', () => error);

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('uuid');
        })
      });

      context('when AppHelper#generateRandomString() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject;

          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(createFogData);
        });

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse', () => error);

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('uuid')
          })
        });

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls ioFogManager#create() with correct args', async () => {
            await $subject;

            expect(ioFogManager.create).to.have.been.calledWith(createFogData);
          });

          context('when ioFogManager#create() fails', () => {
            def('createIoFogResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error);
            })
          });

          context('when ioFogManager#create() succeeds', () => {
            it('calls ChangeTrackingService#create() with correct args', async () => {
              await $subject;

              expect(ChangeTrackingService.create).to.have.been.calledWith(uuid, transaction);
            });

            context('when ChangeTrackingService#create() fails', () => {
              def('createIoFogResponse', () => Promise.reject(error));

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error);
              })
            });

            context('when ChangeTrackingService#create() succeeds', () => {
              it('calls CatalogService#getHalCatalogItem() with correct args', async () => {
                await $subject;

                expect(CatalogService.getHalCatalogItem).to.have.been.calledWith(transaction);
              });

              context('when CatalogService#getHalCatalogItem() fails', () => {
                def('getHalCatalogItemResponse', () => Promise.reject(error));

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error);
                })
              });

              context('when CatalogService#getHalCatalogItem() succeeds', () => {
                it('calls AppHelper#generateRandomString() with correct args', async () => {
                  await $subject;

                  expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
                });

                context('when AppHelper#generateRandomString() fails', () => {
                  def('generateRandomStringResponse2', () => error);

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.have.property('uuid');
                  })
                });

                context('when AppHelper#generateRandomString() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject;

                    expect(MicroserviceManager.create).to.have.been.calledWith(halMicroserviceData, transaction);
                  });

                  context('when MicroserviceManager#create() fails', () => {
                    def('createMicroserviceResponse', () => Promise.reject(error));

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error);
                    })
                  });

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls CatalogService#getBluetoothCatalogItem() with correct args', async () => {
                      await $subject;

                      expect(CatalogService.getBluetoothCatalogItem).to.have.been.calledWith(transaction);
                    });

                    context('when CatalogService#getBluetoothCatalogItem() fails', () => {
                      def('getBluetoothCatalogItemResponse', () => Promise.reject(error));

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error);
                      })
                    });

                    context('when CatalogService#getBluetoothCatalogItem() succeeds', () => {
                      it('calls AppHelper#generateRandomString() with correct args', async () => {
                        await $subject;

                        expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
                      });

                      context('when AppHelper#generateRandomString() fails', () => {
                        def('generateRandomStringResponse3', () => Promise.reject(error));

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.eventually.have.property('uuid');
                        })
                      });

                      context('when AppHelper#generateRandomString() succeeds', () => {
                        it('calls MicroserviceManager#create() with correct args', async () => {
                          await $subject;

                          expect(MicroserviceManager.create).to.have.been.calledWith(bluetoothMicroserviceData, transaction);
                        });

                        context('when MicroserviceManager#create() fails', () => {
                          def('createMicroserviceResponse2', () => Promise.reject(error));

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error);
                          })
                        });

                        context('when MicroserviceManager#create() succeeds', () => {
                          it('calls ChangeTrackingService#update() with correct args', async () => {
                            await $subject;

                            expect(ChangeTrackingService.update).to.have.been.calledWith(createFogData.uuid,
                              ChangeTrackingService.events.microserviceCommon, transaction);
                          });

                          context('when ChangeTrackingService#update() fails', () => {
                            def('updateChangeTrackingResponse', () => Promise.reject(error));

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.be.rejectedWith(error);
                            })
                          });

                          context('when ChangeTrackingService#update() succeeds', () => {
                            it('fulfills the promise', () => {
                              return expect($subject).to.eventually.have.property('uuid')
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  });

  describe('.updateFog()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const date = 155555555;

    const uuid = 'testUuid';
    const uuid2 = 'testUuid2';
    const uuid3 = 'testUuid3';

    const fogData = {
      uuid: uuid,
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      deviceScanFrequency: 26,
      bluetoothEnabled: true,
      watchdogEnabled: false,
      abstractedHardwareEnabled: true,
      fogType: 1
    };

    const oldFog = {
      uuid: uuid2,
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      deviceScanFrequency: 26,
      bluetoothEnabled: false,
      watchdogEnabled: false,
      abstractedHardwareEnabled: false,
      fogType: 1
    };

    const queryFogData = isCLI
      ? {uuid: fogData.uuid}
      : {uuid: fogData.uuid, userId: user.id};

    let updateFogData = {
      name: fogData.name,
      location: fogData.location,
      latitude: fogData.latitude,
      longitude: fogData.longitude,
      gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
      description: fogData.description,
      dockerUrl: fogData.dockerUrl,
      diskLimit: fogData.diskLimit,
      diskDirectory: fogData.diskDirectory,
      memoryLimit: fogData.memoryLimit,
      cpuLimit: fogData.cpuLimit,
      logLimit: fogData.logLimit,
      logDirectory: fogData.logDirectory,
      logFileCount: fogData.logFileCount,
      statusFrequency: fogData.statusFrequency,
      changeFrequency: fogData.changeFrequency,
      deviceScanFrequency: fogData.deviceScanFrequency,
      bluetoothEnabled: fogData.bluetoothEnabled,
      watchdogEnabled: fogData.watchdogEnabled,
      abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
      fogTypeId: fogData.fogType,
    };

    const halItem = {
      id: 10
    };
    const halMicroserviceData = {
      uuid: uuid2,
      name: `Hal for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date
    };


    const bluetoothItem = {
      id: 10
    };
    const bluetoothMicroserviceData = {
      uuid: uuid3,
      name: `Bluetooth for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date
    };

    def('subject', () => $subject.updateFog(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('deleteUndefinedFieldsResponse', () => updateFogData);
    def('findIoFogResponse', () => Promise.resolve(oldFog));
    def('updateIoFogResponse', () => Promise.resolve());
    def('updateChangeTrackingResponse', () => Promise.resolve());
    def('updateChangeTrackingResponse2', () => Promise.resolve());
    def('getHalCatalogItemResponse', () => Promise.resolve(halItem));
    def('generateRandomStringResponse', () => uuid2);
    def('generateRandomStringResponse2', () => uuid3);
    def('createMicroserviceResponse', () => Promise.resolve());
    def('createMicroserviceResponse2', () => Promise.resolve());
    def('getBluetoothCatalogItemResponse', () => Promise.resolve(bluetoothItem));

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(ioFogManager, 'update').returns($updateIoFogResponse);
      $sandbox.stub(ChangeTrackingService, 'update')
        .onFirstCall().returns($updateChangeTrackingResponse)
        .onSecondCall().returns($updateChangeTrackingResponse2);
      $sandbox.stub(CatalogService, 'getHalCatalogItem').returns($getHalCatalogItemResponse);
      $sandbox.stub(AppHelper, 'generateRandomString')
        .onFirstCall().returns($generateRandomStringResponse)
        .onSecondCall().returns($generateRandomStringResponse2);
      $sandbox.stub(MicroserviceManager, 'create')
        .onFirstCall().returns($createMicroserviceResponse)
        .onSecondCall().returns($createMicroserviceResponse2);
      $sandbox.stub(CatalogService, 'getBluetoothCatalogItem').returns($getBluetoothCatalogItemResponse);

      $sandbox.stub(Date, 'now').returns($dateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogUpdate);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
        await $subject;

        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(updateFogData);
      });

      context('when AppHelper#deleteUndefinedFields() fails', () => {
        def('deleteUndefinedFieldsResponse', () => error);

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined);
        })
      });

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('calls ioFogManager#findOne() with correct args', async () => {
          await $subject;

          expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
        });

        context('when ioFogManager#findOne() fails', () => {
          def('findIoFogResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when ioFogManager#findOne() succeeds', () => {
          it('calls ioFogManager#update() with correct args', async () => {
            await $subject;

            expect(ioFogManager.update).to.have.been.calledWith(queryFogData,
              updateFogData, transaction);
          });

          context('when ioFogManager#update() fails', () => {
            def('updateIoFogResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error);
            })
          });

          context('when ioFogManager#update() succeeds', () => {
            it('calls ChangeTrackingService#update() with correct args', async () => {
              await $subject;

              expect(ChangeTrackingService.update).to.have.been.calledWith(uuid,
                ChangeTrackingService.events.config, transaction);
            });

            context('when ChangeTrackingService#update() fails', () => {
              def('updateChangeTrackingResponse', () => Promise.reject(error));

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error);
              })
            });

            context('when ChangeTrackingService#update() succeeds', () => {
              it('calls CatalogService#getHalCatalogItem() with correct args', async () => {
                await $subject;

                expect(CatalogService.getHalCatalogItem).to.have.been.calledWith(transaction);
              });

              context('when CatalogService#getHalCatalogItem() fails', () => {
                def('getHalCatalogItemResponse', () => Promise.reject(error));

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error);
                })
              });

              context('when CatalogService#getHalCatalogItem() succeeds', () => {
                it('calls AppHelper#generateRandomString() with correct args', async () => {
                  await $subject;

                  expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
                });

                context('when AppHelper#generateRandomString() fails', () => {
                  def('generateRandomStringResponse', () => error);

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.equal(undefined);
                  })
                });

                context('when AppHelper#generateRandomString() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject;

                    expect(MicroserviceManager.create).to.have.been.calledWith(halMicroserviceData, transaction);
                  });

                  context('when MicroserviceManager#create() fails', () => {
                    def('createMicroserviceResponse', () => Promise.reject(error));

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error);
                    })
                  });

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls CatalogService#getBluetoothCatalogItem() with correct args', async () => {
                      await $subject;

                      expect(CatalogService.getBluetoothCatalogItem).to.have.been.calledWith(transaction);
                    });

                    context('when CatalogService#getBluetoothCatalogItem() fails', () => {
                      def('getBluetoothCatalogItemResponse', () => Promise.reject(error));

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error);
                      })
                    });

                    context('when CatalogService#getBluetoothCatalogItem() succeeds', () => {
                      it('calls AppHelper#generateRandomString() with correct args', async () => {
                        await $subject;

                        expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
                      });

                      context('when AppHelper#generateRandomString() fails', () => {
                        def('generateRandomStringResponse2', () => Promise.reject(error));

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.eventually.equal(undefined);
                        })
                      });

                      context('when AppHelper#generateRandomString() succeeds', () => {
                        it('calls MicroserviceManager#create() with correct args', async () => {
                          await $subject;

                          expect(MicroserviceManager.create).to.have.been.calledWith(bluetoothMicroserviceData, transaction);
                        });

                        context('when MicroserviceManager#create() fails', () => {
                          def('createMicroserviceResponse2', () => Promise.reject(error));

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error);
                          })
                        });

                        context('when MicroserviceManager#create() succeeds', () => {
                          it('calls ChangeTrackingService#update() with correct args', async () => {
                            await $subject;

                            expect(ChangeTrackingService.update).to.have.been.calledWith(fogData.uuid,
                              ChangeTrackingService.events.microserviceCommon, transaction);
                          });

                          context('when ChangeTrackingService#update() fails', () => {
                            def('updateChangeTrackingResponse2', () => Promise.reject(error));

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.be.rejectedWith(error);
                            })
                          });

                          context('when ChangeTrackingService#update() succeeds', () => {
                            it('fulfills the promise', () => {
                              return expect($subject).to.eventually.equal(undefined);
                            })
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  });

  describe('.deleteFog()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const date = 155555555;

    const uuid = 'testUuid';

    const fogData = {
      uuid: uuid
    };

    const fog = {
      uuid: uuid,
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      daemonStatus: 'RUNNING',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      lastStatusTime: 1555,
      ipAddress: 'testIpAddress',
      deviceScanFrequency: 26,
      bluetoothEnabled: false,
      watchdogEnabled: false,
      abstractedHardwareEnabled: false,
      fogType: 1
    };

    const queryFogData = isCLI
      ? {uuid: fogData.uuid}
      : {uuid: fogData.uuid, userId: user.id};

    const toUpdate = {
      daemonStatus: 'UNKNOWN', ipAddress: '0.0.0.0'
    };

    def('subject', () => $subject.deleteFog(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve(fog));
    def('updateChangeTrackingResponse', () => Promise.resolve());

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogDelete);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;

        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject;

          expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.deleteNode, transaction);
        });

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });
        
        context('when ChangeTrackingService#update() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined);
          })
        })
      })
    })
  });

  describe('.getFog()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const date = 155555555;

    const uuid = 'testUuid';

    const fogData = {
      uuid: uuid
    };

    const fog = {
      uuid: uuid,
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      daemonStatus: 'RUNNING',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      lastStatusTime: 1555,
      ipAddress: 'testIpAddress',
      deviceScanFrequency: 26,
      bluetoothEnabled: false,
      watchdogEnabled: false,
      abstractedHardwareEnabled: false,
      fogType: 1
    };

    const queryFogData = isCLI
      ? {uuid: fogData.uuid}
      : {uuid: fogData.uuid, userId: user.id};

    const toUpdate = {
      daemonStatus: 'UNKNOWN', ipAddress: '0.0.0.0'
    };

    const fogResponse = {
      uuid: fog.uuid,
      name: fog.name,
      location: fog.location,
      gpsMode: fog.gpsMode,
      latitude: fog.latitude,
      longitude: fog.longitude,
      description: fog.description,
      lastActive: fog.lastActive,
      daemonStatus: fog.daemonStatus,
      daemonOperatingDuration: fog.daemonOperatingDuration,
      daemonLastStart: fog.daemonLastStart,
      memoryUsage: fog.memoryUsage,
      diskUsage: fog.diskUsage,
      cpuUsage: fog.cpuUsage,
      memoryViolation: fog.memoryViolation,
      diskViolation: fog.diskViolation,
      cpuViolation: fog.cpuViolation,
      catalogItemStatus: fog.catalogItemStatus,
      repositoryCount: fog.repositoryCount,
      repositoryStatus: fog.repositoryStatus,
      systemTime: fog.systemTime,
      lastStatusTime: fog.lastStatusTime,
      ipAddress: fog.ipAddress,
      processedMessages: fog.processedMessages,
      catalogItemMessageCounts: fog.catalogItemMessageCounts,
      messageSpeed: fog.messageSpeed,
      lastCommandTime: fog.lastCommandTime,
      networkInterface: fog.networkInterface,
      dockerUrl: fog.dockerUrl,
      diskLimit: fog.diskLimit,
      diskDirectory: fog.diskDirectory,
      memoryLimit: fog.memoryLimit,
      cpuLimit: fog.cpuLimit,
      logLimit: fog.logLimit,
      logDirectory: fog.logDirectory,
      bluetoothEnabled: fog.bluetoothEnabled,
      abstractedHardwareEnabled: fog.abstractedHardwareEnabled,
      logFileCount: fog.logFileCount,
      version: fog.version,
      isReadyToUpgrade: fog.isReadyToUpgrade,
      isReadyToRollback: fog.isReadyToRollback,
      statusFrequency: fog.statusFrequency,
      changeFrequency: fog.changeFrequency,
      deviceScanFrequency: fog.deviceScanFrequency,
      tunnel: fog.tunnel,
      watchdogEnabled: fog.watchdogEnabled,
      fogTypeId: fog.fogTypeId,
      userId: fog.userId
    };

    def('subject', () => $subject.getFog(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve(fog));

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogGet);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;

        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.deep.equal(fogResponse);
        })
      })
    })
  });

  describe('.getFogList()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const date = 155555555;

    const uuid = 'testUuid';

    const fog = {
      uuid: uuid,
      name: 'testName',
      location: 'testLocation',
      latitude: 45,
      longitude: 46,
      description: 'testDescription',
      dockerUrl: 'testDockerUrl',
      diskLimit: 15,
      diskDirectory: 'testDirectory',
      daemonStatus: 'RUNNING',
      memoryLimit: 55,
      cpuLimit: 56,
      logLimit: 57,
      logDirectory: 'testLogDirectory',
      logFileCount: 23,
      statusFrequency: 24,
      changeFrequency: 25,
      lastStatusTime: 1555,
      ipAddress: 'testIpAddress',
      deviceScanFrequency: 26,
      bluetoothEnabled: false,
      watchdogEnabled: false,
      abstractedHardwareEnabled: false,
      fogType: 1
    };

    const fogs = [fog];

    const queryFogData = isCLI
      ? {}
      : {userId: user.id};

    const toUpdate = {
      daemonStatus: 'UNKNOWN', ipAddress: '0.0.0.0'
    };

    const filters = [];

    def('subject', () => $subject.getFogList(filters, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findAllIoFogResponse', () => Promise.resolve(fogs));

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findAll').returns($findAllIoFogResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(filters, Validator.schemas.iofogFilters);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findAll() with correct args', async () => {
        await $subject;

        expect(ioFogManager.findAll).to.have.been.calledWith(queryFogData, transaction);
      });

      context('when ioFogManager#findAll() fails', () => {
        def('findAllIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findAll() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.have.property('fogs');
        })
      })
    })
  });

  describe('.generateProvisioningKey()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const date = 155555555;

    const fogData = {
      uuid: uuid
    };

    const queryFogData = isCLI
      ? {uuid: fogData.uuid}
      : {uuid: fogData.uuid, userId: user.id};

    const provisionKey = 'tttttttt';
    const expirationTime = date + (20 * 60 * 1000);

    const newProvision = {
      iofogUuid: fogData.uuid,
      provisionKey: provisionKey,
      expirationTime: expirationTime,
    };

    def('subject', () => $subject.generateProvisioningKey(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('generateRandomStringResponse', () => provisionKey);
    def('findIoFogResponse', () => Promise.resolve({}));
    def('updateOrCreateProvisionKeyResponse', () => Promise.resolve(newProvision));

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').returns($updateOrCreateProvisionKeyResponse);

      $sandbox.stub(Date.prototype, 'getTime').returns($dateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogGenerateProvision);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#generateRandomString() with correct args', async () => {
        await $subject;

        expect(AppHelper.generateRandomString).to.have.been.calledWith(8);
      });

      context('when AppHelper#generateRandomString() fails', () => {
        def('generateRandomStringResponse', () => error);

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('key');
        })
      });

      context('when AppHelper#generateRandomString() succeeds', () => {
        it('calls ioFogManager#findOne() with correct args', async () => {
          await $subject;
          expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
        });

        context('when ioFogManager#findOne() fails', () => {
          def('findIoFogResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when ioFogManager#findOne() succeeds', () => {
          it('calls ioFogProvisionKeyManager#updateOrCreate() with correct args', async () => {
            await $subject;
            expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledWith({
              iofogUuid: fogData.uuid
            }, newProvision, transaction);
          });

          context('when ioFogProvisionKeyManager#updateOrCreate() fails', () => {
            def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error));

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error);
            })
          });

          context('when ioFogProvisionKeyManager#updateOrCreate() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.deep.equal({
                key: provisionKey,
                expirationTime: expirationTime
              })
            })
          })
        })
      })
    })
  });

  describe('.setFogVersionCommand()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const date = 155555555;

    const fogVersionData = {
      uuid: uuid,
      versionCommand: 'upgrade'
    };

    const queryFogData = isCLI
      ? {uuid: fogVersionData.uuid}
      : {uuid: fogVersionData.uuid, userId: user.id};

    const ioFog = {
      uuid: uuid,
      isReadyToUpgrade: true,
      isReadyToRollback: true
    };

    const newVersionCommand = {
      iofogUuid: fogVersionData.uuid,
      versionCommand: fogVersionData.versionCommand
    };

    const provisionKey = 'tttttttt';
    const expirationTime = date + (20 * 60 * 1000);

    const newProvision = {
      iofogUuid: uuid,
      provisionKey: provisionKey,
      expirationTime: expirationTime,
    };

    def('subject', () => $subject.setFogVersionCommand(fogVersionData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve(ioFog));
    def('generateRandomStringResponse', () => provisionKey);
    def('updateOrCreateProvisionKeyResponse', () => Promise.resolve(newProvision));
    def('findIoFogVersionCommandResponse', () => Promise.resolve());
    def('updateChangeTrackingResponse', () => Promise.resolve());

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse);
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').returns($updateOrCreateProvisionKeyResponse);
      $sandbox.stub(ioFogVersionCommandManager, 'updateOrCreate').returns($findIoFogVersionCommandResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);

      $sandbox.stub(Date.prototype, 'getTime').returns($dateResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogVersionData, Validator.schemas.iofogSetVersionCommand);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;
        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('validatorResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls Validator#validate() with correct args', async () => {
          await $subject;
          expect(Validator.validate).to.have.been.calledWith({
            uuid: fogVersionData.uuid
          }, Validator.schemas.iofogGenerateProvision);
        });

        context('when Validator#validate() fails', () => {
          def('validatorResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when Validator#validate() succeeds', () => {
          it('calls AppHelper#generateRandomString() with correct args', async () => {
            await $subject;

            expect(AppHelper.generateRandomString).to.have.been.calledWith(8);
          });

          context('when AppHelper#generateRandomString() fails', () => {
            def('generateRandomStringResponse', () => error);

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined);
            })
          });

          context('when AppHelper#generateRandomString() succeeds', () => {
            it('calls ioFogManager#findOne() with correct args', async () => {
              await $subject;
              expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
            });

            context('when ioFogManager#findOne() fails', () => {
              def('findIoFogResponse', () => Promise.reject(error));

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error);
              })
            });

            context('when ioFogManager#findOne() succeeds', () => {
              it('calls ioFogProvisionKeyManager#updateOrCreate() with correct args', async () => {
                await $subject;
                expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledWith({
                  iofogUuid: uuid
                }, newProvision, transaction);
              });

              context('when ioFogProvisionKeyManager#updateOrCreate() fails', () => {
                def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error));

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error);
                })
              });

              context('when ioFogProvisionKeyManager#updateOrCreate() succeeds', () => {
                it('calls ioFogVersionCommandManager#updateOrCreate() with correct args', async () => {
                  await $subject;
                  expect(ioFogVersionCommandManager.updateOrCreate).to.have.been.calledWith({
                    iofogUuid: fogVersionData.uuid
                  }, newVersionCommand, transaction);
                });

                context('when ioFogVersionCommandManager#updateOrCreate() fails', () => {
                  def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error));

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error);
                  })
                });

                context('when ioFogVersionCommandManager#updateOrCreate() succeeds', () => {
                  it('calls ChangeTrackingService#update() with correct args', async () => {
                    await $subject;
                    expect(ChangeTrackingService.update).to.have.been.calledWith(fogVersionData.uuid,
                      ChangeTrackingService.events.version, transaction);
                  });

                  context('when ChangeTrackingService#update() fails', () => {
                    def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error));

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error);
                    })
                  });

                  context('when ChangeTrackingService#update() succeeds', () => {
                    it('fulfills the promise', () => {
                      return expect($subject).to.eventually.equal(undefined);
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  });

  describe('.setFogRebootCommand()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const date = 155555555;

    const fogData = {
      uuid: uuid
    };

    const queryFogData = isCLI
      ? {uuid: fogData.uuid}
      : {uuid: fogData.uuid, userId: user.id};

    def('subject', () => $subject.setFogRebootCommand(fogData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve({}));
    def('updateChangeTrackingResponse', () => Promise.resolve());

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogReboot);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;
        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject;
          expect(ChangeTrackingService.update).to.have.been.calledWith(fogData.uuid,
            ChangeTrackingService.events.reboot, transaction);
        });

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when ChangeTrackingService#update() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined);
          })
        })
      })
    })
  });

  describe('.getHalHardwareInfo()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const date = 155555555;

    const uuidObj = {
      uuid: uuid
    };

    def('subject', () => $subject.getHalHardwareInfo(uuidObj, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve({}));
    def('findHalHardwareResponse', () => Promise.resolve());

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(HWInfoManager, 'findOne').returns($findHalHardwareResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(uuidObj, Validator.schemas.halGet);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;
        expect(ioFogManager.findOne).to.have.been.calledWith({
          uuid: uuidObj.uuid
        }, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls HWInfoManager#findOne() with correct args', async () => {
          await $subject;
          expect(HWInfoManager.findOne).to.have.been.calledWith({
            iofogUuid: uuidObj.uuid
          }, transaction);
        });

        context('when HWInfoManager#findOne() fails', () => {
          def('findHalHardwareResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when HWInfoManager#findOne() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined);
          })
        })
      })
    })
  });

  describe('.getHalUsbInfo()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const uuid = 'testUuid';

    const date = 155555555;

    const uuidObj = {
      uuid: uuid
    };

    def('subject', () => $subject.getHalUsbInfo(uuidObj, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('findIoFogResponse', () => Promise.resolve({}));
    def('findHalUsbResponse', () => Promise.resolve());

    def('dateResponse', () => date);

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse);
      $sandbox.stub(USBInfoManager, 'findOne').returns($findHalUsbResponse);
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(uuidObj, Validator.schemas.halGet);
    });

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error));

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error);
      })
    });

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject;
        expect(ioFogManager.findOne).to.have.been.calledWith({
          uuid: uuidObj.uuid
        }, transaction);
      });

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error));

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error);
        })
      });

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls USBInfoManager#findOne() with correct args', async () => {
          await $subject;
          expect(USBInfoManager.findOne).to.have.been.calledWith({
            iofogUuid: uuidObj.uuid
          }, transaction);
        });

        context('when USBInfoManager#findOne() fails', () => {
          def('findHalUsbResponse', () => Promise.reject(error));

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error);
          })
        });

        context('when USBInfoManager#findOne() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined);
          })
        })
      })
    })
  });


});
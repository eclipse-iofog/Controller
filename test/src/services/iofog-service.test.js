const { expect } = require('chai')
const sinon = require('sinon')

const ioFogManager = require('../../../src/data/managers/iofog-manager')
const ioFogService = require('../../../src/services/iofog-service')
const RouterManager = require('../../../src/data/managers/router-manager')
const RouterConnectionManager = require('../../../src/data/managers/router-connection-manager')
const RouterService = require('../../../src/services/router-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const CatalogService = require('../../../src/services/catalog-service')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroserviceExtraHostManager = require('../../../src/data/managers/microservice-extra-host-manager')
const ioFogProvisionKeyManager = require('../../../src/data/managers/iofog-provision-key-manager')
const ioFogVersionCommandManager = require('../../../src/data/managers/iofog-version-command-manager')
const HWInfoManager = require('../../../src/data/managers/hw-info-manager')
const USBInfoManager = require('../../../src/data/managers/usb-info-manager')
const Errors = require('../../../src/helpers/errors')
const Op = require('sequelize').Op

describe('ioFog Service', () => {
  def('subject', () => ioFogService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = false

  afterEach(() => $sandbox.restore())

  describe('.createFogEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const date = 155555555

    const uuid = 'testUuid'
    const uuid2 = 'testUuid2'
    const uuid3 = 'testUuid3'

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
      fogType: 1,
      dockerPruningFrequency: 10,
      availableDiskThreshold: 90,
      logLevel: 'INFO',
      isSystem: false,
      host: '1.2.3.4'
    }

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
      isSystem: fogData.isSystem,
      userId: user.id,
      dockerPruningFrequency: 10,
      availableDiskThreshold: 90,
      logLevel: 'INFO',
      routerId: null,
      host: '1.2.3.4'
    }

    const halItem = {
      id: 10,
    }

    const oldFog = null
    const halMicroserviceData = {
      uuid: uuid2,
      name: `Hal for Fog ${createFogData.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: createFogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date,
    }


    const bluetoothItem = {
      id: 10,
    }
    const bluetoothMicroserviceData = {
      uuid: uuid3,
      name: `Bluetooth for Fog ${createFogData.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: createFogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date,
    }


    const response = {
      uuid: uuid,
    }

    const networkRouter = {
      uuid: 'fakeUuid',
      host: 'localhost',
      messagingPort: 5672,
      id: 2
    }

    const router = {
      isEdge: true,
      ...networkRouter,
      iofogUuid: uuid,
      id: 1
    }

    def('subject', () => $subject.createFogEndPoint(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('generateRandomStringResponse', () => uuid)
    def('generateRandomStringResponse2', () => uuid2)
    def('generateRandomStringResponse3', () => uuid3)
    def('deleteUndefinedFieldsResponse', () => createFogData)
    def('createIoFogResponse', () => Promise.resolve(response))
    def('createChangeTrackingResponse', () => Promise.resolve())
    def('getHalCatalogItemResponse', () => Promise.resolve(halItem))
    def('createMicroserviceResponse', () => Promise.resolve())
    def('createMicroserviceResponse2', () => Promise.resolve())
    def('getBluetoothCatalogItemResponse', () => Promise.resolve(bluetoothItem))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    def('getNetworkRouterResponse', () => Promise.resolve(networkRouter))
    def('findOneRouterResponse', () => Promise.resolve(router))
    def('emptyUpstreamRouters', () => Promise.resolve([]))

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'generateRandomString')
          .onFirstCall().returns($generateRandomStringResponse)
          .onSecondCall().returns($generateRandomStringResponse2)
          .onThirdCall().returns($generateRandomStringResponse3)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ioFogManager, 'create').returns($createIoFogResponse)
      $sandbox.stub(ChangeTrackingService, 'create').returns($createChangeTrackingResponse)
      $sandbox.stub(CatalogService, 'getHalCatalogItem').returns($getHalCatalogItemResponse)
      $sandbox.stub(MicroserviceManager, 'create')
          .onFirstCall().returns($createMicroserviceResponse)
          .onSecondCall().returns($createMicroserviceResponse2)
      $sandbox.stub(CatalogService, 'getBluetoothCatalogItem').returns($getBluetoothCatalogItemResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)

      $sandbox.stub(RouterService, 'getNetworkRouter').returns($getNetworkRouterResponse)
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      $sandbox.stub(RouterService, 'validateAndReturnUpstreamRouters').returns($emptyUpstreamRouters)
      $sandbox.stub(RouterService, 'createRouterForFog').returns($findOneRouterResponse)
      $sandbox.stub(ioFogManager, 'update').returns($createIoFogResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns(Promise.resolve())

      $sandbox.stub(Date, 'now').returns($dateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogCreate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#generateRandomString() with correct args', async () => {
        await $subject
        expect(AppHelper.generateRandomString).to.have.been.calledWith(32)
      })

      context('when AppHelper#generateRandomString() fails', () => {
        def('generateRandomStringResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('uuid')
        })
      })

      context('when AppHelper#generateRandomString() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject

          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(createFogData)
        })

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('uuid')
          })
        })

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls ioFogManager#create() with correct args', async () => {
            await $subject

            expect(ioFogManager.create).to.have.been.calledWith(createFogData)
          })

          context('when ioFogManager#create() fails', () => {
            def('createIoFogResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ioFogManager#create() succeeds', () => {
            it('calls ChangeTrackingService#create() with correct args', async () => {
              await $subject

              expect(ChangeTrackingService.create).to.have.been.calledWith(uuid, transaction)
            })

            context('when ChangeTrackingService#create() fails', () => {
              def('createIoFogResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ChangeTrackingService#create() succeeds', () => {
              it('calls CatalogService#getHalCatalogItem() with correct args', async () => {
                await $subject

                expect(CatalogService.getHalCatalogItem).to.have.been.calledWith(transaction)
              })

              context('when CatalogService#getHalCatalogItem() fails', () => {
                def('getHalCatalogItemResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when CatalogService#getHalCatalogItem() succeeds', () => {
                it('calls AppHelper#generateRandomString() with correct args', async () => {
                  await $subject

                  expect(AppHelper.generateRandomString).to.have.been.calledWith(32)
                })

                context('when AppHelper#generateRandomString() fails', () => {
                  def('generateRandomStringResponse2', () => error)

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.have.property('uuid')
                  })
                })

                context('when AppHelper#generateRandomString() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject

                    expect(MicroserviceManager.create).to.have.been.calledWith(halMicroserviceData, transaction)
                  })

                  context('when MicroserviceManager#create() fails', () => {
                    def('createMicroserviceResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls CatalogService#getBluetoothCatalogItem() with correct args', async () => {
                      await $subject

                      expect(CatalogService.getBluetoothCatalogItem).to.have.been.calledWith(transaction)
                    })

                    context('when CatalogService#getBluetoothCatalogItem() fails', () => {
                      def('getBluetoothCatalogItemResponse', () => Promise.reject(error))

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error)
                      })
                    })

                    context('when CatalogService#getBluetoothCatalogItem() succeeds', () => {
                      it('calls AppHelper#generateRandomString() with correct args', async () => {
                        await $subject

                        expect(AppHelper.generateRandomString).to.have.been.calledWith(32)
                      })

                      context('when AppHelper#generateRandomString() fails', () => {
                        def('generateRandomStringResponse3', () => Promise.reject(error))

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.eventually.have.property('uuid')
                        })
                      })

                      context('when AppHelper#generateRandomString() succeeds', () => {
                        it('calls MicroserviceManager#create() with correct args', async () => {
                          await $subject

                          expect(MicroserviceManager.create).to.have.been.calledWith(bluetoothMicroserviceData, transaction)
                        })

                        context('when MicroserviceManager#create() fails', () => {
                          def('createMicroserviceResponse2', () => Promise.reject(error))

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error)
                          })
                        })

                        context('when MicroserviceManager#create() succeeds', () => {
                          it('calls ChangeTrackingService#update() with correct args', async () => {
                            await $subject

                            expect(ChangeTrackingService.update).to.have.been.calledWith(createFogData.uuid,
                                ChangeTrackingService.events.microserviceCommon, transaction)
                          })

                          context('when ChangeTrackingService#update() fails', () => {
                            def('updateChangeTrackingResponse', () => Promise.reject(error))

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.be.rejectedWith(error)
                            })
                          })

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

          context('when routerMode is none', () => {
            const networkRouterUuid = 'fakeUuid'

            beforeEach(() => {
              fogData.routerMode = 'none'
              fogData.networkRouter = networkRouterUuid
            })

            afterEach(() => {
              delete fogData.routerMode
              delete fogData.networkRouter
            })

            it('calls RouterService.getNetworkRouter with correct args', async () => {
              await $subject

              expect(RouterService.getNetworkRouter).to.have.been.calledWith(networkRouterUuid)
            })

            context('When there is no network router', async () => {
              def('getNetworkRouterResponse', () => Promise.resolve(null))
              
              it(`fails with error not found`, async () => {
                try {
                  await $subject
                  return expect(true).to.be.false()
                } catch (e) {
                  return expect(e).to.be.instanceOf(Errors.NotFoundError)
                }
              })
            })

            context('When there is a network router', async () => {
              it('Should use create the fog with the network router', async () => {
                await $subject
                return expect(ioFogManager.create).to.have.been.calledWith({...createFogData, routerId: networkRouter.id})
              })
            })
          })

          context('when routerMode is edge or interior', () => {
            it('expects router to be created', async () => {
              await $subject
              return expect(RouterService.createRouterForFog).to.have.been.calledWith({...fogData, routerMode: 'edge'}, response.uuid, user.id, [])
            })
          })
        })
      })
    })
  })

  describe('.updateFogEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const date = 155555555

    const uuid = 'testUuid'
    const uuid2 = 'testUuid2'
    const uuid3 = 'testUuid3'

    const fogData = {
      uuid: uuid,
      name: 'new-name',
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
      fogType: 1,
      dockerPruningFrequency: 90,
      availableDiskThreshold: 80,
      logLevel: 'INFO',
      isSystem: true,
      host: '5.6.7.8'
    }

    const oldFog = {
      uuid: uuid2,
      name: 'old-name',
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
      fogType: 1,
      dockerPruningFrequency: 90,
      availableDiskThreshold: 80,
      logLevel: 'INFO',
      isSystem: false,
      host: fogData.host,
      userId: user.id
    }

    const queryFogData = { uuid: fogData.uuid }

    const updateFogData = {
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
      dockerPruningFrequency: 90,
      availableDiskThreshold: 80,
      logLevel: 'INFO',
      isSystem: fogData.isSystem,
      host: fogData.host
    }

    const halItem = {
      id: 10,
    }
    const halMicroserviceData = {
      uuid: uuid2,
      name: `Hal for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date,
    }


    const bluetoothItem = {
      id: 10,
    }
    const bluetoothMicroserviceData = {
      uuid: uuid3,
      name: `Bluetooth for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: oldFog ? oldFog.userId : user.id,
      configLastUpdated: date,
    }

    const networkRouter = {
      host: 'localhost',
      messagingPort: 5672
    }

    const router = {
      isEdge: true,
      ...networkRouter,
      iofogUuid: uuid,
      id: 1
    }

    const defaultRouter = {...router, isDefault: true, id: 2}

    const routerCatalogItem = {
      id: 42
    }

    def('subject', () => $subject.updateFogEndPoint(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse', () => ({...updateFogData}))
    def('findIoFogResponse', () => Promise.resolve({...oldFog, getRouter: () => Promise.resolve(router)}))
    def('updateIoFogResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse2', () => Promise.resolve())
    def('getHalCatalogItemResponse', () => Promise.resolve(halItem))
    def('generateRandomStringResponse', () => uuid2)
    def('generateRandomStringResponse2', () => uuid3)
    def('createMicroserviceResponse', () => Promise.resolve())
    def('createMicroserviceResponse2', () => Promise.resolve())
    def('getBluetoothCatalogItemResponse', () => Promise.resolve(bluetoothItem))

    
    def('getNetworkRouterResponse', () => Promise.resolve(networkRouter))
    def('getRouterCatalogItemResponse', () => Promise.resolve(routerCatalogItem))
    def('findOneRouterResponse', () => Promise.resolve(router))
    def('createRouterResponse', () => Promise.resolve(router))
    def('updateRouterResponse', () => Promise.resolve(router))
    def('findDefaultRouterResponse', () => Promise.resolve(defaultRouter))
    def('emptyUpstreamRouters', () => Promise.resolve([]))
    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ioFogManager, 'findOne')
          .withArgs({ uuid: uuid }).returns($findIoFogResponse)
          .withArgs({ name: 'new-name', uuid: { [Op.not]: 'testUuid' }, userId: user.id }).returns(Promise.resolve())
      $sandbox.stub(ioFogManager, 'update').returns($updateIoFogResponse)
      $sandbox.stub(ChangeTrackingService, 'update')
          .onFirstCall().returns($updateChangeTrackingResponse)
          .onSecondCall().returns($updateChangeTrackingResponse2)
      $sandbox.stub(CatalogService, 'getHalCatalogItem').returns($getHalCatalogItemResponse)
      $sandbox.stub(AppHelper, 'generateRandomString')
          .onFirstCall().returns($generateRandomStringResponse)
          .onSecondCall().returns($generateRandomStringResponse2)
      $sandbox.stub(MicroserviceManager, 'create')
          .onFirstCall().returns($createMicroserviceResponse)
          .onSecondCall().returns($createMicroserviceResponse2)
      $sandbox.stub(CatalogService, 'getBluetoothCatalogItem').returns($getBluetoothCatalogItemResponse)

      $sandbox.stub(RouterService, 'getNetworkRouter').returns($getNetworkRouterResponse)
      const findRouterStub = $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      findRouterStub.withArgs({isDefault: true}).returns($findDefaultRouterResponse)
      $sandbox.stub(RouterService, 'validateAndReturnUpstreamRouters').returns($emptyUpstreamRouters)
      $sandbox.stub(RouterService, 'createRouterForFog').returns($createRouterResponse)
      $sandbox.stub(RouterService, 'updateRouter').returns($updateRouterResponse)
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').returns($emptyUpstreamRouters)
      $sandbox.stub(CatalogService, 'getRouterCatalogItem').returns($getRouterCatalogItemResponse)
      $sandbox.stub(MicroserviceManager, 'delete')
      $sandbox.stub(Date, 'now').returns($dateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogUpdate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
        await $subject

        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(updateFogData)
      })

      context('when AppHelper#deleteUndefinedFields() fails', () => {
        def('deleteUndefinedFieldsResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('calls ioFogManager#findOne() with correct args', async () => {
          await $subject

          expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
        })

        context('when ioFogManager#findOne() fails', () => {
          def('findIoFogResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ioFogManager#findOne() succeeds', () => {
          it('calls ioFogManager#update() with correct args', async () => {
            await $subject

            expect(ioFogManager.update).to.have.been.calledWith(queryFogData,
                {...updateFogData, userId: 0, routerId: router.id})
          })

          context('when ioFogManager#update() fails', () => {
            def('updateIoFogResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ioFogManager#update() succeeds', () => {
            it('calls ChangeTrackingService#update() with correct args', async () => {
              await $subject

              expect(ChangeTrackingService.update).to.have.been.calledWith(uuid,
                  ChangeTrackingService.events.config, transaction)
            })

            context('when ChangeTrackingService#update() fails', () => {
              def('updateChangeTrackingResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ChangeTrackingService#update() succeeds', () => {
              it('calls CatalogService#getHalCatalogItem() with correct args', async () => {
                await $subject

                expect(CatalogService.getHalCatalogItem).to.have.been.calledWith(transaction)
              })

              context('when CatalogService#getHalCatalogItem() fails', () => {
                def('getHalCatalogItemResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when CatalogService#getHalCatalogItem() succeeds', () => {
                it('calls AppHelper#generateRandomString() with correct args', async () => {
                  await $subject

                  expect(AppHelper.generateRandomString).to.have.been.calledWith(32)
                })

                context('when AppHelper#generateRandomString() fails', () => {
                  def('generateRandomStringResponse', () => error)

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.equal(undefined)
                  })
                })

                context('when AppHelper#generateRandomString() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject

                    expect(MicroserviceManager.create).to.have.been.calledWith(halMicroserviceData, transaction)
                  })

                  context('when MicroserviceManager#create() fails', () => {
                    def('createMicroserviceResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls CatalogService#getBluetoothCatalogItem() with correct args', async () => {
                      await $subject

                      expect(CatalogService.getBluetoothCatalogItem).to.have.been.calledWith(transaction)
                    })

                    context('when CatalogService#getBluetoothCatalogItem() fails', () => {
                      def('getBluetoothCatalogItemResponse', () => Promise.reject(error))

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error)
                      })
                    })

                    context('when CatalogService#getBluetoothCatalogItem() succeeds', () => {
                      it('calls AppHelper#generateRandomString() with correct args', async () => {
                        await $subject

                        expect(AppHelper.generateRandomString).to.have.been.calledWith(32)
                      })

                      context('when AppHelper#generateRandomString() fails', () => {
                        def('generateRandomStringResponse2', () => Promise.reject(error))

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.eventually.equal(undefined)
                        })
                      })

                      context('when AppHelper#generateRandomString() succeeds', () => {
                        it('calls MicroserviceManager#create() with correct args', async () => {
                          await $subject

                          expect(MicroserviceManager.create).to.have.been.calledWith(bluetoothMicroserviceData, transaction)
                        })

                        context('when MicroserviceManager#create() fails', () => {
                          def('createMicroserviceResponse2', () => Promise.reject(error))

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error)
                          })
                        })

                        context('when MicroserviceManager#create() succeeds', () => {
                          it('calls ChangeTrackingService#update() with correct args', async () => {
                            await $subject

                            expect(ChangeTrackingService.update).to.have.been.calledWith(fogData.uuid,
                                ChangeTrackingService.events.microserviceCommon, transaction)
                          })

                          context('when ChangeTrackingService#update() fails', () => {
                            def('updateChangeTrackingResponse2', () => Promise.reject(error))

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.be.rejectedWith(error)
                            })
                          })

                          context('when ChangeTrackingService#update() succeeds', () => {
                            it('fulfills the promise', () => {
                              return expect($subject).to.eventually.equal(undefined)
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

          context('when host changes', () => {
            def('findIoFogResponse', () => Promise.resolve({...oldFog, host: '0.0.0.0', getRouter: () => Promise.resolve(router)}))
            def('findExtraHostsResponse', () => Promise.resolve([]))

            context('when there are extra hosts', () => {
              const extraHosts = [{
                id: 1,
                save: () => {}
              }]
              def('findExtraHostsResponse', () => Promise.resolve(extraHosts))
  
              beforeEach(() => {
                $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findExtraHostsResponse)
                $sandbox.stub(MicroserviceExtraHostManager, 'updateOriginMicroserviceChangeTracking')
              })
  
              it('should update extraHosts', async () => {
                await $subject
                for (const e of extraHosts) {
                  expect(MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking).to.have.been.calledWith({...e, value: updateFogData.host}, transaction)
                }
              })
            })
          })

          context('when router mode changes', () => {
            context('when new router mode is none', () => {
              beforeEach(() => {
                fogData.routerMode = 'none'
                $sandbox.stub(RouterManager, 'delete')
              })
              afterEach(() => {
                delete fogData.routerMode
              })
              context('when old router mode was none', async () => {
                def('findOneRouterResponse', () => Promise.resolve(null))
                it('should not delete any router', async () => {
                  await $subject
                  return expect(RouterManager.delete).not.to.have.been.called
                })
              })
              context('when old router mode was not none', async () => {
                def('findOneRouterResponse', () => Promise.resolve({...router, isEdge: true}))
                def('findConnectedRoutersResponse', () => Promise.resolve([]))
                beforeEach(() => {
                  $sandbox.stub(ioFogManager, 'findAll').returns($findConnectedRoutersResponse)
                })
                it('should delete previous router', async () => {
                  await $subject
                  return expect(RouterManager.delete).to.have.been.calledWith({iofogUuid: fogData.uuid})
                })
                context('when there are connected routers', () => {
                  const proxyCatalogItem = {id: 5}
                  const connectedFog = {uuid: 'connectedFogUuid'}
                  def('findConnectedRoutersResponse', () => Promise.resolve([connectedFog]))
                  def('findProxyCatalogItemResponse', () => Promise.resolve(proxyCatalogItem))
                  def('findProxyMicroservicesResponse', () => Promise.resolve([]))
                  beforeEach(() => {
                    $sandbox.stub(CatalogService, 'getProxyCatalogItem').returns(() => Promise.resolve({id: 1}))
                    $sandbox.stub(MicroserviceManager, 'findAll').returns($findProxyMicroservicesResponse)
                  })

                  it('should update agent routerId', async () => {
                    await $subject
                    return expect(ioFogManager.update).to.have.been.calledWith({ uuid: connectedFog.uuid }, { routerId: defaultRouter.id })
                  })

                  context('when there are proxy microservices', () => {
                    const proxyMsvc = {uuid: 'proxyMsvc'}
                    def('findProxyMicroservicesResponse', () => Promise.resolve([proxyMsvc]))
                    beforeEach(() => {
                      $sandbox.stub(MicroserviceManager, 'updateIfChanged')
                    })
                    it('should update microservice config and set flag', async () => {
                      await $subject
                      expect(MicroserviceManager.updateIfChanged).to.have.been.calledWith({ uuid: proxyMsvc.uuid }, { config: JSON.stringify({networkRouter: { host: defaultRouter.host, port: defaultRouter.messagingPort}}) })
                      return expect(ChangeTrackingService.update).to.have.been.calledWith(connectedFog.uuid, ChangeTrackingService.events.microserviceConfig)
                    })
                  })

                })
                context('when there is no network router', () => {
                  def('getNetworkRouterResponse', () => Promise.resolve(null))
                  it('should error with Notfound', async () => {
                    try{
                      await $subject
                      return expect(false).to.eql(true)
                    } catch(e) {
                      return expect(e).to.be.instanceOf(Errors.NotFoundError)
                    }
                  })
                })
                it('should set the network router', async () => {
                  await $subject
                  return expect(ioFogManager.update).to.have.been.calledWith(queryFogData, {...updateFogData, userId: 0, routerId: networkRouter.id})
                })
              })
            })
            context('when new router mode is edge', () => {
              beforeEach(() => {
                fogData.routerMode = 'edge'
                fogData.messagingPort = 1234
                fogData.host = 'newHost'
              })
              afterEach(() => {
                delete fogData.routerMode
                delete fogData.messagingPort
                delete fogData.host
              })
              context('when old router mode was none', async () => {
                def('findOneRouterResponse', () => Promise.resolve(null))
                def('findIoFogResponse', () => Promise.resolve({...oldFog, getRouter: () => Promise.resolve(null)}))
                it('Should create a router', async () => {
                  await $subject
                  return expect(RouterService.createRouterForFog).to.have.been.calledWith(fogData, oldFog.uuid, user.id, [])
                })
              })

              it('Should update the router', async () => {
                await $subject
                return expect(RouterService.updateRouter).to.have.been.calledWith(router, {
                  messagingPort: fogData.messagingPort, interRouterPort: router.interRouterPort, edgeRouterPort: router.edgeRouterPort, isEdge: true, host: fogData.host
                }, [])
              })
            })
          })
        })
      })
    })
  })

  describe('.deleteFogEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const fogData = {
      uuid: uuid,
    }

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
      fogType: 1,
      userId: user.id
    }

    const networkRouter = {
      host: 'localhost',
      messagingPort: 5672
    }

    const router = {
      isEdge: true,
      ...networkRouter,
      iofogUuid: uuid,
      id: 1
    }

    const routerCatalogItem = {
      id: 15
    }
    
    const queryFogData = { uuid: fogData.uuid }

    def('subject', () => $subject.deleteFogEndPoint(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve(fog))
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('findOneRouterResponse', () => Promise.resolve(router))
    def('upstreamRouters', () => Promise.resolve([]))
    def('routerCatalogItem', () => Promise.resolve(routerCatalogItem))

    beforeEach(() => {
      // _deleteFogRouter is tested in update fog (with new router mode set to none)
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(ioFogManager, 'delete')
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      const findRouterStub = $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      findRouterStub.withArgs({isDefault: true}).returns(Promise.resolve(null))
      $sandbox.stub(RouterManager, 'delete')
      $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').returns($upstreamRouters)
      $sandbox.stub(CatalogService, 'getRouterCatalogItem').returns($routerCatalogItem)
      $sandbox.stub(MicroserviceManager, 'delete')
      $sandbox.stub(MicroserviceManager, 'findAll').returns(Promise.resolve([]))
      $sandbox.stub(ioFogManager, 'findAll').returns(Promise.resolve([]))
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogDelete)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject

        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject

          expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.deleteNode, transaction)
        })

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })
        context('when ChangeTrackingService#update() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
        context('when there is no router', () => {
          def('findOneRouterResponse', () => Promise.resolve(null))
          it('should not delete a router', async () => {
            await $subject
            return expect(RouterManager.delete).not.to.have.been.called
          })
        })
        context('when there is a router', () => {
          it('Should delete the router', async () => {
            await $subject
            return expect(RouterManager.delete).to.have.been.calledWith({iofogUuid: fogData.uuid})
          })
          context('when there are upstream and downstream routers', () => {
            const upstreamRouters = [{
              dest: router,
              source: {
                ...router,
                id: 2
              },
              id: 1
            }, {
              dest: {
                ...router,
                id: 3
              },
              source: router,
              id: 2
            }]
            def('upstreamRouters', () => upstreamRouters)

            beforeEach(() => {
              $sandbox.stub(RouterConnectionManager, 'delete')
              $sandbox.stub(RouterService, 'updateConfig')
            })

            it('Should delete all connections', async () => {
              await $subject
              expect(RouterConnectionManager.delete).to.have.been.calledWith({id: 1})
              return expect(RouterConnectionManager.delete).to.have.been.calledWith({id: 2})
            })

            it('Should update config of downstream connections', async () => {
              await $subject
              expect(RouterService.updateConfig).to.have.been.calledWith(upstreamRouters[0].source.id)
              return expect(ChangeTrackingService.update).to.have.been.calledWith(router.iofogUuid, ChangeTrackingService.events.routerChanged)
            })
          })
        })

      })
    })
  })

  describe('.getFog()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const fogData = {
      uuid: uuid,
    }

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
      fogType: 1,
      userId: user.id
    }

    const queryFogData = { uuid: fogData.uuid }


    const defaultRouter = {
      id: 1,
      isDefault: true
    }

    def('subject', () => $subject.getFog(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve({...fog, getRouter: () => Promise.resolve(null), toJSON: () => fog}))
    def('findOneRouterResponse', () => Promise.resolve(null))
    def('defaultRouterResponse', () => Promise.resolve(defaultRouter))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      const stub = $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
      stub.withArgs({isDefault: true}).returns($defaultRouterResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogGet)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject

        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('fulfills the promise', () => {      
          return expect($subject).to.eventually.deep.equal(fog)
        })

        context('when there is a router', () => {
          const router = {
            isEdge: true,
            messagingPort: 1234,
            id: 42
          }
          def('findIoFogResponse', () => Promise.resolve({...fog, getRouter: () => Promise.resolve(router), toJSON: () => fog}))
          def('findRouterConnectionsResponse', () => Promise.resolve([]))
          beforeEach(() => {
            $sandbox.stub(RouterConnectionManager, 'findAllWithRouters').returns($findRouterConnectionsResponse)
          })

          it('should return router information', () => {
            return expect($subject).to.eventually.deep.equal({...fog, routerMode: 'edge', messagingPort: router.messagingPort, upstreamRouters: []})
          })

          context('when it has upstream routers', () => {
            const upstreamRouter = {
              id: 43,
              isEdge: false,
              iofogUuid: 'upstreamFogUuid'
            }
            def('findRouterConnectionsResponse', () => Promise.resolve([{source: router, dest: upstreamRouter}, {source: router, dest: defaultRouter}]))
            it('should have upstream router with agent uuid and default-router', () => {
              return expect($subject).to.eventually.deep.equal({...fog, routerMode: 'edge', messagingPort: router.messagingPort, upstreamRouters: [upstreamRouter.iofogUuid, 'default-router']})  
            })
          })

          context('when it is an interior router', () => {
            const router = {
              isEdge: false,
              messagingPort: 1234,
              interRouterPort: 4567,
              edgeRouterPort: 7890,
              id: 42
            }
            def('findIoFogResponse', () => Promise.resolve({...fog, getRouter: () => Promise.resolve(router), toJSON: () => fog}))
            it('should return router information', () => {
              return expect($subject).to.eventually.deep.equal({...fog, routerMode: 'interior', messagingPort: router.messagingPort, edgeRouterPort: router.edgeRouterPort, interRouterPort: router.interRouterPort, upstreamRouters: []})
            })
          })
        })
      })
    })
  })

  describe('.getFogListEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

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
      fogType: 1,
    }

    const isSystem = false

    const fogs = [fog]

    const queryFogData = isSystem ? { isSystem } : (isCLI ? {} : { userId: user.id })

    const filters = []

    def('subject', () => $subject.getFogListEndPoint(filters, user, isCLI, isSystem, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findAllIoFogResponse', () => Promise.resolve(fogs.map(f => ({...f, getRouter: () => Promise.resolve(null), toJSON: () => f}))))
    def('findOneRouterResponse', () => Promise.resolve(null))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findAll').returns($findAllIoFogResponse)
      $sandbox.stub(RouterManager, 'findOne').returns($findOneRouterResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(filters, Validator.schemas.iofogFilters)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findAll() with correct args', async () => {
        await $subject

        expect(ioFogManager.findAll).to.have.been.calledWith(queryFogData, transaction)
      })

      context('when ioFogManager#findAll() fails', () => {
        def('findAllIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findAll() succeeds', () => {
        it('fulfills the promise', () => {
          return expect($subject).to.eventually.have.property('fogs')
        })
      })
    })
  })

  describe('.generateProvisioningKeyEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const date = 155555555

    const fogData = {
      uuid: uuid,
    }

    const queryFogData = { uuid: fogData.uuid }

    const provisionKey = 'tttttttt'
    const expirationTime = date + (20 * 60 * 1000)

    const newProvision = {
      iofogUuid: fogData.uuid,
      provisionKey: provisionKey,
      expirationTime: expirationTime,
    }

    def('subject', () => $subject.generateProvisioningKeyEndPoint(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('generateRandomStringResponse', () => provisionKey)
    def('findIoFogResponse', () => Promise.resolve({ uuid: fogData.uuid, userId: user.id }))
    def('updateOrCreateProvisionKeyResponse', () => Promise.resolve(newProvision))

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').returns($updateOrCreateProvisionKeyResponse)

      $sandbox.stub(Date.prototype, 'getTime').returns($dateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogGenerateProvision)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#generateRandomString() with correct args', async () => {
        await $subject

        expect(AppHelper.generateRandomString).to.have.been.calledWith(8)
      })

      context('when AppHelper#generateRandomString() fails', () => {
        def('generateRandomStringResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('key')
        })
      })

      context('when AppHelper#generateRandomString() succeeds', () => {
        it('calls ioFogManager#findOne() with correct args', async () => {
          await $subject
          expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
        })

        context('when ioFogManager#findOne() fails', () => {
          def('findIoFogResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ioFogManager#findOne() succeeds', () => {
          it('calls ioFogProvisionKeyManager#updateOrCreate() with correct args', async () => {
            await $subject
            expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledWith({
              iofogUuid: fogData.uuid,
            }, newProvision, transaction)
          })

          context('when ioFogProvisionKeyManager#updateOrCreate() fails', () => {
            def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ioFogProvisionKeyManager#updateOrCreate() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.deep.equal({
                key: provisionKey,
                expirationTime: expirationTime,
              })
            })
          })
        })
      })
    })
  })

  describe('.setFogVersionCommandEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const date = 155555555

    const fogVersionData = {
      uuid: uuid,
      versionCommand: 'upgrade',
    }

    const queryFogData = { uuid: fogVersionData.uuid }

    const ioFog = {
      uuid: uuid,
      isReadyToUpgrade: true,
      isReadyToRollback: true,
      userId: user.id
    }

    const newVersionCommand = {
      iofogUuid: fogVersionData.uuid,
      versionCommand: fogVersionData.versionCommand,
    }

    const provisionKey = 'tttttttt'
    const expirationTime = date + (20 * 60 * 1000)

    const newProvision = {
      iofogUuid: uuid,
      provisionKey: provisionKey,
      expirationTime: expirationTime,
    }

    def('subject', () => $subject.setFogVersionCommandEndPoint(fogVersionData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve(ioFog))
    def('generateRandomStringResponse', () => provisionKey)
    def('updateOrCreateProvisionKeyResponse', () => Promise.resolve(newProvision))
    def('findIoFogVersionCommandResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse)
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').returns($updateOrCreateProvisionKeyResponse)
      $sandbox.stub(ioFogVersionCommandManager, 'updateOrCreate').returns($findIoFogVersionCommandResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)

      $sandbox.stub(Date.prototype, 'getTime').returns($dateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogVersionData, Validator.schemas.iofogSetVersionCommand)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject
        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('validatorResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls Validator#validate() with correct args', async () => {
          await $subject
          expect(Validator.validate).to.have.been.calledWith({
            uuid: fogVersionData.uuid,
          }, Validator.schemas.iofogGenerateProvision)
        })

        context('when Validator#validate() fails', () => {
          def('validatorResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when Validator#validate() succeeds', () => {
          it('calls AppHelper#generateRandomString() with correct args', async () => {
            await $subject

            expect(AppHelper.generateRandomString).to.have.been.calledWith(8)
          })

          context('when AppHelper#generateRandomString() fails', () => {
            def('generateRandomStringResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when AppHelper#generateRandomString() succeeds', () => {
            it('calls ioFogManager#findOne() with correct args', async () => {
              await $subject
              expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
            })

            context('when ioFogManager#findOne() fails', () => {
              def('findIoFogResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ioFogManager#findOne() succeeds', () => {
              it('calls ioFogProvisionKeyManager#updateOrCreate() with correct args', async () => {
                await $subject
                expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledWith({
                  iofogUuid: uuid,
                }, newProvision, transaction)
              })

              context('when ioFogProvisionKeyManager#updateOrCreate() fails', () => {
                def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ioFogProvisionKeyManager#updateOrCreate() succeeds', () => {
                it('calls ioFogVersionCommandManager#updateOrCreate() with correct args', async () => {
                  await $subject
                  expect(ioFogVersionCommandManager.updateOrCreate).to.have.been.calledWith({
                    iofogUuid: fogVersionData.uuid,
                  }, newVersionCommand, transaction)
                })

                context('when ioFogVersionCommandManager#updateOrCreate() fails', () => {
                  def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error))

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when ioFogVersionCommandManager#updateOrCreate() succeeds', () => {
                  it('calls ChangeTrackingService#update() with correct args', async () => {
                    await $subject
                    expect(ChangeTrackingService.update).to.have.been.calledWith(fogVersionData.uuid,
                        ChangeTrackingService.events.version, transaction)
                  })

                  context('when ChangeTrackingService#update() fails', () => {
                    def('updateOrCreateProvisionKeyResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when ChangeTrackingService#update() succeeds', () => {
                    it('fulfills the promise', () => {
                      return expect($subject).to.eventually.equal(undefined)
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

  describe('.setFogRebootCommandEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const date = 155555555

    const fogData = {
      uuid: uuid,
    }

    const queryFogData = { uuid: fogData.uuid }

    def('subject', () => $subject.setFogRebootCommandEndPoint(fogData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve({ uuid: fogData.uuid, userId: user.id }))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogData, Validator.schemas.iofogReboot)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject
        expect(ioFogManager.findOne).to.have.been.calledWith(queryFogData, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject
          expect(ChangeTrackingService.update).to.have.been.calledWith(fogData.uuid,
              ChangeTrackingService.events.reboot, transaction)
        })

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ChangeTrackingService#update() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })

  describe('.getHalHardwareInfoEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const date = 155555555

    const uuidObj = {
      uuid: uuid,
    }

    def('subject', () => $subject.getHalHardwareInfoEndPoint(uuidObj, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve({ userId: user.id, uuid: uuidObj.uuid }))
    def('findHalHardwareResponse', () => Promise.resolve())

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(HWInfoManager, 'findOne').returns($findHalHardwareResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(uuidObj, Validator.schemas.halGet)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject
        expect(ioFogManager.findOne).to.have.been.calledWith({
          uuid: uuidObj.uuid,
        }, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls HWInfoManager#findOne() with correct args', async () => {
          await $subject
          expect(HWInfoManager.findOne).to.have.been.calledWith({
            iofogUuid: uuidObj.uuid,
          }, transaction)
        })

        context('when HWInfoManager#findOne() fails', () => {
          def('findHalHardwareResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when HWInfoManager#findOne() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })

  describe('.getHalUsbInfoEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const uuid = 'testUuid'

    const date = 155555555

    const uuidObj = {
      uuid: uuid,
    }

    def('subject', () => $subject.getHalUsbInfoEndPoint(uuidObj, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findIoFogResponse', () => Promise.resolve({ userId: user.id, uuid: uuidObj.uuid }))
    def('findHalUsbResponse', () => Promise.resolve())

    def('dateResponse', () => date)

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findIoFogResponse)
      $sandbox.stub(USBInfoManager, 'findOne').returns($findHalUsbResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(uuidObj, Validator.schemas.halGet)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ioFogManager#findOne() with correct args', async () => {
        await $subject
        expect(ioFogManager.findOne).to.have.been.calledWith({
          uuid: uuidObj.uuid,
        }, transaction)
      })

      context('when ioFogManager#findOne() fails', () => {
        def('findIoFogResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne() succeeds', () => {
        it('calls USBInfoManager#findOne() with correct args', async () => {
          await $subject
          expect(USBInfoManager.findOne).to.have.been.calledWith({
            iofogUuid: uuidObj.uuid,
          }, transaction)
        })

        context('when USBInfoManager#findOne() fails', () => {
          def('findHalUsbResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when USBInfoManager#findOne() succeeds', () => {
          it('fulfills the promise', () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })
})

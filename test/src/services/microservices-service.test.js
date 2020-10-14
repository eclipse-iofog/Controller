const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const MicroservicesService = require('../../../src/services/microservices-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const CatalogService = require('../../../src/services/catalog-service')
const ApplicationService = require('../../../src/services/application-service')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroservicePortManager = require('../../../src/data/managers/microservice-port-manager')
const CatalogItemImageManager = require('../../../src/data/managers/catalog-item-image-manager')
const RouterManager = require('../../../src/data/managers/router-manager')
const VolumeMappingManager = require('../../../src/data/managers/volume-mapping-manager')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const RoutingManager = require('../../../src/data/managers/routing-manager')
const MicroserviceExtraHostManager = require('../../../src/data/managers/microservice-extra-host-manager')
const MicroserviceEnvManager = require('../../../src/data/managers/microservice-env-manager')
const MicroserviceArgManager = require('../../../src/data/managers/microservice-arg-manager')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const Op = require('sequelize').Op
const MicroservicePublicModeManager = require('../../../src/data/managers/microservice-public-mode-manager')
const MicroservicePublicPortManager = require('../../../src/data/managers/microservice-public-port-manager')
const ioFogManager = require('../../../src/data/managers/iofog-manager')
const ioFogService = require('../../../src/services/iofog-service')
const Errors = require('../../../src/helpers/errors')

describe('Microservices Service', () => {
  def('subject', () => MicroservicesService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = true

  afterEach(() => $sandbox.restore())

  describe('.listMicroservicesEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const application = {
      name: 'my-app',
      id: 42
    }

    const microserviceStatus = {
      'containerId': 'testContainerId',
      'status': 'RUNNING',
      'startTime': 5325543453454,
      'operatingDuration': 534535435435,
      'cpuUsage': 35,
      'memoryUsage': 45,
      'percentage': 50.5
    }

    const uuid = 'testUuid'

    const response = [
      {
        uuid,
        applicationId: application.id,
        // dataValues is being directly accessed on top of sequelize getters
        dataValues: {
          uuid,
          applicationId: application.id,
        }
      },
    ]

    

    const responseObject = [{
     cmd: [],
      env: [],
      extraHosts: [],
      images: [],
      logSize: NaN,
      ports: [],
      routes: [],
      volumeMappings: [],
      flowId: application.id,
      applicationId: application.id,
      status: microserviceStatus,
      uuid
    }]
    const microserviceResponse = {
      microservices: responseObject
    }
    const microserviceStatusArray = [microserviceStatus]

    def('subject', () => $subject.listMicroservicesEndPoint({ applicationName: application.name }, user, isCLI, transaction))
    def('findMicroservicesResponse', () => Promise.resolve(response))
    def('findPortMappingsResponse', () => Promise.resolve([]))
    def('findVolumeMappingsResponse', () => Promise.resolve([]))
    def('findRoutesResponse', () => Promise.resolve([]))
    def('findExtraHostsResponse', () => Promise.resolve([]))
    def('publicModeResponse', () => Promise.resolve([]))
    def('envResponse', () => Promise.resolve([]))
    def('cmdResponse', () => Promise.resolve([]))
    def('imgResponse', () => Promise.resolve([]))
    def('statusResponse', () => microserviceStatusArray)

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findAllExcludeFields').returns($findMicroservicesResponse)
      $sandbox.stub(MicroservicePortManager, 'findAll').returns($findPortMappingsResponse)
      $sandbox.stub(VolumeMappingManager, 'findAll').returns($findVolumeMappingsResponse)
      $sandbox.stub(RoutingManager, 'findAll').returns($findRoutesResponse)
      $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findExtraHostsResponse)
      $sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').returns($envResponse)
      $sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').returns($cmdResponse)
      $sandbox.stub(MicroservicePublicModeManager, 'findAll').returns($publicModeResponse)
      $sandbox.stub(CatalogItemImageManager, 'findAll').returns($imgResponse)
      $sandbox.stub(MicroserviceStatusManager, 'findAllExcludeFields').returns($statusResponse)
      $sandbox.stub(ApplicationManager, 'findOne').returns(Promise.resolve(application))
    })
    
    it('calls MicroserviceManager#findAllExcludeFields() with correct args', async () => {
      await $subject
      const where = application ? { applicationId: application.id, delete: false } : { delete: false }
      if (!isCLI) {
        where.userId = user.id
      }

      expect(MicroserviceManager.findAllExcludeFields).to.have.been.calledWith(where, transaction)
    })

    context('when MicroserviceManager#findAllExcludeFields() fails', () => {
      def('findMicroservicesResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroserviceManager#findAllExcludeFields() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('microservices')
      })
    })

    context('when MicroserviceManager#findAllExcludeFields() succeeds and return microservices', () => {
      it('fulfills the promise', async() => {
        await $subject
        return expect($subject).to.eventually.deep.equal(microserviceResponse)
      })
    })
  })

  describe('.getMicroserviceEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const microserviceUuid = 'testMicroserviceUuid'

    const response = {
      dataValues: {
        uuid: 'testUuid',
      },
    }

    def('subject', () => $subject.getMicroserviceEndPoint(microserviceUuid, user, isCLI, transaction))
    def('findMicroserviceResponse', () => Promise.resolve(response))
    def('findPortMappingsResponse', () => Promise.resolve([]))
    def('findVolumeMappingsResponse', () => Promise.resolve([]))
    def('findRoutesResponse', () => Promise.resolve([]))
    def('findExtraHostsResponse', () => Promise.resolve([]))
    def('publicModeResponse', () => Promise.resolve([]))
    def('envResponse', () => Promise.resolve([]))
    def('cmdResponse', () => Promise.resolve([]))
    def('imgResponse', () => Promise.resolve([]))
    def('statusResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneExcludeFields').returns($findMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findAll').returns($findPortMappingsResponse)
      $sandbox.stub(VolumeMappingManager, 'findAll').returns($findVolumeMappingsResponse)
      $sandbox.stub(RoutingManager, 'findAll').returns($findRoutesResponse)
      $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findExtraHostsResponse)
      $sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').returns($envResponse)
      $sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').returns($cmdResponse)
      $sandbox.stub(MicroservicePublicModeManager, 'findAll').returns($publicModeResponse)
      $sandbox.stub(CatalogItemImageManager, 'findAll').returns($imgResponse)
      $sandbox.stub(MicroserviceStatusManager, 'findAllExcludeFields').returns($statusResponse)
    })

    it('calls MicroserviceManager#findOneExcludeFields() with correct args', async () => {
      await $subject
      expect(MicroserviceManager.findOneExcludeFields).to.have.been.calledWith({
        uuid: microserviceUuid, delete: false,
      }, transaction)
    })

    context('when MicroserviceManager#findOneExcludeFields() fails', () => {
      def('findMicroserviceResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroserviceManager#findOneExcludeFields() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('uuid')
      })
    })

    context('when microservice has extraHosts', () => {
      const extraHosts = [{
        id: 1,
        targetFogUuid: 'tfog',
        targetMicroserviceUuid: 'tmicroservice',
        template: '${Apps.application.msvc.local}',
        value: '1.2.3.4',
        name: 'testExtraHost'
      }]
      def('findExtraHostsResponse', () => Promise.resolve(extraHosts))

      it('returns extra hosts', async () => {
        const ms = await $subject
        expect(ms).to.have.property('extraHosts')
        expect(ms.extraHosts).to.have.length(extraHosts.length)
        expect(ms.extraHosts).to.eql(extraHosts.map(e => ({value: e.value, name: e.name, address: e.template})))
      })
    })

    context('when microservice has public ports', () => {
      def('findPortMappingsResponse', () => Promise.resolve([
        {
          id: 1,
          portInternal: 80,
          portInternal: 8080,
          isPublic: true,
          getPublicPort: () => Promise.resolve({
            hostId: 'fakeAgentUuid',
            publicPort: 1234,
            protocol: 'http'
          })
        },
      ]))

      beforeEach(() => {
        $sandbox.stub(RouterManager, 'findOne').returns(Promise.resolve({host: '1.2.3.4'}))
        $sandbox.stub(ioFogManager, 'findOne').returns(Promise.resolve({}))
      })

      it('returns public link', async () => {
        const ms = await $subject
        expect(ms).to.have.property('ports')
        expect(ms.ports).to.have.length(1)
        expect(ms.ports[0]).to.have.property('publicLink')
        expect(ms.ports[0].publicLink).to.equal('http://1.2.3.4:1234')
      })
    })
  })

  describe('.createMicroserviceEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const application = {
      name: 'my-app',
      active: true,
      id: 42
    }

    const microserviceData = {
      'name': 'name2',
      'config': 'string',
      'catalogItemId': 15,
      'application': application.name,
      'iofogUuid': 'testIofogUuid',
      'rootHostAccess': true,
      'logSize': 0,
      'volumeMappings': [
        {
          'hostDestination': '/var/dest',
          'containerDestination': '/var/dest',
          'accessMode': 'rw',
          'type': 'bind'
        },
      ],
      'ports': [
        {
          'internal': 1,
          'external': 1,
        },
      ],
      'routes': [],
      'logLimit': 50
    }

    const newMicroserviceUuid = 'newMicroserviceUuid'
    const newMicroservice = {
      uuid: newMicroserviceUuid,
      name: microserviceData.name,
      config: microserviceData.config,
      catalogItemId: microserviceData.catalogItemId,
      iofogUuid: microserviceData.iofogUuid,
      rootHostAccess: microserviceData.rootHostAccess,
      logSize: microserviceData.logLimit,
      registryId: 1,
      userId: user.id,
    }

    const fog = {
      uuid: microserviceData.iofogUuid,
      fogTypeId: 1,
      name: 'testfog'
    }

    const item = {}

    const portMappingData =
      {
        'internal': 1,
        'external': 1,
      }

    const mappings = []
    for (const volumeMapping of microserviceData.volumeMappings) {
      const mapping = Object.assign({}, volumeMapping)
      mapping.microserviceUuid = newMicroservice.uuid
      mappings.push(mapping)
    }

    const mappingData = {
      isPublic: false,
      portInternal: portMappingData.internal,
      portExternal: portMappingData.external,
      userId: newMicroservice.userId,
      microserviceUuid: newMicroservice.uuid,
    }

    const images = [
      {fogTypeId: 1, containerImage: 'hello-world'},
      {fogTypeId: 2, containerImage: 'hello-world'},
    ]

    const proxyCatalogItem = {
      id: 42
    }

    const systemFog = {
      isSystem: true,
      uuid: 'systemFogUuid',
      getMicroservice: () => Promise.resolve([])
    }

    const defaultRouter = {
      id: 21
    }

    const extraHostFog = {
      uuid: 'extraHostFogUuid',
      host: 'extraHostFogHost'
    }

    const extraHostFogPublic = {
      uuid: 'extraHostFogPublicUuid',
      host: 'extraHostFogPublicHost'
    }

    const extraHostMsvc = {
      uuid: 'extraHostUuid',
      iofogUuid: extraHostFog.uuid,
    }

    def('subject', () => $subject.createMicroserviceEndPoint(microserviceData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('validatorResponse2', () => Promise.resolve(true))
    def('generateRandomStringResponse', () => newMicroserviceUuid)
    def('deleteUndefinedFieldsResponse', () => ({...newMicroservice}))
    def('findMicroserviceResponse', () => Promise.resolve())
    def('findMicroserviceResponse2', () => Promise.resolve(microserviceData))
    def('getCatalogItemResponse', () => Promise.resolve({images}))
    def('findApplicationResponse', () => Promise.resolve(application))
    def('getIoFogResponse', () => Promise.resolve())
    def('createMicroserviceResponse', () => Promise.resolve({...newMicroservice}))
    def('findMicroservicePortResponse', () => Promise.resolve())
    def('createMicroservicePortResponse', () => Promise.resolve({id: 15}))
    def('updateMicroserviceResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('createVolumeMappingResponse', () => Promise.resolve())
    def('createMicroserviceStatusResponse', () => Promise.resolve())
    def('findOneRegistryResponse', () => Promise.resolve({}))
    def('findOneFogResponse', () => Promise.resolve({...fog, getMicroservice: () => Promise.resolve([])}))
    def('findPublicPortsResponse', () => Promise.resolve([]))
    def('getProxyCatalogItem', () => Promise.resolve((proxyCatalogItem)))
    def('proxyCatalogItem', () => Promise.resolve(null))
    def('findDefaultFogResponse', () => Promise.resolve(systemFog))
    def('findDefaultRouterResponse', () => Promise.resolve(defaultRouter))
    def('getProxyMsvcResponse', () => Promise.resolve(null))
    def('getExtraHostMsvc', () => Promise.resolve(extraHostMsvc))
    def('getExtraHostFog', () => Promise.resolve(extraHostFog))
    def('getExtraHostFogPublic', () => Promise.resolve(extraHostFogPublic))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate')
          .onFirstCall().returns($validatorResponse)
          .onSecondCall().returns($validatorResponse2)
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(MicroserviceManager, 'findOne')
          .onFirstCall().returns($findMicroserviceResponse)
          .onSecondCall().returns($findMicroserviceResponse2)
          .withArgs({ catalogItemId: proxyCatalogItem.id, iofogUuid: microserviceData.iofogUuid }).returns($getProxyMsvcResponse) // find proxy microservice in public port
          .withArgs({ applicationId: application.id, name: 'msvc' }).returns($getExtraHostMsvc) // find extraHostMsvc target in extra host
      $sandbox.stub(CatalogService, 'getCatalogItem').returns($getCatalogItemResponse)
      $sandbox.stub(ApplicationManager, 'findOne').returns($findApplicationResponse)
      $sandbox.stub(CatalogService, 'getProxyCatalogItem').returns($getProxyCatalogItem)
      $sandbox.stub(MicroserviceManager, 'create').returns($createMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findOne').returns($findMicroservicePortResponse)
      $sandbox.stub(MicroservicePortManager, 'create').returns($createMicroservicePortResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      $sandbox.stub(VolumeMappingManager, 'bulkCreate').returns($createVolumeMappingResponse)
      $sandbox.stub(MicroserviceStatusManager, 'create').returns($createMicroserviceStatusResponse)
      $sandbox.stub(RegistryManager, 'findOne').returns($findOneRegistryResponse)
      const stub = $sandbox.stub(ioFogManager, 'findOne')
      stub.withArgs({isSystem: true}).returns($findDefaultFogResponse)
      stub.withArgs({uuid: extraHostMsvc.iofogUuid}).returns($getExtraHostFog)
      stub.withArgs({uuid: extraHostFogPublic.uuid}).returns($getExtraHostFogPublic)
      stub.returns($findOneFogResponse)
      $sandbox.stub(MicroservicePublicPortManager, 'findAll').returns($findPublicPortsResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(microserviceData,
          Validator.schemas.microserviceCreate)
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
          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(newMicroservice)
        })

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          const err = 'Invalid microservice UUID \'undefined\''
          def('deleteUndefinedFieldsResponse', () => Promise.reject(err))

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('uuid')
          })
        })

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls MicroserviceManager#findOne() with correct args', async () => {
            await $subject
            const where = item.id
              ?
              {
                name: microserviceData.name,
                uuid: { [Op.ne]: item.id },
                userId: user.id,
                delete: false
              }
              :
              {
                name: microserviceData.name,
                userId: user.id,
                delete: false
              }
            expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction)
          })

          context('when MicroserviceManager#findOne() fails', () => {
            def('findMicroserviceResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when MicroserviceManager#findOne() succeeds', () => {
            it('calls CatalogService#getCatalogItem() with correct args', async () => {
              await $subject
              expect(CatalogService.getCatalogItem).to.have.been.calledWith(newMicroservice.catalogItemId,
                  user, isCLI, transaction)
            })

            context('when CatalogService#getCatalogItem() fails', () => {
              def('getCatalogItemResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when CatalogService#getCatalogItem() succeeds', () => {
              it('calls ApplicationManager#findOne() with correct args', async () => {
                await $subject
                expect(ApplicationManager.findOne).to.have.been.calledWith({name: microserviceData.application}, transaction)
              })

              context('when ApplicationManager#findOne() fails', () => {
                def('findApplicationResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ApplicationManager#findOne() returns null', () => {
                def('findApplicationResponse', () => Promise.resolve(null))

                it(`fails with ${error}`, async () => {
                  try {
                    await $subject
                  } catch (e) {
                    return expect(e).to.be.instanceOf(Errors.NotFoundError)
                  }
                  return expect(true).to.eql(false)
                })
              })

              context('when ApplicationManager#findOne() succeeds', () => {
                it('calls FogManager#findOne() with correct args', async () => {
                  await $subject
                  expect(ioFogManager.findOne).to.have.been.calledWith({
                    uuid: newMicroservice.iofogUuid,
                  }, transaction)
                })

                context('when FogManager#findOne() fails', () => {
                  def('findOneFogResponse', () => Promise.reject(error))

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when FogManager#findOne() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject
                    expect(MicroserviceManager.create).to.have.been.calledWith({...newMicroservice, applicationId: application.id},
                        transaction)
                  })


                  context('when there is no valid image in the catalog', () => {
                    const catalogItemNoImages = {
                      id: 3,
                      images: []
                    }
                    def('findCatalogItem', () => Promise.resolve(catalogItemNoImages))
                    it('Should throw validation error', async () => {
                      try {
                        await $subject
                      } catch (e) {
                        expect(e).to.be.instanceOf(Errors.ValidationError)
                      }
                    })
                  })

                  context('when there is no valid image in microservice', () => {
                    def('subject', () => MicroservicesService.createMicroserviceEndPoint({...microserviceData, images: []}, user, isCLI, transaction))
                    it('Should throw validation error', async () => {
                      try {
                        await $subject
                      } catch (e) {
                        expect(e).to.be.instanceOf(Errors.ValidationError)
                      }
                    })
                  })

                  context('when MicroserviceManager#create() fails', () => {
                    def('findOneFogResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls MicroservicePortManager#findOne() with correct args', async () => {
                      await $subject
                      expect(MicroservicePortManager.findOne).to.have.been.calledWith({
                        microserviceUuid: newMicroservice.uuid,
                        [Op.or]:
                          [
                            {
                              portInternal: portMappingData.internal,
                            },
                            {
                              portExternal: portMappingData.external,
                            },
                          ],
                      }, transaction)
                    })
                    context('when MicroservicePortManager#findOne() fails', () => {
                      def('findMicroservicePortResponse', () => Promise.reject(error))

                      it(`fails with ${error}`, () => {
                        return expect($subject).to.be.rejectedWith(error)
                      })
                    })

                    context('when MicroservicePortManager#findOne() succeeds', () => {
                      it('calls MicroservicePortManager#create() with correct args', async () => {
                        await $subject
                        expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction)
                      })

                      context('when portMapping is public', () => {
                        def('findRelatedExtraHosts', () => Promise.resolve([]))
                        const router = {
                          host: 'routerHost',
                          messagingPort: 5672
                        }
                        const publicPort = 1234
                        let routerStub
                        beforeEach(() => {
                          microserviceData.ports[0].publicPort = publicPort
                          microserviceData.ports[0].host = undefined
                          routerStub = $sandbox.stub(RouterManager, 'findOne').returns(Promise.resolve(router))
                          $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findRelatedExtraHosts)
                          $sandbox.stub(MicroservicePublicPortManager, 'create')
                        })

                        afterEach(() => {
                          delete microserviceData.ports[0].publicPort
                          delete microserviceData.ports[0].host
                        })
                        
                        it('should create local and remote proxy microservices', async () => {
                          await $subject
                          const networkRouter = {
                            host: router.host,
                            port: router.messagingPort
                          }
                          const localProxy = {
                            uuid: sinon.match.string,
                            name: 'Proxy',
                            config: JSON.stringify({
                              mappings: [`amqp:${newMicroserviceUuid}=>http:${microserviceData.ports[0].external}`],
                              networkRouter: networkRouter
                            }),
                            catalogItemId: proxyCatalogItem.id,
                            iofogUuid: microserviceData.iofogUuid,
                            rootHostAccess: true,
                            registryId: 1,
                            userId: user.id
                          }
                          const remoteProxy = {
                            uuid: sinon.match.string,
                            name: 'Proxy',
                            config: JSON.stringify({
                              mappings: [`http:${publicPort}=>amqp:${newMicroserviceUuid}`],
                              networkRouter: networkRouter
                            }),
                            catalogItemId: proxyCatalogItem.id,
                            iofogUuid: systemFog.uuid,
                            rootHostAccess: true,
                            registryId: 1,
                            userId: user.id
                          }
                          expect(MicroserviceManager.create).to.have.been.calledWith(remoteProxy, transaction)
                          expect(MicroserviceManager.create).to.have.been.calledWith(localProxy, transaction)
                        })

                        it('Should create the public port', async () => {
                          await $subject
                          const publicPortData = {
                            portId: 15,
                            hostId: systemFog.uuid,
                            localProxyId: newMicroservice.uuid,
                            remoteProxyId: newMicroservice.uuid,
                            publicPort: publicPort,
                            queueName: newMicroserviceUuid,
                            isTcp: false
                          }
                          expect(MicroservicePublicPortManager.create).to.have.been.calledWith(publicPortData, transaction)
                        })

                        context('When there are related extra hosts', () => {
                          const extraHosts = [{
                            save: () => {},
                            publicPort,
                            microserviceUuid: newMicroserviceUuid
                          }]
                          def('findRelatedExtraHosts', () => Promise.resolve(extraHosts))
                          beforeEach(() => {
                            $sandbox.stub(MicroserviceExtraHostManager, 'updateOriginMicroserviceChangeTracking')
                          })

                          it('Should update the extraHost with the host values', async () => {
                            await $subject
                            for (const e of extraHosts) {
                              expect(MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking).to.have.been.calledWith({...e, value: systemFog.host, targetFogUuid: systemFog.uuid}, transaction)
                            }
                          })
                        })

                        context('when there is no system fog (K8s)', () => {
                          def('findDefaultFogResponse', () => Promise.resolve(null))

                          beforeEach(() => {
                            routerStub.withArgs({isSystem: true}).returns($findDefaultRouterResponse)
                          })
                          it('should only create local proxy microservices', async () => {
                            await $subject
                            const networkRouter = {
                              host: router.host,
                              port: router.messagingPort
                            }
                            const localProxy = {
                              uuid: sinon.match.string,
                              name: 'Proxy',
                              config: JSON.stringify({
                                mappings: [`amqp:${newMicroserviceUuid}=>http:${microserviceData.ports[0].external}`],
                                networkRouter: networkRouter
                              }),
                              catalogItemId: proxyCatalogItem.id,
                              iofogUuid: microserviceData.iofogUuid,
                              rootHostAccess: true,
                              registryId: 1,
                              userId: user.id
                            }
                            const remoteProxy = {
                              uuid: sinon.match.string,
                              name: 'Proxy',
                              config: JSON.stringify({
                                mappings: [`http:${publicPort}=>amqp:${newMicroserviceUuid}`],
                                networkRouter: networkRouter
                              }),
                              catalogItemId: proxyCatalogItem.id,
                              iofogUuid: systemFog.uuid,
                              rootHostAccess: true,
                              registryId: 1,
                              userId: user.id
                            }
                            expect(MicroserviceManager.create).to.have.been.calledWith(localProxy, transaction)
                            expect(MicroserviceManager.create).not.to.have.been.calledWith(remoteProxy, transaction)
                          })
  
                          it('Should create the public port without remote host/proxy info', async () => {
                            await $subject
                            const publicPortData = {
                              portId: 15,
                              hostId: null,
                              localProxyId: newMicroservice.uuid,
                              remoteProxyId: null,
                              publicPort: publicPort,
                              queueName: newMicroserviceUuid,
                              isTcp: false
                            }
                            expect(MicroservicePublicPortManager.create).to.have.been.calledWith(publicPortData, transaction)
                          })
                        })

                      })

                      context('when MicroservicePortManager#create() fails', () => {
                        def('createMicroservicePortResponse', () => Promise.reject(error))

                        it(`fails with ${error}`, () => {
                          return expect($subject).to.be.rejectedWith(error)
                        })
                      })

                      context('when MicroservicePortManager#create() succeeds', () => {
                        it('calls MicroserviceManager#update() with correct args', async () => {
                          await $subject
                          const updateRebuildMs = {
                            rebuild: true,
                          }
                          expect(MicroserviceManager.update).to.have.been.calledWith({
                            uuid: newMicroservice.uuid,
                          }, updateRebuildMs, transaction)
                        })

                        context('when MicroserviceManager#update() fails', () => {
                          def('updateMicroserviceResponse', () => Promise.reject(error))

                          it(`fails with ${error}`, () => {
                            return expect($subject).to.be.rejectedWith(error)
                          })
                        })

                        context('when MicroserviceManager#update() succeeds', () => {
                          it('calls ChangeTrackingService#update() with correct args', async () => {
                            await $subject
                            expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
                                ChangeTrackingService.events.microserviceConfig, transaction)
                          })

                          context('when ChangeTrackingService#update() fails', () => {
                            def('updateChangeTrackingResponse', () => Promise.reject(error))

                            it(`fails with ${error}`, () => {
                              return expect($subject).to.be.rejectedWith(error)
                            })
                          })

                          context('when ChangeTrackingService#update() succeeds', () => {
                            it('calls VolumeMappingManager#bulkCreate() with correct args', async () => {
                              await $subject
                              expect(VolumeMappingManager.bulkCreate).to.have.been.calledWith(mappings,
                                  transaction)
                            })

                            context('when VolumeMappingManager#bulkCreate() fails', () => {
                              def('createVolumeMappingResponse', () => Promise.reject(error))

                              it(`fails with ${error}`, () => {
                                return expect($subject).to.be.rejectedWith(error)
                              })
                            })

                            context('when VolumeMappingManager#bulkCreate() succeeds', () => {
                              it('calls ChangeTrackingService#update() with correct args', async () => {
                                await $subject
                                expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
                                    ChangeTrackingService.events.microserviceList, transaction)
                              })

                              context('when ChangeTrackingService#update() fails', () => {
                                def('updateChangeTrackingResponse', () => Promise.reject(error))

                                it(`fails with ${error}`, () => {
                                  return expect($subject).to.be.rejectedWith(error)
                                })
                              })

                              context('when ChangeTrackingService#update() succeeds', () => {
                                it('calls MicroserviceStatusManager#create() with correct args', async () => {
                                  await $subject
                                  expect(MicroserviceStatusManager.create).to.have.been.calledWith({
                                    microserviceUuid: newMicroservice.uuid,
                                  }, transaction)
                                })

                                context('when MicroserviceStatusManager#create() fails', () => {
                                  def('createMicroserviceStatusResponse', () => Promise.reject(error))

                                  it(`fails with ${error}`, () => {
                                    return expect($subject).to.be.rejectedWith(error)
                                  })
                                })

                                context('when MicroserviceStatusManager#create() succeeds', () => {
                                  it('fulfills the promise', () => {
                                    return expect($subject).to.eventually.have.property('uuid')
                                  })
                                })

                                context('When there are extraHosts', () => {
                                  const extraHosts = [{
                                    name: 'litteral',
                                    address: 'litteral'
                                  }, {
                                    name: 'agent',
                                    address: '${Agents.test}'
                                  }, {
                                    name: 'localMsvc',
                                    address: '${Apps.application.msvc.local}'
                                  }, {
                                    name: 'publicMsvc',
                                    address: '${Apps.application.msvc.public.5000}'
                                  }]
                                  beforeEach(() => {
                                    microserviceData.extraHosts = extraHosts
                                    $sandbox.stub(MicroserviceExtraHostManager, 'create')
                                    $sandbox.stub(MicroservicePortManager, 'findAllPublicPorts').returns(Promise.resolve([{
                                      publicPort: {
                                        publicPort: 5000,
                                        hostId: extraHostFogPublic.uuid 
                                      }
                                    }]))
                                  })
                                  afterEach(() => {
                                    delete microserviceData.extraHosts
                                  })

                                  it('Should create extra hosts', async () => {
                                    await $subject
                                    const defaultExtraHost = {
                                      microserviceUuid: newMicroserviceUuid
                                    }
                                    expect(MicroserviceExtraHostManager.create).to.have.been.calledWith({
                                      name: 'litteral',
                                      template: 'litteral',
                                      templateType: 'Litteral',
                                      value: 'litteral',
                                      ...defaultExtraHost 
                                    }, transaction)
                                    expect(MicroserviceExtraHostManager.create).to.have.been.calledWith({
                                      name: 'agent',
                                      template: '${Agents.test}',
                                      templateType: 'Agents',
                                      value: fog.host,
                                      targetFogUuid: fog.uuid,
                                      ...defaultExtraHost 
                                    }, transaction)
                                    expect(MicroserviceExtraHostManager.create).to.have.been.calledWith({
                                      name: 'localMsvc',
                                      template: '${Apps.application.msvc.local}',
                                      templateType: 'Apps',
                                      value: extraHostFog.host,
                                      targetFogUuid: extraHostFog.uuid,
                                      targetMicroserviceUuid: extraHostMsvc.uuid,
                                      ...defaultExtraHost 
                                    }, transaction)
                                    expect(MicroserviceExtraHostManager.create).to.have.been.calledWith({
                                      name: 'publicMsvc',
                                      template: '${Apps.application.msvc.public.5000}',
                                      templateType: 'Apps',
                                      value: extraHostFogPublic.host,
                                      targetFogUuid: extraHostFogPublic.uuid,
                                      targetMicroserviceUuid: extraHostMsvc.uuid,
                                      publicPort: 5000,
                                      ...defaultExtraHost 
                                    }, transaction)
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
        })
      })
    })
  })

  describe('.updateMicroserviceEndPoint()', () => {
    const transaction = {};
    const error = 'Error!';

    const user = {
      id: 15
    };

    const microserviceUuid = 'testMicroserviceUuid';

    const query = isCLI
      ?
      {
        uuid: microserviceUuid
      }
      :
      {
        uuid: microserviceUuid,
        userId: user.id
      };

    const microserviceData = {
      "name": "name2",
      "config": "string",
      "catalogItemId": 15,
      "applicationId": 16,
      "iofogUuid": 'testIofogUuid',
      "rootHostAccess": true,
      "logSize": 0,
    };

    const microserviceToUpdate = {
      name: microserviceData.name,
      config: microserviceData.config,
      rebuild: microserviceData.rebuild,
      iofogUuid: microserviceData.iofogUuid,
      rootHostAccess: microserviceData.rootHostAccess,
      logSize: microserviceData.logLimit,
      volumeMappings: microserviceData.volumeMappings
    };

    const images = [
      {fogTypeId: 1, containerImage: 'hello-world'},
      {fogTypeId: 2, containerImage: 'hello-world'},
    ]

    const newMicroserviceUuid = microserviceUuid;
    const oldMicroservice = {
      uuid: newMicroserviceUuid,
      name: 'oldName',
      config: microserviceData.config,
      catalogItemId: microserviceData.catalogItemId,
      applicationId: microserviceData.applicationId,
      iofogUuid: microserviceData.iofogUuid,
      rootHostAccess: !microserviceData.rootHostAccess,
      logSize: microserviceData.logLimit,
      userId: user.id,
      catalogItem: {
        images
      }
    };

    const microserviceUpdateData = {
      uuid: oldMicroservice.uuid,
      rootHostAccess: microserviceData.rootHostAccess,
    }

    const newMicroservice = {
      ...oldMicroservice,
      rootHostAccess: microserviceUpdateData.rootHostAccess,
    }

    const randomString = 'randomString'

    def('subject', () => $subject.updateMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction));
    def('validatorResponse', () => Promise.resolve(true));
    def('deleteUndefinedFieldsResponse', () => microserviceUpdateData);
    def('oldMicroserviceResponse', () => Promise.resolve(oldMicroservice))
    def('newMicroserviceResponse', () => Promise.resolve(newMicroservice))
    def('findRegistryResponse', () => Promise.resolve({}))
    def('findCatalogItem', () => Promise.resolve({ images }))
    def('findFogResponse', () => Promise.resolve({fogTypeId: 1}))
    def('findRelatedExtraHostsResponse', () => Promise.resolve([]))


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse);
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse);
      $sandbox.stub(AppHelper, 'generateRandomString').returns(randomString);
      $sandbox.stub(ChangeTrackingService, 'update')
      $sandbox.stub(MicroserviceManager, 'findOneWithCategory').returns($oldMicroserviceResponse)
      $sandbox.stub(MicroserviceManager, 'updateAndFind').returns($newMicroserviceResponse)
      $sandbox.stub(RegistryManager, 'findOne').returns($findRegistryResponse)
      $sandbox.stub(CatalogService, 'getCatalogItem').returns($findCatalogItem)
      const stub = $sandbox.stub(ioFogManager, 'findOne')
      stub.withArgs({isDefault: true}).returns(Promise.resolve({
        uuid: 'defaultFogUuid',
        isDefault: true,
        isSystem: true
      }))
      stub.returns($findFogResponse)
      $sandbox.stub(ioFogService, 'getFog').returns($findFogResponse)
      $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findRelatedExtraHostsResponse)
    });

    it('calls Validator#validate() with correct args', async () => {
      await $subject;
      expect(Validator.validate).to.have.been.calledWith(microserviceData,
        Validator.schemas.microserviceUpdate);
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
        const microserviceToUpdate = {
          name: microserviceData.name,
          config: sinon.match.string,
          images: microserviceData.images,
          catalogItemId: microserviceData.catalogItemId,
          rebuild: microserviceData.rebuild,
          iofogUuid: microserviceData.iofogUuid,
          rootHostAccess: microserviceData.rootHostAccess,
          logSize: (microserviceData.logLimit || 50) * 1,
          registryId: microserviceData.registryId,
          volumeMappings: microserviceData.volumeMappings,
          env: microserviceData.env,
          cmd: microserviceData.cmd
        }
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(microserviceToUpdate);
      });

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('should update the microservice', async () => {
          await $subject
          expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(query, microserviceUpdateData, transaction)
          expect(ChangeTrackingService.update).to.have.been.calledWith(newMicroservice.iofogUuid, ChangeTrackingService.events.microserviceRouting, transaction)
        })

        context('when the microservice could not be found', () => {
          def('oldMicroserviceResponse', () => Promise.resolve(null))

          it('should error with NotFound', async () => {
            try{
              await $subject
            } catch(e) {
              return expect(e).to.be.instanceOf(Errors.NotFoundError)
            }
            return expect(true).to.eql(false)
          })
        })

        context('when the registry could not be found', () => {
          def('deleteUndefinedFieldsResponse', () => ({
            uuid: microserviceUuid,
            registryId: 5,
          }))
          def('findRegistryResponse', () => Promise.resolve(null))

          it('should error with NotFound', async () => {
            try{
              await $subject
            } catch(e) {
              return expect(e).to.be.instanceOf(Errors.NotFoundError)
            }
            return expect(true).to.eql(false)
          })
        })

        context('when there are local related extra hosts', () => {
          const relatedExtraHosts = [{ 
            targetFogUuid: newMicroservice.iofogUuid
          }]
          def('findRelatedExtraHostsResponse', () => Promise.resolve(relatedExtraHosts))
          beforeEach(() => {
            $sandbox.stub(MicroserviceExtraHostManager, 'updateOriginMicroserviceChangeTracking')
          })

          it('Should not update related extraHost', async () => {
            await $subject
            expect(MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking).not.to.have.been.called
          })

          context('when microservice is moved to another agent', () => {
            const relatedExtraHosts = [{ 
              targetFogUuid: 'previousUuid',
              save: () => {}
            }]
            const extraHostFog = {uuid: newMicroservice.iofogUuid, host: '1.2.3.4', fogTypeId: 1}

            context('when there is no valid image', () => {
              const catalogItemNoImages = {
                id: 3,
                images: []
              }
              def('findCatalogItem', () => Promise.resolve(catalogItemNoImages))
              it('Should throw validation error', async () => {
                try {
                  await $subject
                } catch (e) {
                  expect(e).to.be.instanceOf(Errors.ValidationError)
                }
              })
            })
            def('findRelatedExtraHostsResponse', () => Promise.resolve(relatedExtraHosts))
            def('findRelatedExtraHostFogResponse', () => Promise.resolve(extraHostFog))
            def('findFogResponse', () => Promise.resolve(extraHostFog))

            it('Should update related extraHost', async () => {
              await $subject
              for (const e of relatedExtraHosts) {
                expect(MicroserviceExtraHostManager.updateOriginMicroserviceChangeTracking).to.have.been.calledWith({...e, targetFogUuid: newMicroservice.iofogUuid, value: '1.2.3.4'}, transaction)
              }
            })

          })

        })

        context('when microservice is moved to another agent', () => {
          const oldFog = {
            uuid: 'oldUuid'
          }
          const newFog = {
            uuid: 'newFogUuid',
            fogTypeId: 1
          }
          const portMappings = []
          def('oldMicroserviceResponse', () => Promise.resolve({
            ...oldMicroservice,
            iofogUuid: oldFog.uuid,
            getPorts: () => Promise.resolve([])
          }))
          const newMicroservice = {
            ...microserviceUpdateData,
            iofogUuid: newFog.uuid,
          }
          const updatedNewMicroservice = {
            ...newMicroservice,
            getPorts: () => Promise.resolve([])
          }
          def('newMicroserviceResponse', () => Promise.resolve(updatedNewMicroservice))
          def('deleteUndefinedFieldsResponse', () => newMicroservice)
          def('getNewAgentMicroserviceReponse', () => Promise.resolve([]))
          def('newAgentPublicPortsResponse', () => Promise.resolve([]))
          def('findRoutesResponse', () => Promise.resolve([]))
          def('getPortsResponse', () => Promise.resolve([]))
          def('findFogResponse', () => Promise.resolve({ ...newFog, getMicroservice: () => $getNewAgentMicroserviceReponse }))

          beforeEach(() => {
            $sandbox.stub(MicroservicePublicPortManager, 'findAll').returns($newAgentPublicPortsResponse)
            $sandbox.stub(updatedNewMicroservice, 'getPorts').returns($getPortsResponse)
          })

          it('should look for ports to move', async () => {
            await $subject
            expect(updatedNewMicroservice.getPorts).to.have.been.called
          })

          context('when there are ports to move', async () => {
            const portMappings = [{
              internalPort: 1,
              externalPort: 1,
            }]
            def('getPortsResponse', () => Promise.resolve(portMappings))

            beforeEach(() => {
              $sandbox.stub(MicroservicePublicPortManager, 'updateOrCreate')
            })

            it('should not move any proxy microservice', async () => {
              await $subject
              return expect(MicroservicePublicPortManager.updateOrCreate).not.to.have.been.called
            })

            context('when there is a public port', async () => {
              const localProxyMsvcUUID = 'localProxyMsvcUUID'
              const publicPort = {
                id: 42,
                queueName: 'testqueue',
                protocol: 'http',
                localProxyId: localProxyMsvcUUID
              }
              const publicPortMapping = {
                portInternal: 2,
                portExternal: 2,
                isPublic: true,
                getPublicPort: () => Promise.resolve({...publicPort, toJSON: () => publicPort})
              }
              const portMappings = [{
                internalPort: 1,
                externalPort: 1,
              }, publicPortMapping]

              const localMapping = `amqp:${publicPort.queueName}=>${publicPort.protocol}:${publicPortMapping.portExternal}`

              const proxyMsvc = {
                uuid: localProxyMsvcUUID,
                catalogItemId: 15,
                config: JSON.stringify({
                  mappings: [localMapping, `fake:queue:because:test:update`]
                })
              }
              const agentRouter = {
                host: 'agentRouterHost',
                messagingPort: 5672
              }
              const networkRouter = {
                host: agentRouter.host,
                port: agentRouter.messagingPort
              }
              const newProxyMsvc = {uuid: 'newProxyUuid'}
              def('getPortsResponse', () => Promise.resolve(portMappings))

              beforeEach(() => {
                const msvcStub = $sandbox.stub(MicroserviceManager, 'findOne')
                msvcStub.withArgs({uuid: localProxyMsvcUUID}).returns(Promise.resolve(proxyMsvc)) // Current Proxy
                msvcStub.returns(Promise.resolve(null)) // Dest proxy
                $sandbox.stub(MicroserviceManager, 'updateIfChanged')
                $sandbox.stub(MicroserviceManager, 'delete')
                $sandbox.stub(MicroserviceManager, 'create').returns(Promise.resolve(newProxyMsvc))
                $sandbox.stub(RouterManager, 'findOne').returns(Promise.resolve(agentRouter))
              })

              it('Should update the public port and move the proxy msvc', async () => {
                const proxyMicroserviceData = {
                  uuid: sinon.match.string,
                  name: 'Proxy',
                  config: JSON.stringify({
                    mappings: [localMapping],
                    networkRouter
                  }),
                  catalogItemId: 15,
                  iofogUuid: newFog.uuid,
                  rootHostAccess: true,
                  registryId: 1,
                  userId: user.id
                }
                await $subject
                expect(MicroserviceManager.updateIfChanged).to.have.been.calledWith(
                  {uuid: proxyMsvc.uuid},
                  {config: JSON.stringify({
                      mappings: [`fake:queue:because:test:update`]
                    })
                  },
                  transaction)
                expect(MicroserviceManager.create).to.have.been.calledWith(proxyMicroserviceData, transaction)
                expect(MicroserviceManager.delete).not.to.have.been.called
                expect(MicroservicePublicPortManager.updateOrCreate).to.have.been.calledWith({ id: publicPort.id }, publicPort, transaction)
              })
            })
          })
        })

        context('when name is changed', () => {
          const name = 'newName'
          def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateData, name}))
          def('findMicroserviceByNameResponse', () => Promise.resolve(null))
          beforeEach(() => {
            $sandbox.stub(MicroserviceManager, 'findOne').returns($findMicroserviceByNameResponse)
          })

          it('should check for duplicate name', async () => {
            const where = microserviceUuid
              ? {
                name: name,
                uuid: { [Op.ne]: microserviceUuid },
                delete: false,
                userId: user.id
              }
              : {
                name: name,
                userId: user.id,
                delete: false
              }
            await $subject
            expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction)
          })

          context('Where name is duplicated', () => {
            def('findMicroserviceByNameResponse', () => Promise.resolve({name}))
            it('should fail with DuplicatePropertyError', async () => {
              try{
                await $subject
              } catch(e) {
                return expect(e).to.be.instanceOf(Errors.DuplicatePropertyError)
              }
              return expect(true).to.eql(false)
            })
          })
        })

        context('when volume mappings are updated', () => {
          const volumeMappings = [
            {
              hostDestination: 'hd1',
              containerDestination: 'cd1',
              accessMode: 'rw'
            },
            {
              hostDestination: 'hd2',
              containerDestination: 'cd2',
              accessMode: 'rw'
            }
          ]
          def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateData, volumeMappings}))
          
          beforeEach(() => {
            $sandbox.stub(VolumeMappingManager, 'delete')
            $sandbox.stub(VolumeMappingManager, 'create')
          })

          it('should delete old mappings and create new ones', async () => {
            await $subject
            expect(VolumeMappingManager.delete).to.have.been.calledWith({microserviceUuid}, transaction)
            for (const mapping of volumeMappings) {
              const volumeMappingObj = {
                microserviceUuid: microserviceUuid,
                hostDestination: mapping.hostDestination,
                containerDestination: mapping.containerDestination,
                accessMode: mapping.accessMode,
                type: 'bind'
              }
              expect(VolumeMappingManager.create).to.have.been.calledWith(volumeMappingObj, transaction)
            }
          })
        })

        context('when env are updated', () => {
          const env = [
            {
              key: 'k1',
              value: 'v1',
            },
            {
              key: 'k2',
              value: 'v2',
            }
          ]
          def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateData, env}))
          
          beforeEach(() => {
            $sandbox.stub(MicroserviceEnvManager, 'delete')
            $sandbox.stub(MicroserviceEnvManager, 'create')
          })

          it('should delete old env and create new ones', async () => {
            await $subject
            expect(MicroserviceEnvManager.delete).to.have.been.calledWith({microserviceUuid}, transaction)
            for (const e of env) {
              const envObj = {
                microserviceUuid: microserviceUuid,
                key: e.key,
                value: e.value
              }
              expect(MicroserviceEnvManager.create).to.have.been.calledWith(envObj, transaction)
            }
          })
        })

        context('when cmd are updated', () => {
          const cmd = ['a1', 'a2']
          def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateData, cmd}))
          
          beforeEach(() => {
            $sandbox.stub(MicroserviceArgManager, 'delete')
            $sandbox.stub(MicroserviceArgManager, 'create')
          })

          it('should delete old env and create new ones', async () => {
            await $subject
            expect(MicroserviceArgManager.delete).to.have.been.calledWith({microserviceUuid}, transaction)
            for (const a of cmd) {
              const envObj = {
                microserviceUuid: microserviceUuid,
                cmd: a,
              }
              expect(MicroserviceArgManager.create).to.have.been.calledWith(envObj, transaction)
            }
          })
        })

        context('when catalog item id is updated', () => {
          const catalogItemId = 84
          const catalogItem = {
            registryId: 2,
            images
          }
          def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateData, catalogItemId}))
          def('findCatalogItem', () => Promise.resolve(catalogItem))
          def('oldMicroserviceResponse', () => Promise.resolve({...oldMicroservice, catalogItemId: catalogItemId - 1}))
          beforeEach(() => {
            $sandbox.stub(CatalogItemImageManager, 'delete')
          })

          context('when there is no valid image', () => {
            const catalogItemNoImages = {
              ...catalogItem,
              images: []
            }
            def('findCatalogItem', () => Promise.resolve(catalogItemNoImages))
            it('Should throw validation error', async () => {
              try {
                await $subject
              } catch (e) {
                expect(e).to.be.instanceOf(Errors.ValidationError)
              }
            })
          })

          it('Should delete microservice images', async () => {
            await $subject
            return expect(CatalogItemImageManager.delete).to.have.been.calledWith({
              microserviceUuid
            }, transaction)
          })

          it('Should update with proper registryId', async () => {
            await $subject
            expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(query, {...microserviceUpdateData, rebuild: true, catalogItemId, registryId: catalogItem.registryId}, transaction)
          })
        })

        context('when images are updated', () => {
          const images = [
            {fogTypeId: 1, containerImage: 'newImage:x86'},
            {fogTypeId: 2, containerImage: 'newImage:arm'},
          ]
          registryId = 1
          const microserviceUpdateDataWithImages = {...microserviceUpdateData, images, registryId}
          def('deleteUndefinedFieldsResponse', () => (microserviceUpdateDataWithImages))

          beforeEach(() => {
            $sandbox.stub(CatalogItemImageManager, 'delete')
            $sandbox.stub(CatalogItemImageManager, 'bulkCreate')
          })

          context('when there is no valid image', () => {
            const images = [
              {}
            ]
            registryId = 1
            const microserviceUpdateDataWithImages = {...microserviceUpdateData, images, registryId}
            def('deleteUndefinedFieldsResponse', () => (microserviceUpdateDataWithImages))
            it('Should throw validation error', async () => {
              try {
                await $subject
              } catch (e) {
                expect(e).to.be.instanceOf(Errors.ValidationError)
              }
            })
          })

          it('should update images', async () => {
            await $subject  
            const newImages = []
            for (const img of images) {
              const newImg = Object.assign({}, img)
              newImg.microserviceUuid = microserviceUuid
              newImages.push(newImg)
            }
            expect(CatalogItemImageManager.delete).to.have.been.calledWith({microserviceUuid}, transaction)
            expect(CatalogItemImageManager.bulkCreate).to.have.been.calledWith(newImages, transaction)
          })

          it('should set rebuild flag', async () => {
            await $subject
            expect(MicroserviceManager.updateAndFind).to.have.been.calledWith(query, {...microserviceUpdateDataWithImages, rebuild: true}, transaction)
          })

          context('When there are no catalog item and the image array is empty', () => {
            def('oldMicroserviceResponse', () => Promise.resolve({...oldMicroservice, catalogItemId: null}))
            def('deleteUndefinedFieldsResponse', () => ({...microserviceUpdateDataWithImages, images: []}))

            it('should error with ValidationError', async () => {
              try{
                await $subject
              } catch(e){
                return expect(e).to.be.instanceOf(Errors.ValidationError)
              }
              return expect(true).to.eql(false)
            })
          })

        })

      })
    })
  });

  describe('.deleteMicroserviceEndPoint()', () => {
    const transaction = {};

    const microserviceUuid = 'msvcToDeleteUUID'
    const isCLI = false
    const user = {
      id: 15
    }

    const microserviceData = {
      uuid: microserviceUuid,
      iofogUuid: 'msvciofoguuid'
    }

    def('subject', () => $subject.deleteMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction))
    def('findMicroserviceResponse', () => Promise.resolve(microserviceData))
    def('findRoutesResponse', () => Promise.resolve([]))
    def('findPortMappings', () => Promise.resolve([]))
  
    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithStatusAndCategory').returns($findMicroserviceResponse)
      $sandbox.stub(RoutingManager, 'findAll').returns($findRoutesResponse)
      $sandbox.stub(MicroservicePortManager, 'findAll').returns($findPortMappings)
      $sandbox.stub(MicroserviceManager, 'delete')
      $sandbox.stub(ChangeTrackingService, 'update')
    })

    it('should delete the microservice', async () => {
      await $subject
      expect(MicroserviceManager.delete).to.have.been.calledWith({uuid: microserviceUuid}, transaction)
      return expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid, ChangeTrackingService.events.microserviceList, transaction)
    })

    context('when microservice is not found', () => {
      def('findMicroserviceResponse', () => Promise.resolve(null))
      it('should fail with NotFound error', async () => {
        try {
          await $subject
        } catch(e) {
          return expect(e).to.be.instanceOf(Errors.NotFoundError)
        }
        return expect(true).to.eql(false)
      })
    })

    context('when microservice is system', () => {
      def('findMicroserviceResponse', () => Promise.resolve({
        catalogItem: {
          category: 'SYSTEM'
        }
      }))
      it('should fail with NotFound error', async () => {
        try {
          await $subject
        } catch(e) {
          return expect(e).to.be.instanceOf(Errors.NotFoundError)
        }
        return expect(true).to.eql(false)
      })
    })

    context('when there are routes', () => {
      const routes = [{
        name: 'one',
        sourceMicroserviceUuid: 'srcMsvcUUID1',
        destMicroserviceUuid: 'destMsvcUUID1',
      }, {
        name: 'two',
        sourceMicroserviceUuid: 'srcMsvcUUID2',
        destMicroserviceUuid: 'destMsvcUUID2',
      }]
      def('findRoutesResponse', () => Promise.resolve(routes))

      const routeAgentUuid = 'routeAgentUUID'

      beforeEach(() => {
        $sandbox.stub(RoutingManager, 'delete')
        const findOneStub = $sandbox.stub(RoutingManager, 'findOne')
        for (const route of routes){
          findOneStub.withArgs({name: route.name}, transaction).returns(route)
        }
        const stub = $sandbox.stub(MicroserviceManager, 'findOne')
        for(const route of routes) {
          stub.withArgs({uuid: route.sourceMicroserviceUuid}).returns(Promise.resolve({iofogUuid: routeAgentUuid + route.sourceMicroserviceUuid}))
          stub.withArgs({uuid: route.destMicroserviceUuid}).returns(Promise.resolve({iofogUuid: routeAgentUuid + route.destMicroserviceUuid}))
        }
      })

      it('should delete routes', async () => {
        await $subject

        for(const route of routes) {
          expect(RoutingManager.findOne).to.have.been.calledWith({name: route.name}, transaction)
          expect(RoutingManager.delete).to.have.been.calledWith({name: route.name}, transaction)
          expect(ChangeTrackingService.update).to.have.been.calledWith(routeAgentUuid + route.sourceMicroserviceUuid, ChangeTrackingService.events.microserviceFull, transaction)
          expect(ChangeTrackingService.update).to.have.been.calledWith(routeAgentUuid + route.destMicroserviceUuid, ChangeTrackingService.events.microserviceFull, transaction)
        }
      })
    })
    
    context('when there are ports', () => {
      const publicPort = {
        id: 1,
        queueName: 'queuename',
        localProxyId: 15,
        remoteProxyId: null,
      }
      const portMappings = [{
        id: 1,
        portExternal: 1,
        portInternal: 1
      }, {
        id: 2,
        portExternal: 2,
        portInternal: 2,
        isPublic: true,
        getPublicPort: () => Promise.resolve(publicPort)
      }]
      const localProxyMsvc = {
        uuid: 'proxyuuid',
        iofogUuid: 'proxyiofoguuid',
        config: `{"mappings": ["amqp:${publicPort.queueName}=>http:${portMappings[1].portExternal}"]}`
      }
      const remoteProxyMsvc = null // Simulates K8s env
      def('findPortMappings', () => Promise.resolve(portMappings))

      beforeEach(() => {
        $sandbox.stub(MicroservicePortManager, 'delete')
        $sandbox.stub(MicroserviceManager, 'update')
        $sandbox.stub(MicroserviceManager, 'findOne')
        .withArgs({uuid: publicPort.localProxyId}, transaction).returns(Promise.resolve(localProxyMsvc))
        .withArgs({uuid: publicPort.remoteProxyId}, transaction).returns(Promise.resolve(remoteProxyMsvc))
      })

      it('should delete ports and proxy msvc', async () => {
        await $subject
        // Private port
        expect(MicroservicePortManager.delete).to.have.been.calledWith({id: portMappings[0].id}, transaction)
        expect(MicroserviceManager.update).to.have.been.calledWith({ uuid: microserviceData.uuid }, {rebuild: true}, transaction)
        expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
      
        // Public port
        expect(MicroserviceManager.findOne).to.have.been.calledWith({uuid: publicPort.localProxyId}, transaction)
        expect(MicroserviceManager.findOne).to.have.been.calledWith({uuid: publicPort.remoteProxyId}, transaction)
        expect(MicroserviceManager.delete).to.have.been.calledWith({uuid: localProxyMsvc.uuid}, transaction)
        expect(ChangeTrackingService.update).to.have.been.calledWith(localProxyMsvc.iofogUuid, ChangeTrackingService.events.microserviceConfig, transaction)
        expect(MicroservicePortManager.delete).to.have.been.calledWith({id: portMappings[1].id}, transaction)
      })
    })

  });

  describe('.createPortMappingEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const microserviceUuid = 'testMicroserviceUuid'

    const microserviceData = {
      'uuid': microserviceUuid,
      'name': 'name2',
      'config': 'string',
      'catalogItemId': 15,
      'applicationId': 16,
      'iofogUuid': 'testIofogUuid',
      'rootHostAccess': true,
      'logSize': 0,
      'volumeMappings': [
        {
          'hostDestination': '/var/dest',
          'containerDestination': '/var/dest',
          'accessMode': 'rw',
        },
      ],
      'ports': [
        {
          'internal': 1,
          'external': 1,
          'publicMode': false,
        },
      ],
      'routes': [],
    }
    const newMicroservice = {
      uuid: microserviceUuid,
      name: microserviceData.name,
      config: microserviceData.config,
      catalogItemId: microserviceData.catalogItemId,
      applicationId: microserviceData.applicationId,
      iofogUuid: microserviceData.iofogUuid,
      rootHostAccess: microserviceData.rootHostAccess,
      logSize: microserviceData.logLimit,
      registryId: 1,
      userId: user.id,
    }

    const portMappingData = [
      {
        'internal': 1,
        'external': 1,
        'publicMode': false,
      },
    ]

    const where = isCLI
      ? { uuid: microserviceUuid }
      : { uuid: microserviceUuid, userId: user.id }

    const mappingData = {
      isPublic: false,
      portInternal: portMappingData.internal,
      portExternal: portMappingData.external,
      userId: microserviceData.userId,
      microserviceUuid: microserviceData.uuid,
    }

    const fog = {
      uuid: microserviceData.iofogUuid,
      name: 'testFog'
    }

    def('subject', () => $subject.createPortMappingEndPoint(microserviceUuid, portMappingData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findMicroserviceResponse', () => Promise.resolve(microserviceData))
    def('findMicroservicePortResponse', () => Promise.resolve())
    def('createMicroservicePortResponse', () => Promise.resolve())
    def('updateMicroserviceResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('findOneFogResponse', () => Promise.resolve({...fog, getMicroservice: () => Promise.resolve([])}))
    def('findPublicPortsResponse', () => Promise.resolve([]))
    def('findRelatedExtraHosts', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(MicroserviceManager, 'findOne').returns($findMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findOne').returns($findMicroservicePortResponse)
      $sandbox.stub(MicroservicePortManager, 'create').returns($createMicroservicePortResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($findOneFogResponse)
      $sandbox.stub(MicroservicePublicPortManager, 'findAll').returns($findPublicPortsResponse)
      $sandbox.stub(MicroserviceExtraHostManager, 'findAll').returns($findRelatedExtraHosts)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(portMappingData, Validator.schemas.portsCreate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls MicroserviceManager#findOne() with correct args', async () => {
        await $subject
        expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction)
      })

      context('when MicroserviceManager#findOne() fails', () => {
        def('findMicroserviceResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when MicroserviceManager#findOne() succeeds', () => {
        it('calls MicroservicePortManager#findOne() with correct args', async () => {
          await $subject
          expect(MicroservicePortManager.findOne).to.have.been.calledWith({
            microserviceUuid: microserviceUuid,
            [Op.or]:
              [
                {
                  portInternal: portMappingData.internal,
                },
                {
                  portExternal: portMappingData.external,
                },
              ],
          }, transaction)
        })

        context('when MicroservicePortManager#findOne() fails', () => {
          def('findMicroservicePortResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when MicroservicePortManager#findOne() succeeds', () => {
          it('calls MicroservicePortManager#create() with correct args', async () => {
            await $subject
            expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction)
          })

          context('when MicroservicePortManager#create() fails', () => {
            def('createMicroservicePortResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when MicroservicePortManager#create() succeeds', () => {
            it('calls MicroserviceManager#update() with correct args', async () => {
              await $subject
              const updateRebuildMs = {
                rebuild: true,
              }
              expect(MicroserviceManager.update).to.have.been.calledWith({
                uuid: newMicroservice.uuid,
              }, updateRebuildMs, transaction)
            })

            context('when MicroserviceManager#update() fails', () => {
              def('updateMicroserviceResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when MicroserviceManager#update() succeeds', () => {
              it('calls ChangeTrackingService#update() with correct args', async () => {
                await $subject
                expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
                    ChangeTrackingService.events.microserviceConfig, transaction)
              })

              context('when ChangeTrackingService#update() fails', () => {
                def('updateChangeTrackingResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ChangeTrackingService#update() succeeds', () => {
                it('fulfills the promise', () => {
                  return expect($subject).eventually.equals(undefined)
                })
              })
            })
          })
        })
      })
    })
  })
})

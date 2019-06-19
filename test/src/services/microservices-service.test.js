const { expect } = require('chai')
const sinon = require('sinon')

const MicroserviceManager = require('../../../src/database/managers/microservice-manager')
const MicroservicesService = require('../../../src/services/microservices-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const CatalogService = require('../../../src/services/catalog-service')
const FlowService = require('../../../src/services/flow-service')
const ioFogService = require('../../../src/services/iofog-service')
const MicroservicePortManager = require('../../../src/database/managers/microservice-port-manager')
const VolumeMappingManager = require('../../../src/database/managers/volume-mapping-manager')
const MicroserviceStatusManager = require('../../../src/database/managers/microservice-status-manager')
const RoutingManager = require('../../../src/database/managers/routing-manager')
const MicroserviceEnvManager = require('../../../src/database/managers/microservice-env-manager')
const MicroserviceArgManager = require('../../../src/database/managers/microservice-arg-manager')
const Op = require('sequelize').Op
const ConnectorManager = require('../../../src/database/managers/connector-manager')
const ConnectorPortManager = require('../../../src/database/managers/connector-port-manager')
const MicroservicePublicModeManager = require('../../../src/database/managers/microservice-public-mode-manager')

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

    const flowId = 10

    const response = [
      {
        uuid: 'testUuid',
      },
    ]

    def('subject', () => $subject.listMicroservicesEndPoint(flowId, user, isCLI, transaction))
    def('findMicroservicesResponse', () => Promise.resolve(response))
    def('findPortMappingsResponse', () => Promise.resolve([]))
    def('findVolumeMappingsResponse', () => Promise.resolve([]))
    def('findRoutesResponse', () => Promise.resolve([]))
    def('publicModeResponse', () => Promise.resolve([]))
    def('connectorPortResponse', () => Promise.resolve({}))
    def('connectorResponse', () => Promise.resolve({}))
    def('envResponse', () => Promise.resolve([]))
    def('cmdResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findAllExcludeFields').returns($findMicroservicesResponse)
      $sandbox.stub(MicroservicePortManager, 'findAll').returns($findPortMappingsResponse)
      $sandbox.stub(VolumeMappingManager, 'findAll').returns($findVolumeMappingsResponse)
      $sandbox.stub(RoutingManager, 'findAll').returns($findRoutesResponse)
      $sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').returns($envResponse)
      $sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').returns($cmdResponse)
      $sandbox.stub(MicroservicePublicModeManager, 'findAll').returns($publicModeResponse)
      $sandbox.stub(ConnectorPortManager, 'findOne').returns($connectorPortResponse)
      $sandbox.stub(ConnectorManager, 'findOne').returns($connectorResponse)
    })

    it('calls MicroserviceManager#findAllExcludeFields() with correct args', async () => {
      await $subject
      const where = isCLI ? { delete: false } : { flowId: flowId, delete: false }

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
    def('publicModeResponse', () => Promise.resolve([]))
    def('connectorPortResponse', () => Promise.resolve({}))
    def('connectorResponse', () => Promise.resolve({}))
    def('envResponse', () => Promise.resolve([]))
    def('cmdResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneExcludeFields').returns($findMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findAll').returns($findPortMappingsResponse)
      $sandbox.stub(VolumeMappingManager, 'findAll').returns($findVolumeMappingsResponse)
      $sandbox.stub(RoutingManager, 'findAll').returns($findRoutesResponse)
      $sandbox.stub(MicroserviceEnvManager, 'findAllExcludeFields').returns($envResponse)
      $sandbox.stub(MicroserviceArgManager, 'findAllExcludeFields').returns($cmdResponse)
      $sandbox.stub(MicroservicePublicModeManager, 'findAll').returns($publicModeResponse)
      $sandbox.stub(ConnectorPortManager, 'findOne').returns($connectorPortResponse)
      $sandbox.stub(ConnectorManager, 'findOne').returns($connectorResponse)
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

    context('when microservice has public ports', () => {
      def('findPortMappingsResponse', () => Promise.resolve([
        {
          id: 1,
          portInternal: 80,
          portInternal: 8080,
          isPublic: true,
        },
      ]))
      def('publicModeResponse', () => Promise.resolve([{ microservicePortId: 1, connectorPortId: 1 }]))
      def('connectorPortResponse', () => Promise.resolve({ connectorPortId: 1, port2: 1234 }))
      def('connectorResponse', () => Promise.resolve({
        publicIp: '1.2.3.4',
        devMode: true,
      }))

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

    const microserviceData = {
      'name': 'name2',
      'config': 'string',
      'catalogItemId': 15,
      'flowId': 16,
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

    const newMicroserviceUuid = 'newMicroserviceUuid'
    const newMicroservice = {
      uuid: newMicroserviceUuid,
      name: microserviceData.name,
      config: microserviceData.config,
      catalogItemId: microserviceData.catalogItemId,
      flowId: microserviceData.flowId,
      iofogUuid: microserviceData.iofogUuid,
      rootHostAccess: microserviceData.rootHostAccess,
      logSize: microserviceData.logLimit,
      userId: user.id,
    }

    const item = {}

    const portMappingData =
      {
        'internal': 1,
        'external': 1,
        'publicMode': false,
      }

    const mappings = []
    for (const volumeMapping of microserviceData.volumeMappings) {
      const mapping = Object.assign({}, volumeMapping)
      mapping.microserviceUuid = microserviceData.uuid
      mappings.push(mapping)
    }

    const mappingData = {
      isPublic: false,
      portInternal: portMappingData.internal,
      portExternal: portMappingData.external,
      userId: microserviceData.userId,
      microserviceUuid: microserviceData.uuid,
    }

    def('subject', () => $subject.createMicroserviceEndPoint(microserviceData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('validatorResponse2', () => Promise.resolve(true))
    def('generateRandomStringResponse', () => newMicroserviceUuid)
    def('deleteUndefinedFieldsResponse', () => newMicroservice)
    def('findMicroserviceResponse', () => Promise.resolve())
    def('findMicroserviceResponse2', () => Promise.resolve(microserviceData))
    def('getCatalogItemResponse', () => Promise.resolve())
    def('getFlowResponse', () => Promise.resolve())
    def('getIoFogResponse', () => Promise.resolve())
    def('createMicroserviceResponse', () => Promise.resolve(microserviceData))
    def('findMicroservicePortResponse', () => Promise.resolve())
    def('createMicroservicePortResponse', () => Promise.resolve())
    def('updateMicroserviceResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('createVolumeMappingResponse', () => Promise.resolve())
    def('createMicroserviceStatusResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate')
          .onFirstCall().returns($validatorResponse)
          .onSecondCall().returns($validatorResponse2)
      $sandbox.stub(AppHelper, 'generateRandomString').returns($generateRandomStringResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(MicroserviceManager, 'findOne')
          .onFirstCall().returns($findMicroserviceResponse)
          .onSecondCall().returns($findMicroserviceResponse2)
      $sandbox.stub(CatalogService, 'getCatalogItem').returns($getCatalogItemResponse)
      $sandbox.stub(FlowService, 'getFlow').returns($getFlowResponse)
      $sandbox.stub(ioFogService, 'getFog').returns($getIoFogResponse)
      $sandbox.stub(MicroserviceManager, 'create').returns($createMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findOne').returns($findMicroservicePortResponse)
      $sandbox.stub(MicroservicePortManager, 'create').returns($createMicroservicePortResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      $sandbox.stub(VolumeMappingManager, 'bulkCreate').returns($createVolumeMappingResponse)
      $sandbox.stub(MicroserviceStatusManager, 'create').returns($createMicroserviceStatusResponse)
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
              }
              :
              {
                name: microserviceData.name,
                userId: user.id,
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
              it('calls FlowService#getFlow() with correct args', async () => {
                await $subject
                expect(FlowService.getFlow).to.have.been.calledWith(newMicroservice.flowId,
                    user, isCLI, transaction)
              })

              context('when FlowService#getFlow() fails', () => {
                def('getFlowResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when FlowService#getFlow() succeeds', () => {
                it('calls IoFogService#getFog() with correct args', async () => {
                  await $subject
                  expect(ioFogService.getFog).to.have.been.calledWith({
                    uuid: newMicroservice.iofogUuid,
                  }, user, isCLI, transaction)
                })

                context('when IoFogService#getFog() fails', () => {
                  def('getIoFogResponse', () => Promise.reject(error))

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when IoFogService#getFog() succeeds', () => {
                  it('calls MicroserviceManager#create() with correct args', async () => {
                    await $subject
                    expect(MicroserviceManager.create).to.have.been.calledWith(newMicroservice,
                        transaction)
                  })

                  context('when MicroserviceManager#create() fails', () => {
                    def('getIoFogResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when MicroserviceManager#create() succeeds', () => {
                    it('calls MicroservicePortManager#findOne() with correct args', async () => {
                      await $subject
                      expect(MicroservicePortManager.findOne).to.have.been.calledWith({
                        microserviceUuid: microserviceData.uuid,
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
                            uuid: microserviceData.uuid,
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
                                    microserviceUuid: microserviceData.uuid,
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

  //
  //   describe('.updateMicroserviceEndPoint()', () => {
  //     const transaction = {};
  //     const error = 'Error!';
  //
  //     const user = {
  //       id: 15
  //     };
  //
  //     const microserviceUuid = 'testMicroserviceUuid';
  //
  //     const query = isCLI
  //       ?
  //       {
  //         uuid: microserviceUuid
  //       }
  //       :
  //       {
  //         uuid: microserviceUuid,
  //         userId: user.id
  //       };
  //
  //     const microserviceData = {
  //       "name": "name2",
  //       "config": "string",
  //       "catalogItemId": 15,
  //       "flowId": 16,
  //       "iofogUuid": 'testIofogUuid',
  //       "rootHostAccess": true,
  //       "logSize": 0,
  //       "volumeMappings": [
  //         {
  //           "hostDestination": "/var/dest",
  //           "containerDestination": "/var/dest",
  //           "accessMode": "rw"
  //         }
  //       ],
  //       "ports": [
  //         {
  //           "internal": 1,
  //           "external": 1,
  //           "publicMode": false
  //         }
  //       ],
  //       "routes": []
  //     };
  //
  //     const microserviceToUpdate = {
  //       name: microserviceData.name,
  //       config: microserviceData.config,
  //       rebuild: microserviceData.rebuild,
  //       iofogUuid: microserviceData.iofogUuid,
  //       rootHostAccess: microserviceData.rootHostAccess,
  //       logSize: microserviceData.logLimit,
  //       volumeMappings: microserviceData.volumeMappings
  //     };
  //
  //     const newMicroserviceUuid = 'newMicroserviceUuid';
  //     const newMicroservice = {
  //       uuid: newMicroserviceUuid,
  //       name: microserviceData.name,
  //       config: microserviceData.config,
  //       catalogItemId: microserviceData.catalogItemId,
  //       flowId: microserviceData.flowId,
  //       iofogUuid: microserviceData.iofogUuid,
  //       rootHostAccess: microserviceData.rootHostAccess,
  //       logSize: microserviceData.logLimit,
  //       userId: user.id
  //     };
  //
  //     const item = {};
  //
  //     const portMappingData =
  //       {
  //         "internal": 1,
  //         "external": 1,
  //         "publicMode": false
  //       };
  //
  //     const mappings = [];
  //     for (const volumeMapping of microserviceData.volumeMappings) {
  //       const mapping = Object.assign({}, volumeMapping);
  //       mapping.microserviceUuid = microserviceData.uuid;
  //       mappings.push(mapping);
  //     }
  //
  //     const mappingData = {
  //       isPublic: false,
  //       portInternal: portMappingData.internal,
  //       portExternal: portMappingData.external,
  //       userId: microserviceData.userId,
  //       microserviceUuid: microserviceData.uuid
  //     };
  //
  //     def('subject', () => $subject.updateMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction));
  //     def('validatorResponse', () => Promise.resolve(true));
  //     def('deleteUndefinedFieldsResponse', () => newMicroservice);
  //     def('findMicroserviceResponse', () => Promise.resolve());
  //     def('findMicroserviceResponse2', () => Promise.resolve(microserviceData));
  //     def('getIoFogResponse', () => Promise.resolve());
  //     def('updateMicroserviceResponse', () => Promise.resolve());
  //     def('updateVolumeMappingResponse', () => Promise.resolve());
  // // TODO
  //
  //     def('updateChangeTrackingResponse', () => Promise.resolve());
  //     def('updateChangeTrackingResponse2', () => Promise.resolve());
  //     def('updateChangeTrackingResponse3', () => Promise.resolve());
  //
  //     beforeEach(() => {
  //       $sandbox.stub(Validator, 'validate').returns($validatorResponse);
  //       $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse);
  //       $sandbox.stub(MicroserviceManager, 'findOne')
  //         .onFirstCall().returns($findMicroserviceResponse)
  //         .onSecondCall().returns($findMicroserviceResponse2);
  //       $sandbox.stub(ioFogService, 'getFog').returns($getIoFogResponse);
  //       $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse);
  //       $sandbox.stub(VolumeMappingManager, 'update').returns($updateVolumeMappingResponse);
  //       $sandbox.stub(RoutingManager, 'findAll').returns($findAllRoutesResponse);
  //
  //       // TODO
  //       // delete route endpoint
  //       // create route endpoint
  //       $sandbox.stub(ChangeTrackingService, 'update')
  //         .onFirstCall().returns($updateChangeTrackingResponse)
  //         .onSecondCall().returns($updateChangeTrackingResponse2)
  //         .onThirdCall().returns($updateChangeTrackingResponse3);
  //     });
  //
  //     it('calls Validator#validate() with correct args', async () => {
  //       await $subject;
  //       expect(Validator.validate).to.have.been.calledWith(microserviceData,
  //         Validator.schemas.microserviceCreate);
  //     });
  //
  //     context('when Validator#validate() fails', () => {
  //       def('validatorResponse', () => Promise.reject(error));
  //
  //       it(`fails with ${error}`, () => {
  //         return expect($subject).to.be.rejectedWith(error);
  //       })
  //     });
  //
  //     context('when Validator#validate() succeeds', () => {
  //       it('calls AppHelper#generateRandomString() with correct args', async () => {
  //         await $subject;
  //         expect(AppHelper.generateRandomString).to.have.been.calledWith(32);
  //       });
  //
  //       context('when AppHelper#generateRandomString() fails', () => {
  //         def('generateRandomStringResponse', () => error);
  //
  //         it(`fails with ${error}`, () => {
  //           return expect($subject).to.eventually.have.property('uuid');
  //         })
  //       });
  //
  //       context('when AppHelper#generateRandomString() succeeds', () => {
  //         it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
  //           await $subject;
  //           expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(newMicroservice);
  //         });
  //
  //         context('when AppHelper#deleteUndefinedFields() fails', () => {
  //           const err = 'Invalid microservice UUID \'undefined\'';
  //           def('deleteUndefinedFieldsResponse', () => Promise.reject(err));
  //
  //           it(`fails with ${error}`, () => {
  //             return expect($subject).to.be.rejectedWith(err);
  //           })
  //         });
  //
  //         context('when AppHelper#deleteUndefinedFields() succeeds', () => {
  //           it('calls MicroserviceManager#findOne() with correct args', async () => {
  //             await $subject;
  //             const where = item.id
  //               ?
  //               {
  //                 name: microserviceData.name,
  //                 uuid: {[Op.ne]: item.id},
  //                 userId: user.id
  //               }
  //               :
  //               {
  //                 name: microserviceData.name,
  //                 userId: user.id
  //               };
  //             expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction);
  //           });
  //
  //           context('when MicroserviceManager#findOne() fails', () => {
  //             def('findMicroserviceResponse', () => Promise.reject(error));
  //
  //             it(`fails with ${error}`, () => {
  //               return expect($subject).to.be.rejectedWith(error);
  //             })
  //           });
  //
  //           context('when MicroserviceManager#findOne() succeeds', () => {
  //             it('calls CatalogService#getCatalogItem() with correct args', async () => {
  //               await $subject;
  //               expect(CatalogService.getCatalogItem).to.have.been.calledWith(newMicroservice.catalogItemId,
  //                 user, isCLI, transaction);
  //             });
  //
  //             context('when CatalogService#getCatalogItem() fails', () => {
  //               def('getCatalogItemResponse', () => Promise.reject(error));
  //
  //               it(`fails with ${error}`, () => {
  //                 return expect($subject).to.be.rejectedWith(error);
  //               })
  //             });
  //
  //             context('when CatalogService#getCatalogItem() succeeds', () => {
  //               it('calls FlowService#getFlow() with correct args', async () => {
  //                 await $subject;
  //                 expect(FlowService.getFlow).to.have.been.calledWith(newMicroservice.flowId,
  //                   user, isCLI, transaction);
  //               });
  //
  //               context('when FlowService#getFlow() fails', () => {
  //                 def('getFlowResponse', () => Promise.reject(error));
  //
  //                 it(`fails with ${error}`, () => {
  //                   return expect($subject).to.be.rejectedWith(error);
  //                 })
  //               });
  //
  //               context('when FlowService#getFlow() succeeds', () => {
  //                 it('calls IoFogService#getFog() with correct args', async () => {
  //                   await $subject;
  //                   expect(ioFogService.getFog).to.have.been.calledWith({
  //                     uuid: newMicroservice.iofogUuid
  //                   }, user, isCLI, transaction);
  //                 });
  //
  //                 context('when IoFogService#getFog() fails', () => {
  //                   def('getIoFogResponse', () => Promise.reject(error));
  //
  //                   it(`fails with ${error}`, () => {
  //                     return expect($subject).to.be.rejectedWith(error);
  //                   })
  //                 });
  //
  //                 context('when IoFogService#getFog() succeeds', () => {
  //                   it('calls MicroserviceManager#create() with correct args', async () => {
  //                     await $subject;
  //                     expect(MicroserviceManager.create).to.have.been.calledWith(newMicroservice,
  //                       transaction);
  //                   });
  //
  //                   context('when MicroserviceManager#create() fails', () => {
  //                     def('getIoFogResponse', () => Promise.reject(error));
  //
  //                     it(`fails with ${error}`, () => {
  //                       return expect($subject).to.be.rejectedWith(error);
  //                     })
  //                   });
  //
  //                   context('when MicroserviceManager#create() succeeds', () => {
  //                     it('calls Validator#validate() with correct args', async () => {
  //                       await $subject;
  //                       expect(Validator.validate).to.have.been.calledWith(portMappingData, Validator.schemas.portsCreate);
  //                     });
  //
  //                     context('when Validator#validate() fails', () => {
  //                       def('validatorResponse2', () => Promise.reject(error));
  //
  //                       it(`fails with ${error}`, () => {
  //                         return expect($subject).to.be.rejectedWith(error);
  //                       })
  //                     });
  //
  //                     context('when Validator#validate() succeeds', () => {
  //                       it('calls MicroserviceManager#findOne() with correct args', async () => {
  //                         await $subject;
  //                         const where = isCLI
  //                           ? {uuid: microserviceData.uuid}
  //                           : {uuid: microserviceData.uuid, userId: user.id};
  //                         expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction);
  //                       });
  //
  //                       context('when MicroserviceManager#findOne() fails', () => {
  //                         def('findMicroserviceResponse', () => Promise.reject(error));
  //
  //                         it(`fails with ${error}`, () => {
  //                           return expect($subject).to.be.rejectedWith(error);
  //                         })
  //                       });
  //
  //                       context('when MicroserviceManager#findOne() succeeds', () => {
  //                         it('calls MicroservicePortManager#findOne() with correct args', async () => {
  //                           await $subject;
  //                           expect(MicroservicePortManager.findOne).to.have.been.calledWith({
  //                             microserviceUuid: microserviceData.uuid,
  //                             [Op.or]:
  //                               [
  //                                 {
  //                                   portInternal: portMappingData.internal
  //                                 },
  //                                 {
  //                                   portExternal: portMappingData.external
  //                                 }
  //                               ]
  //                           }, transaction);
  //                         });
  //
  //                         context('when MicroservicePortManager#findOne() fails', () => {
  //                           def('findMicroservicePortResponse', () => Promise.reject(error));
  //
  //                           it(`fails with ${error}`, () => {
  //                             return expect($subject).to.be.rejectedWith(error);
  //                           })
  //                         });
  //
  //                         context('when MicroservicePortManager#findOne() succeeds', () => {
  //                           it('calls MicroservicePortManager#create() with correct args', async () => {
  //                             await $subject;
  //                             expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction);
  //                           });
  //
  //                           context('when MicroservicePortManager#create() fails', () => {
  //                             def('createMicroservicePortResponse', () => Promise.reject(error));
  //
  //                             it(`fails with ${error}`, () => {
  //                               return expect($subject).to.be.rejectedWith(error);
  //                             })
  //                           });
  //
  //                           context('when MicroservicePortManager#create() succeeds', () => {
  //                             it('calls MicroserviceManager#update() with correct args', async () => {
  //                               await $subject;
  //                               const updateRebuildMs = {
  //                                 rebuild: true
  //                               };
  //                               expect(MicroserviceManager.update).to.have.been.calledWith({
  //                                 uuid: microserviceData.uuid
  //                               }, updateRebuildMs, transaction);
  //                             });
  //
  //                             context('when MicroserviceManager#update() fails', () => {
  //                               def('updateMicroserviceResponse', () => Promise.reject(error));
  //
  //                               it(`fails with ${error}`, () => {
  //                                 return expect($subject).to.be.rejectedWith(error);
  //                               })
  //                             });
  //
  //                             context('when MicroserviceManager#update() succeeds', () => {
  //                               it('calls ChangeTrackingService#update() with correct args', async () => {
  //                                 await $subject;
  //                                 expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
  //                                   ChangeTrackingService.events.microserviceConfig, transaction);
  //                               });
  //
  //                               context('when ChangeTrackingService#update() fails', () => {
  //                                 def('updateChangeTrackingResponse', () => Promise.reject(error));
  //
  //                                 it(`fails with ${error}`, () => {
  //                                   return expect($subject).to.be.rejectedWith(error);
  //                                 })
  //                               });
  //
  //                               context('when ChangeTrackingService#update() succeeds', () => {
  //                                 it('calls VolumeMappingManager#bulkCreate() with correct args', async () => {
  //                                   await $subject;
  //                                   expect(VolumeMappingManager.bulkCreate).to.have.been.calledWith(mappings,
  //                                     transaction);
  //                                 });
  //
  //                                 context('when VolumeMappingManager#bulkCreate() fails', () => {
  //                                   def('createVolumeMappingResponse', () => Promise.reject(error));
  //
  //                                   it(`fails with ${error}`, () => {
  //                                     return expect($subject).to.be.rejectedWith(error);
  //                                   })
  //                                 });
  //
  //                                 context('when VolumeMappingManager#bulkCreate() succeeds', () => {
  //                                   it('calls ChangeTrackingService#update() with correct args', async () => {
  //                                     await $subject;
  //                                     expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
  //                                       ChangeTrackingService.events.microserviceList, transaction);
  //                                   });
  //
  //                                   context('when ChangeTrackingService#update() fails', () => {
  //                                     def('updateChangeTrackingResponse', () => Promise.reject(error));
  //
  //                                     it(`fails with ${error}`, () => {
  //                                       return expect($subject).to.be.rejectedWith(error);
  //                                     })
  //                                   });
  //
  //                                   context('when ChangeTrackingService#update() succeeds', () => {
  //                                     it('calls MicroserviceStatusManager#create() with correct args', async () => {
  //                                       await $subject;
  //                                       expect(MicroserviceStatusManager.create).to.have.been.calledWith({
  //                                         microserviceUuid: microserviceData.uuid
  //                                       }, transaction);
  //                                     });
  //
  //                                     context('when MicroserviceStatusManager#create() fails', () => {
  //                                       def('createMicroserviceStatusResponse', () => Promise.reject(error));
  //
  //                                       it(`fails with ${error}`, () => {
  //                                         return expect($subject).to.be.rejectedWith(error);
  //                                       })
  //                                     });
  //
  //                                     context('when MicroserviceStatusManager#create() succeeds', () => {
  //                                       it('fulfills the promise', () => {
  //                                         return expect($subject).to.eventually.have.property('uuid');
  //                                       })
  //                                     })
  //                                   })
  //                                 })
  //                               })
  //                             })
  //                           })
  //                         })
  //                       })
  //                     })
  //                   })
  //                 })
  //               })
  //             })
  //           })
  //         })
  //       })
  //     })
  //   });
  //
  //
  //   describe('.deleteMicroserviceEndPoint()', () => {
  //     const transaction = {};
  //     const error = 'Error!';
  //
  //     const user = {
  //       id: 15
  //     };
  //
  //     const microserviceUuid = 'testMicroserviceUuid';
  //
  //     const microserviceData = {
  //       "name": "name2",
  //       "config": "string",
  //       "catalogItemId": 15,
  //       "flowId": 16,
  //       "iofogUuid": 'testIofogUuid',
  //       "rootHostAccess": true,
  //       "logSize": 0,
  //       "volumeMappings": [
  //         {
  //           "hostDestination": "/var/dest",
  //           "containerDestination": "/var/dest",
  //           "accessMode": "rw"
  //         }
  //       ],
  //       "ports": [
  //         {
  //           "internal": 1,
  //           "external": 1,
  //           "publicMode": false
  //         }
  //       ],
  //       "routes": []
  //     };
  //
  //     const portMappingData = [
  //       {
  //         "internal": 1,
  //         "external": 1,
  //         "publicMode": false
  //       }
  //     ];
  //
  //
  //     const where = isCLI
  //       ?
  //       {
  //         uuid: microserviceUuid,
  //       }
  //       :
  //       {
  //         uuid: microserviceUuid,
  //         userId: user.id
  //       };
  //
  //     const mappingData = {
  //       isPublic: false,
  //       portInternal: portMappingData.internal,
  //       portExternal: portMappingData.external,
  //       userId: microserviceData.userId,
  //       microserviceUuid: microserviceData.uuid
  //     };
  //
  //     def('subject', () => $subject.deleteMicroserviceEndPoint(microserviceUuid, microserviceData, user, isCLI, transaction));
  //     def('findMicroserviceResponse', () => Promise.resolve(microserviceData));
  //     def('findMicroservicePortResponse', () => Promise.resolve());
  //     def('deleteMicroservicePortResponse', () => Promise.resolve());
  //     def('updateMicroserviceResponse', () => Promise.resolve());
  //     def('updateChangeTrackingResponse', () => Promise.resolve());
  //
  //     beforeEach(() => {
  //       $sandbox.stub(MicroserviceManager, 'findOneWithStatusAndCategory').returns($findMicroserviceResponse);
  //       $sandbox.stub(MicroservicePortManager, 'findAll').returns($findMicroservicePortResponse);
  //       $sandbox.stub(MicroservicePortManager, 'delete').returns($deleteMicroservicePortResponse);
  //       $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse);
  //       $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse);
  //     });
  //
  //     it('calls Validator#validate() with correct args', async () => {
  //       await $subject;
  //       expect(Validator.validate).to.have.been.calledWith(portMappingData, Validator.schemas.portsCreate);
  //     });
  //
  //     context('when Validator#validate() fails', () => {
  //       def('validatorResponse', () => Promise.reject(error));
  //
  //       it(`fails with ${error}`, () => {
  //         return expect($subject).to.be.rejectedWith(error);
  //       })
  //     });
  //
  //     context('when Validator#validate() succeeds', () => {
  //       it('calls MicroserviceManager#findOne() with correct args', async () => {
  //         await $subject;
  //         expect(MicroserviceManager.findOne).to.have.been.calledWith(where, transaction);
  //       });
  //
  //       context('when MicroserviceManager#findOne() fails', () => {
  //         def('findMicroserviceResponse', () => Promise.reject(error));
  //
  //         it(`fails with ${error}`, () => {
  //           return expect($subject).to.be.rejectedWith(error);
  //         })
  //       });
  //
  //       context('when MicroserviceManager#findOne() succeeds', () => {
  //         it('calls MicroservicePortManager#findOne() with correct args', async () => {
  //           await $subject;
  //           expect(MicroservicePortManager.findOne).to.have.been.calledWith({
  //             microserviceUuid: microserviceUuid,
  //             [Op.or]:
  //               [
  //                 {
  //                   portInternal: portMappingData.internal
  //                 },
  //                 {
  //                   portExternal: portMappingData.external
  //                 }
  //               ]
  //           }, transaction);
  //         });
  //
  //         context('when MicroservicePortManager#findOne() fails', () => {
  //           def('findMicroservicePortResponse', () => Promise.reject(error));
  //
  //           it(`fails with ${error}`, () => {
  //             return expect($subject).to.be.rejectedWith(error);
  //           })
  //         });
  //
  //         context('when MicroservicePortManager#findOne() succeeds', () => {
  //           it('calls MicroservicePortManager#create() with correct args', async () => {
  //             await $subject;
  //             expect(MicroservicePortManager.create).to.have.been.calledWith(mappingData, transaction);
  //           });
  //
  //           context('when MicroservicePortManager#create() fails', () => {
  //             def('createMicroservicePortResponse', () => Promise.reject(error));
  //
  //             it(`fails with ${error}`, () => {
  //               return expect($subject).to.be.rejectedWith(error);
  //             })
  //           });
  //
  //           context('when MicroservicePortManager#create() succeeds', () => {
  //             it('calls MicroserviceManager#update() with correct args', async () => {
  //               await $subject;
  //               const updateRebuildMs = {
  //                 rebuild: true
  //               };
  //               expect(MicroserviceManager.update).to.have.been.calledWith({
  //                 uuid: microserviceData.uuid
  //               }, updateRebuildMs, transaction);
  //             });
  //
  //             context('when MicroserviceManager#update() fails', () => {
  //               def('updateMicroserviceResponse', () => Promise.reject(error));
  //
  //               it(`fails with ${error}`, () => {
  //                 return expect($subject).to.be.rejectedWith(error);
  //               })
  //             });
  //
  //             context('when MicroserviceManager#update() succeeds', () => {
  //               it('calls ChangeTrackingService#update() with correct args', async () => {
  //                 await $subject;
  //                 expect(ChangeTrackingService.update).to.have.been.calledWith(microserviceData.iofogUuid,
  //                   ChangeTrackingService.events.microserviceConfig, transaction);
  //               });
  //
  //               context('when ChangeTrackingService#update() fails', () => {
  //                 def('updateChangeTrackingResponse', () => Promise.reject(error));
  //
  //                 it(`fails with ${error}`, () => {
  //                   return expect($subject).to.be.rejectedWith(error);
  //                 })
  //               });
  //
  //               context('when ChangeTrackingService#update() succeeds', () => {
  //                 it('fulfills the promise', () => {
  //                   return expect($subject).eventually.equals(undefined);
  //                 })
  //               })
  //             })
  //           })
  //         })
  //       })
  //     })
  //   });
  //
  // });
  //

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
      'flowId': 16,
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

    def('subject', () => $subject.createPortMappingEndPoint(microserviceUuid, portMappingData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findMicroserviceResponse', () => Promise.resolve(microserviceData))
    def('findMicroservicePortResponse', () => Promise.resolve())
    def('createMicroservicePortResponse', () => Promise.resolve())
    def('updateMicroserviceResponse', () => Promise.resolve())
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(MicroserviceManager, 'findOne').returns($findMicroserviceResponse)
      $sandbox.stub(MicroservicePortManager, 'findOne').returns($findMicroservicePortResponse)
      $sandbox.stub(MicroservicePortManager, 'create').returns($createMicroservicePortResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns($updateMicroserviceResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
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
                uuid: microserviceData.uuid,
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

const { expect, assert } = require('chai')
const sinon = require('sinon')

const AgentService = require('../../../src/services/agent-service')
const Validator = require('../../../src/schemas')
const FogProvisionKeyManager = require('../../../src/data/managers/iofog-provision-key-manager')
const MicroserviceManager = require('../../../src/data/managers/microservice-manager')
const ioFogManager = require('../../../src/data/managers/iofog-manager')
const FogKeyService = require('../../../src/services/iofog-key-service')
const AppHelper = require('../../../src/helpers/app-helper')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const MicroserviceStatusManager = require('../../../src/data/managers/microservice-status-manager')
const MicroserviceExecStatusManager = require('../../../src/data/managers/microservice-exec-status-manager')
const ApplicationManager = require('../../../src/data/managers/application-manager')
const MicroserviceService = require('../../../src/services/microservices-service')
const RegistryManager = require('../../../src/data/managers/registry-manager')
const TunnelManager = require('../../../src/data/managers/tunnel-manager')
const ioFogVersionCommandManager = require('../../../src/data/managers/iofog-version-command-manager')
const ioFogProvisionKeyManager = require('../../../src/data/managers/iofog-provision-key-manager')
const HWInfoManager = require('../../../src/data/managers/hw-info-manager')
const USBInfoManager = require('../../../src/data/managers/usb-info-manager')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const path = require('path')
const { microserviceState } = require('../../../src/enums/microservice-state')
const FogStates = require('../../../src/enums/fog-state')
const constants = require('../../../src/helpers/constants')

global.appRoot = path.resolve(__dirname)

describe('Agent Service', () => {
  def('subject', () => AgentService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.agentProvision()', () => {
    const provisionData = {
      type: 1,
      key: 'dpodkqwdpj',
    }

    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')
    def('token', () => 'testToken')

    def('provisionResponse', () => 'provisionResponse')

    def('subject', () => $subject.agentProvision(provisionData, transaction))
    def('keyPairResponse', () => Promise.resolve({
      publicKey: 'testPublicKey',
      privateKey: 'testPrivateKey',
    }))
    def('storePublicKeyResponse', () => Promise.resolve())
    def('changeTrackingUpdateResponse', () => Promise.resolve())
    def('validatorResponse', () => Promise.resolve(true))
    def('fogProvisionKeyManagerResponse', () => Promise.resolve({
      iofogUuid: $uuid,
      expirationTime: new Date(Date.now() + 3600000),
    }))
    def('microserviceManagerResponse', () => Promise.resolve())
    def('iofogManagerResponse', () => Promise.resolve({
      uuid: $uuid,
    }))
    def('fogKeyServiceGenerateResponse', () => $keyPairResponse)
    def('fogKeyServiceStoreResponse', () => $storePublicKeyResponse)
    def('iofogManagerUpdateResponse', () => Promise.resolve())
    def('fogProvisionKeyManagerDeleteResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(FogProvisionKeyManager, 'findOne').returns($fogProvisionKeyManagerResponse)
      $sandbox.stub(MicroserviceManager, 'findAllWithDependencies').returns($microserviceManagerResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($iofogManagerResponse)
      $sandbox.stub(FogKeyService, 'generateKeyPair').returns($fogKeyServiceGenerateResponse)
      $sandbox.stub(FogKeyService, 'storePublicKey').returns($fogKeyServiceStoreResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($changeTrackingUpdateResponse)
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse)
      $sandbox.stub(FogProvisionKeyManager, 'delete').returns($fogProvisionKeyManagerDeleteResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(provisionData, Validator.schemas.agentProvision)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls FogProvisionKeyManager.findOne with correct args', async () => {
        await $subject
        expect(FogProvisionKeyManager.findOne).to.have.been.calledWith({
          provisionKey: provisionData.key,
        }, transaction)
      })

      context('when FogProvisionKeyManager#findOne fails', () => {
        const error = 'Error!'

        def('fogProvisionKeyManagerResponse', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ioFogManager#findOne succeeds', () => {
        it('calls ioFogManager.findOne with correct args', async () => {
          await $subject
          expect(ioFogManager.findOne).to.have.been.calledWith({
            uuid: $uuid,
          }, transaction)
        })

        context('when ioFogManager#findOne fails', () => {
          const error = 'Error!'

          def('iofogManagerResponse', () => Promise.reject(error))

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ioFogManager#findOne succeeds', () => {
          it('calls MicroserviceManager.findAllWithDependencies with correct args', async () => {
            await $subject
            expect(MicroserviceManager.findAllWithDependencies).to.have.been.calledWith({
              iofogUuid: $uuid,
            }, {}, transaction)
          })

          context('when MicroserviceManager#findAllWithDependencies fails', () => {
            const error = 'Error!'

            def('microserviceManagerResponse', () => Promise.reject(error))

            it(`fails with "${error}"`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when MicroserviceManager#findAllWithDependencies succeeds', () => {
            it('calls FogKeyService.generateKeyPair with correct args', async () => {
              await $subject
              expect(FogKeyService.generateKeyPair).to.have.been.calledWith(transaction)
            })

            context('when FogKeyService#generateKeyPair fails', () => {
              const error = 'Error!'

              def('fogKeyServiceGenerateResponse', () => Promise.reject(error))

              it(`fails with "${error}"`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when FogKeyService#generateKeyPair succeeds', () => {
              it('calls FogKeyService.storePublicKey with correct args', async () => {
                await $subject
                expect(FogKeyService.storePublicKey).to.have.been.calledWith($uuid, 'testPublicKey', transaction)
              })

              context('when FogKeyService#storePublicKey fails', () => {
                const error = 'Error!'

                def('fogKeyServiceStoreResponse', () => Promise.reject(error))

                it(`fails with "${error}"`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when FogKeyService#storePublicKey succeeds', () => {
                it('calls ioFogManager.update with correct args', async () => {
                  await $subject
                  expect(ioFogManager.update).to.have.been.calledWith({
                    uuid: $uuid,
                  }, {
                    archId: provisionData.type,
                  }, transaction)
                })

                context('when ioFogManager#update fails', () => {
                  const error = 'Error!'

                  def('iofogManagerUpdateResponse', () => Promise.reject(error))

                  it(`fails with "${error}"`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when ioFogManager#update succeeds', () => {
                  it('calls FogProvisionKeyManager.delete with correct args', async () => {
                    await $subject
                    expect(FogProvisionKeyManager.delete).to.have.been.calledWith({
                      provisionKey: provisionData.key,
                    }, transaction)
                  })

                  context('when FogProvisionKeyManager#delete fails', () => {
                    const error = 'Error!'

                    def('fogProvisionKeyManagerDeleteResponse', () => Promise.reject(error))

                    it(`fails with "${error}"`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when FogProvisionKeyManager#delete succeeds', () => {
                    it('succeeds', () => {
                      return expect($subject).to.eventually.have.property('uuid') &&
                        expect($subject).to.eventually.have.property('privateKey') &&
                        expect($subject).to.eventually.have.property('namespace')
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

  describe('.agentProvision() with engine', () => {
    const transaction = {}
    const provisionDataWithEngine = {
      type: 1,
      key: 'dpodkqwdpj',
      engine: 'edgelet',
    }

    def('uuid', () => 'testUuid')
    def('subject', () => AgentService.agentProvision(provisionDataWithEngine, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('fogProvisionKeyManagerResponse', () => Promise.resolve({
      iofogUuid: $uuid,
      expirationTime: new Date(Date.now() + 3600000),
    }))
    def('iofogManagerResponse', () => Promise.resolve({ uuid: $uuid }))
    def('microserviceManagerResponse', () => Promise.resolve())
    def('fogKeyServiceGenerateResponse', () => Promise.resolve({
      publicKey: 'testPublicKey',
      privateKey: 'testPrivateKey',
    }))
    def('fogKeyServiceStoreResponse', () => Promise.resolve())
    def('iofogManagerUpdateResponse', () => Promise.resolve())
    def('fogProvisionKeyManagerDeleteResponse', () => Promise.resolve())
    def('changeTrackingUpdateResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(FogProvisionKeyManager, 'findOne').returns($fogProvisionKeyManagerResponse)
      $sandbox.stub(MicroserviceManager, 'findAllWithDependencies').returns($microserviceManagerResponse)
      $sandbox.stub(ioFogManager, 'findOne').returns($iofogManagerResponse)
      $sandbox.stub(FogKeyService, 'generateKeyPair').returns($fogKeyServiceGenerateResponse)
      $sandbox.stub(FogKeyService, 'storePublicKey').returns($fogKeyServiceStoreResponse)
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse)
      $sandbox.stub(FogProvisionKeyManager, 'delete').returns($fogProvisionKeyManagerDeleteResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($changeTrackingUpdateResponse)
    })

    it('persists containerEngine from engine field', async () => {
      await $subject
      expect(ioFogManager.update).to.have.been.calledWith({
        uuid: $uuid,
      }, {
        archId: provisionDataWithEngine.type,
        containerEngine: 'edgelet',
      }, transaction)
    })
  })

  describe('.agentDeprovision()', () => {
    const deprovisionData = { microserviceUuids: ['uuid'] }
    const fogManagerUpdateData = { daemonStatus: FogStates.DEPROVISIONED, ipAddress: '0.0.0.0', ipAddressExternal: '0.0.0.0' }

    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('updateAgentResponse', () => 'updateAgentResponse')

    def('subject', () => $subject.agentDeprovision(deprovisionData, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('microserviceStatusUpdateResponse', () => Promise.resolve())
    def('microserviceExecStatusUpdateResponse', () => Promise.resolve())
    def('iofogManagerUpdateResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(MicroserviceStatusManager, 'update').returns($microserviceStatusUpdateResponse)
      $sandbox.stub(MicroserviceExecStatusManager, 'update').returns($microserviceExecStatusUpdateResponse)
      $sandbox.stub(FogKeyService, 'deletePublicKey').returns(Promise.resolve())
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(deprovisionData, Validator.schemas.agentDeprovision)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls MicroserviceStatusManager.update with correct args', async () => {
        await $subject
        expect(MicroserviceStatusManager.update).to.have.been.calledWith(
            { microserviceUuid: deprovisionData.microserviceUuids },
            { status: microserviceState.DELETING },
            transaction
        )
      })

      context('when MicroserviceStatusManager#update fails', () => {
        const error = 'Error!'

        def('microserviceStatusUpdateResponse', () => Promise.reject(error))

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      })

      context('when MicroserviceStatusManager#update succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid,
          }, fogManagerUpdateData, transaction)
        })

        context('when ioFogManager#update fails', () => {
          const error = 'Error!'

          def('iofogManagerUpdateResponse', () => Promise.reject(error))

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ioFogManager#update succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })


  describe('.updateAgentConfig()', () => {
    const agentConfig = {
      networkInterface: 'testNetworkInterface',
      containerEngineUrl: 'testContainerEngineUrl',
      diskLimit: 5,
      diskDirectory: 'testDiskDirectory',
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
      gpsMode: 'testGpsMode',
      pruningFrequency: 10,
      availableDiskThreshold: 20,
      logLevel: 'INFO',
      timeZone: 'America/Los_Angeles'
    }
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('updateAgentResponse', () => 'updateAgentResponse')

    def('subject', () => $subject.updateAgentConfig(agentConfig, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse', () => expectedFogUpdate)
    def('iofogManagerUpdateResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ioFogManager, 'update').returns($iofogManagerUpdateResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(agentConfig, Validator.schemas.updateAgentConfig)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    const expectedFogUpdate = {
      networkInterface: agentConfig.networkInterface,
      containerEngineUrl: agentConfig.containerEngineUrl,
      diskLimit: agentConfig.diskLimit,
      diskDirectory: agentConfig.diskDirectory,
      memoryLimit: agentConfig.memoryLimit,
      cpuLimit: agentConfig.cpuLimit,
      logLimit: agentConfig.logLimit,
      logDirectory: agentConfig.logDirectory,
      logFileCount: agentConfig.logFileCount,
      statusFrequency: agentConfig.statusFrequency,
      changeFrequency: agentConfig.changeFrequency,
      deviceScanFrequency: agentConfig.deviceScanFrequency,
      watchdogEnabled: agentConfig.watchdogEnabled,
      latitude: agentConfig.latitude,
      longitude: agentConfig.longitude,
      gpsMode: agentConfig.gpsMode,
      gpsDevice: agentConfig.gpsDevice,
      gpsScanFrequency: agentConfig.gpsScanFrequency,
      edgeGuardFrequency: agentConfig.edgeGuardFrequency,
      pruningFrequency: agentConfig.pruningFrequency,
      availableDiskThreshold: agentConfig.availableDiskThreshold,
      logLevel: agentConfig.logLevel,
      timeZone: agentConfig.timeZone
    }

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
        await $subject
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(expectedFogUpdate)
      })

      context('when AppHelper#deleteUndefinedFields fails', () => {
        const error = 'Error!'

        def('deleteUndefinedFieldsResponse', () => error)

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      })

      context('when AppHelper#deleteUndefinedFields succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid,
          }, expectedFogUpdate, transaction)
        })

        context('when ioFogManager#update fails', () => {
          const error = 'Error!'

          def('iofogManagerUpdateResponse', () => Promise.reject(error))

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when ioFogManager#update succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })
      })
    })
  })

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
      routerChanged: undefined,
      prune: undefined,
    }

    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.getAgentConfigChanges($fog, transaction))

    def('getByFogIdResponse', () => 'getByFogIdResponse')
    def('updateIfChangedResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ChangeTrackingService, 'getByIoFogUuid').returns($getByFogIdResponse)
      $sandbox.stub(ChangeTrackingService, 'updateIfChanged').returns($updateIfChangedResponse)
    })

    it('calls ChangeTrackingService#getByIoFogUuid() with correct args', async () => {
      await $subject
      expect(ChangeTrackingService.getByIoFogUuid).to.have.been.calledWith($uuid, transaction)
    })

    context('when ChangeTrackingService#getByIoFogUuid() fails', () => {
      def('getByFogIdResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })
  })

  describe('.updateAgentStatus()', () => {
    const microservicesStatus = '[{"id": "testUuid", "containerId":"testContainerId", "status":"RUNNING"' +
      ',"startTime":5325543453454,"operatingDuration":534535435435,"cpuUsage":35,"memoryUsage":45}]'

    const microserviceStatus = {
      'id': 'testUuid',
      'containerId': 'testContainerId',
      'status': 'RUNNING',
      'startTime': 5325543453454,
      'operatingDuration': 534535435435,
      'cpuUsage': 35,
      'memoryUsage': 45,
      'percentage': 50.5,
      'errorMessage': '',
    }

    const microserviceStatusArray = [microserviceStatus]

    const expectedMicroserviceUpdate = {
      containerId: microserviceStatus.containerId,
      status: microserviceStatus.status,
      startTime: microserviceStatus.startTime,
      operatingDuration: microserviceStatus.operatingDuration,
      cpuUsage: microserviceStatus.cpuUsage,
      memoryUsage: microserviceStatus.memoryUsage,
      percentage: microserviceStatus.percentage,
      errorMessage: microserviceStatus.errorMessage,
    }

    const fogStatus = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      warningMessage: '',
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      systemAvailableDisk: 1,
      systemAvailableMemory: 1,
      systemTotalCpu: 1.1,
      repositoryCount: 5,
      repositoryStatus: '[]',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      ipAddressExternal: 'testIpAddressExternal',
      microserviceMessageCounts: '[]',
      availableRuntimes: ['edgelet'],
      runtimeAgentPhase: 'Running',
      controlPlaneQuiesced: false,
      lastCommandTime: 15325235253,
      tunnelStatus: '{}',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false,
      activeVolumeMounts: [],
      volumeMountLastUpdate: 15325235253,
      gpsStatus: 'OK',
      microserviceStatus: microservicesStatus,
    }

    const expectedFogUpdate = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      systemAvailableDisk: 1,
      systemAvailableMemory: 1,
      systemTotalCpu: 1.1,
      securityStatus: 'OK',
      securityViolationInfo: 'No violation',
      repositoryCount: 5,
      repositoryStatus: '[]',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      ipAddressExternal: 'testIpAddressExternal',
      availableRuntimes: '["edgelet"]',
      lastCommandTime: 15325235253,
      tunnelStatus: '{}',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false,
      activeVolumeMounts: [],
      volumeMountLastUpdate: 15325235253,
      gpsStatus: 'OK',
    }

    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('microserviceResponse', () => ({
      iofogUuid: $uuid,
    }))

    def('subject', () => $subject.updateAgentStatus(fogStatus, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse2', () => microserviceStatus)
    def('findOneResponse', () => Promise.resolve({ warningMessage: '' }))
    def('updateResponse', () => Promise.resolve())
    def('jsonParseResponse', () => microserviceStatusArray)
    def('updateMicroserviceStatusesResponse', () => Promise.resolve())
    def('deleteNotRunningResponse', () => Promise.resolve())
    def('findMicroservice', () => Promise.resolve($microserviceResponse))

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.spy(AppHelper, 'deleteUndefinedFields')
      $sandbox.stub(ioFogManager, 'findOne').returns($findOneResponse)
      $sandbox.stub(ioFogManager, 'update').returns($updateResponse)
      $sandbox.stub(JSON, 'parse').returns($jsonParseResponse)
      $sandbox.stub(MicroserviceStatusManager, 'update').returns($updateMicroserviceStatusesResponse)
      $sandbox.stub(MicroserviceService, 'deleteNotRunningMicroservices').returns($deleteNotRunningResponse)
      $sandbox.stub(MicroserviceManager, 'findOne').returns($findMicroservice)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogStatus, Validator.schemas.updateAgentStatus)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('stringifies availableRuntimes for fog persistence', async () => {
        await $subject
        expect(ioFogManager.update).to.have.been.calledWith({
          uuid: $uuid,
        }, sinon.match.has('availableRuntimes', '["edgelet"]'), transaction)
      })

      context('when AppHelper#deleteUndefinedFields fails', () => {
        const error = 'Error!'

        def('deleteUndefinedFieldsResponse2', () => error)

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      })

      context('when AppHelper#deleteUndefinedFields succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid,
          }, expectedFogUpdate, transaction)
        })

        context('when ioFogManager#update fails', () => {
          const error = 'Error!'

          def('updateResponse', () => error)

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith = (error)
          })
        })

        context('when ioFogManager#update succeeds', () => {
          it('calls JSON.parse with correct args', async () => {
            await $subject
            expect(JSON.parse).to.have.been.calledWith(fogStatus.microserviceStatus)
          })

          context('when JSON#parse fails', () => {
            const error = 'Error!'

            def('jsonParseResponse', () => error)

            it(`fails with "${error}"`, () => {
              return expect($subject).to.be.rejectedWith = (error)
            })
          })

          context('when JSON#parse succeeds', () => {
            it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
              await $subject
              expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(expectedMicroserviceUpdate)
            })

            context('when AppHelper#deleteUndefinedFields fails', () => {
              const error = 'Error!'

              def('$deleteUndefinedFieldsResponse2', () => error)

              it(`fails with "${error}"`, () => {
                return expect($subject).to.be.rejectedWith = (error)
              })
            })

            context('when AppHelper#deleteUndefinedFields succeeds', () => {
              it('calls MicroserviceStatusManager.update with correct args', async () => {
                await $subject
                expect(MicroserviceStatusManager.update).to.have.been.calledWith({
                  microserviceUuid: microserviceStatus.id,
                }, expectedMicroserviceUpdate, transaction)
                assert.equal(microserviceStatus.percentage, 50.5)
                assert.equal(microserviceStatus.errorMessage, '')
              })

              context('when MicroserviceStatusManager#update fails', () => {
                const error = 'Error!'

                def('updateMicroserviceStatusesResponse', () => error)

                it(`fails with "${error}"`, () => {
                  return expect($subject).to.be.rejectedWith = (error)
                })
              })

              context('when MicroserviceStatusManager#update succeeds', () => {
                it('calls MicroserviceService.deleteNotRunningMicroservices with correct args', async () => {
                  await $subject
                  expect(MicroserviceService.deleteNotRunningMicroservices).to.have.been.calledWith($fog, transaction)
                })

                context('when MicroserviceService#deleteNotRunningMicroservices fails', () => {
                  const error = 'Error!'

                  def('deleteNotRunningResponse', () => error)

                  it(`fails with "${error}"`, () => {
                    return expect($subject).to.be.rejectedWith = (error)
                  })
                })

                context('when MicroserviceService#deleteNotRunningMicroservices succeeds', () => {
                  it(`succeeds`, () => {
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
  describe('.updateAgentStatus() with failure', () => {
    const microservicesStatus = '[{"id": "testUuid", "containerId":"testContainerId", "status":"RUNNING"' +
      ',"startTime":5325543453454,"operatingDuration":534535435435,"cpuUsage":35,"memoryUsage":45}]'

    const microserviceStatus = {
      'id': 'testUuid',
      'containerId': 'testContainerId',
      'status': 'EXITING',
      'startTime': 5325543453454,
      'operatingDuration': 534535435435,
      'cpuUsage': 35,
      'memoryUsage': 45,
      'percentage': 50.5,
      'errorMessage': 'Error mounting volume',
    }

    const microserviceStatusArray = [microserviceStatus]

    const expectedMicroserviceUpdate = {
      containerId: microserviceStatus.containerId,
      status: microserviceStatus.status,
      startTime: microserviceStatus.startTime,
      operatingDuration: microserviceStatus.operatingDuration,
      cpuUsage: microserviceStatus.cpuUsage,
      memoryUsage: microserviceStatus.memoryUsage,
      percentage: microserviceStatus.percentage,
      errorMessage: microserviceStatus.errorMessage,
    }

    const fogStatus = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      warningMessage: '',
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      systemAvailableDisk: 1,
      systemAvailableMemory: 1,
      systemTotalCpu: 1.1,
      repositoryCount: 5,
      repositoryStatus: '[]',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      ipAddressExternal: 'testIpAddressExternal',
      microserviceMessageCounts: '[]',
      availableRuntimes: ['edgelet'],
      runtimeAgentPhase: 'Running',
      controlPlaneQuiesced: false,
      lastCommandTime: 15325235253,
      tunnelStatus: '{}',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false,
      activeVolumeMounts: [],
      volumeMountLastUpdate: 15325235253,
      gpsStatus: 'OK',
      microserviceStatus: microservicesStatus,
    }

    const expectedFogUpdate = {
      daemonStatus: 'RUNNING',
      daemonOperatingDuration: 25,
      daemonLastStart: 15325235253,
      memoryUsage: 15,
      diskUsage: 16,
      cpuUsage: 17,
      memoryViolation: false,
      diskViolation: false,
      cpuViolation: false,
      systemAvailableDisk: 1,
      systemAvailableMemory: 1,
      systemTotalCpu: 1.1,
      securityStatus: 'OK',
      securityViolationInfo: 'No violation',
      repositoryCount: 5,
      repositoryStatus: '[]',
      systemTime: 15325235253,
      lastStatusTime: 15325235253,
      ipAddress: 'testIpAddress',
      ipAddressExternal: 'testIpAddressExternal',
      availableRuntimes: '["edgelet"]',
      lastCommandTime: 15325235253,
      tunnelStatus: '{}',
      version: '1.0.0',
      isReadyToUpgrade: false,
      isReadyToRollback: false,
      activeVolumeMounts: [],
      volumeMountLastUpdate: 15325235253,
      gpsStatus: 'OK',
    }
    def('microserviceResponse', () => ({
      iofogUuid: $uuid,
    }))

    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.updateAgentStatus(fogStatus, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse2', () => microserviceStatus)
    def('findOneResponse', () => Promise.resolve({ warningMessage: '' }))
    def('updateResponse', () => Promise.resolve())
    def('jsonParseResponse', () => microserviceStatusArray)
    def('updateMicroserviceStatusesResponse', () => Promise.resolve())
    def('deleteNotRunningResponse', () => Promise.resolve())
    def('findMicroservice', () => Promise.resolve($microserviceResponse))
    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.spy(AppHelper, 'deleteUndefinedFields')
      $sandbox.stub(ioFogManager, 'findOne').returns($findOneResponse)
      $sandbox.stub(ioFogManager, 'update').returns($updateResponse)
      $sandbox.stub(JSON, 'parse').returns($jsonParseResponse)
      $sandbox.stub(MicroserviceStatusManager, 'update').returns($updateMicroserviceStatusesResponse)
      $sandbox.stub(MicroserviceService, 'deleteNotRunningMicroservices').returns($deleteNotRunningResponse)
      $sandbox.stub(MicroserviceManager, 'findOne').returns($findMicroservice)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(fogStatus, Validator.schemas.updateAgentStatus)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('persists Edgelet availableRuntimes on fog update', async () => {
        await $subject
        expect(ioFogManager.update).to.have.been.calledWith({
          uuid: $uuid,
        }, expectedFogUpdate, transaction)
      })

      context('when AppHelper#deleteUndefinedFields fails', () => {
        const error = 'Error!'

        def('deleteUndefinedFieldsResponse2', () => error)

        it(`fails with "${error}"`, () => {
          return expect($subject).to.be.rejectedWith = (error)
        })
      })

      context('when AppHelper#deleteUndefinedFields succeeds', () => {
        it('calls ioFogManager.update with correct args', async () => {
          await $subject
          expect(ioFogManager.update).to.have.been.calledWith({
            uuid: $uuid,
          }, expectedFogUpdate, transaction)
        })

        context('when ioFogManager#update fails', () => {
          const error = 'Error!'

          def('updateResponse', () => error)

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith = (error)
          })
        })

        context('when ioFogManager#update succeeds', () => {
          it('calls JSON.parse with correct args', async () => {
            await $subject
            expect(JSON.parse).to.have.been.calledWith(fogStatus.microserviceStatus)
          })

          context('when JSON#parse fails', () => {
            const error = 'Error!'

            def('jsonParseResponse', () => error)

            it(`fails with "${error}"`, () => {
              return expect($subject).to.be.rejectedWith = (error)
            })
          })

          context('when JSON#parse succeeds', () => {
            it('calls AppHelper.deleteUndefinedFields with correct args', async () => {
              await $subject
              expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(expectedMicroserviceUpdate)
            })

            context('when AppHelper#deleteUndefinedFields fails', () => {
              const error = 'Error!'

              def('$deleteUndefinedFieldsResponse2', () => error)

              it(`fails with "${error}"`, () => {
                return expect($subject).to.be.rejectedWith = (error)
              })
            })

            context('when AppHelper#deleteUndefinedFields succeeds', () => {
              it('calls MicroserviceStatusManager.update with correct args', async () => {
                await $subject
                expect(MicroserviceStatusManager.update).to.have.been.calledWith({
                  microserviceUuid: microserviceStatus.id,
                }, expectedMicroserviceUpdate, transaction)
                assert.equal(microserviceStatus.percentage, 50.5)
                assert.equal(microserviceStatus.errorMessage, 'Error mounting volume')
              })

              context('when MicroserviceStatusManager#update fails', () => {
                const error = 'Error!'

                def('updateMicroserviceStatusesResponse', () => error)

                it(`fails with "${error}"`, () => {
                  return expect($subject).to.be.rejectedWith = (error)
                })
              })

              context('when MicroserviceStatusManager#update succeeds', () => {
                it('calls MicroserviceService.deleteNotRunningMicroservices with correct args', async () => {
                  await $subject
                  expect(MicroserviceService.deleteNotRunningMicroservices).to.have.been.calledWith($fog, transaction)
                })

                context('when MicroserviceService#deleteNotRunningMicroservices fails', () => {
                  const error = 'Error!'

                  def('deleteNotRunningResponse', () => error)

                  it(`fails with "${error}"`, () => {
                    return expect($subject).to.be.rejectedWith = (error)
                  })
                })

                context('when MicroserviceService#deleteNotRunningMicroservices succeeds', () => {
                  it(`succeeds`, () => {
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

  describe('.getAgentMicroservices()', () => {
    const transaction = {}
    const error = 'Error!'

    const extraHost = {
      name: 'testExtraHost',
      value: '1.2.3.4'
    }

    const microserviceWithValidImage = {
      uuid: 'testMicroserviceUuid',
      applicationId: 1,
      imageId: '',
      config: '{}',
      rebuild: false,
      rootHostAccess: false,
      logSize: constants.MICROSERVICE_DEFAULT_LOG_SIZE,
      ports: 'testPorts',
      volumeMappings: 'testVolumeMappings',
      delete: false,
      deleteWithCleanup: false,
      isController: true,
      catalogItem: {
        images: [{
          archId: 1,
          containerImage: 'testContainerImage',
        },
        ],
        registry: {
          id: 10,
        },
      },
      env: [
        {
          key: 'ENV_VAR1',
          value: 'value1',
        },
      ],
      extraHosts: [extraHost],
      cmd: [
        {
          id: 1,
          cmd: 'ls',
        },
        {
          id: 1,
          cmd: '-l',
        },
      ],
    }

    const microserviceWithInvalidImage = {
      uuid: 'testMicroserviceUuid',
      imageId: '',
      config: '{}',
      rebuild: false,
      rootHostAccess: false,
      logSize: constants.MICROSERVICE_DEFAULT_LOG_SIZE,
      ports: 'testPorts',
      volumeMappings: 'testVolumeMappings',
      delete: false,
      deleteWithCleanup: false,
      catalogItem: {
        images: [{
          archId: 3,
          containerImage: 'testContainerImage',
        },
        ],
        registry: {
          id: 10,
        },
      },
    }



    const microserviceResponse = {
      microservices: [{
        uuid: 'testMicroserviceUuid',
        imageId: 'testContainerImage',
        config: '{}',
        rebuild: false,
        rootHostAccess: false,
        logSize: constants.MICROSERVICE_DEFAULT_LOG_SIZE,
        portMappings: 'testPorts',
        volumeMappings: 'testVolumeMappings',
        delete: false,
        deleteWithCleanup: false,
        registryId: 10,
        env: [
          {
            key: 'ENV_VAR1',
            value: 'value1',
          },
        ],
        cmd: [
          'ls',
          '-l',
        ],
        extraHosts: [`${extraHost.name}:${extraHost.value}`]
      }],
    }

    def('uuid', () => 'testUuid')
    def('archId', () => 1)

    def('fog', () => ({
      uuid: $uuid,
      archId: $archId,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.getAgentMicroservices($fog, transaction))

    def('findAllMicroservicesResponse', () => Promise.resolve([microserviceWithValidImage, microserviceWithInvalidImage]))
    def('updateResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findAllActiveApplicationMicroservices').returns($findAllMicroservicesResponse)
      $sandbox.stub(MicroserviceManager, 'update').returns($updateResponse)
      $sandbox.stub(ApplicationManager, 'findOne').returns(Promise.resolve({ name: 'testApp' }))
      $sandbox.stub(MicroserviceService, 'isMicroserviceRouter').returns(Promise.resolve(false))
      $sandbox.stub(MicroserviceService, 'isMicroserviceNats').returns(Promise.resolve(false))
    })

    it('calls MicroserviceManager#findAllActiveApplicationMicroservices() with correct args', async () => {
      await $subject
      expect(MicroserviceManager.findAllActiveApplicationMicroservices).to.have.been.calledWith($uuid, transaction)
    })

    context('when MicroserviceManager#findAllActiveApplicationMicroservices() fails', () => {
      def('findAllMicroservicesResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroserviceManager#findAllActiveApplicationMicroservices() succeeds', () => {
      context('when MicroserviceManager#update succeeds', () => {
        it('calls MicroserviceManager.update with correct args', async () => {
          await $subject
          expect(MicroserviceManager.update).to.have.been.calledWith({
            uuid: microserviceWithValidImage.uuid,
          }, {
            rebuild: false,
          }, transaction)
        })

        context('when MicroserviceManager#update fails', () => {
          const error = 'Error!'

          def('updateResponse', () => error)

          it(`fails with "${error}"`, () => {
            return expect($subject).to.be.rejectedWith = (error)
          })
        })

        context('when MicroserviceManager#update succeeds', () => {
          it(`succeeds`, async () => {
            const result = await $subject
            expect(result.microservices).to.have.length(1)
            const msvc = result.microservices[0]
            expect(msvc.uuid).to.equal(microserviceResponse.microservices[0].uuid)
            expect(msvc.imageId).to.equal(microserviceResponse.microservices[0].imageId)
            expect(msvc.application).to.equal('testApp')
            expect(msvc.registryId).to.equal(microserviceResponse.microservices[0].registryId)
            expect(msvc.cmd).to.deep.equal(microserviceResponse.microservices[0].cmd)
            expect(msvc.extraHosts).to.deep.equal(microserviceResponse.microservices[0].extraHosts)
            expect(msvc.isController).to.equal(true)
            expect(msvc.isRouter).to.equal(false)
            expect(msvc.isNats).to.equal(false)
          })
        })
      })
    })
  })

  describe('.getAgentMicroservice()', () => {
    const transaction = {}
    const error = 'Error!'

    const microservice = {
      uuid: 'testMicroserviceUuid',
      imageId: 'testContainerImage',
      config: '{}',
      rebuild: false,
      rootHostAccess: false,
      logSize: constants.MICROSERVICE_DEFAULT_LOG_SIZE,
      portMappings: 'testPorts',
      volumeMappings: 'testVolumeMappings',
      delete: false,
      deleteWithCleanup: false,
      registryId: 10,
    }

    const microserviceResponse = {
      microservice: microservice,
    }

    def('uuid', () => 'testUuid')
    def('microserviceUuid', () => 'testMicroserviceUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.getAgentMicroservice($microserviceUuid, $fog, transaction))

    def('findMicroserviceResponse', () => Promise.resolve(microservice))

    beforeEach(() => {
      $sandbox.stub(MicroserviceManager, 'findOneWithDependencies').returns($findMicroserviceResponse)
    })

    it('calls MicroserviceManager#findOneWithDependencies() with correct args', async () => {
      await $subject
      expect(MicroserviceManager.findOneWithDependencies).to.have.been.calledWith({
        uuid: $microserviceUuid,
        iofogUuid: $uuid,
      }, {}, transaction)
    })

    context('when MicroserviceManager#findOneWithDependencies() fails', () => {
      def('findMicroserviceResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when MicroserviceManager#findOneWithDependencies() succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.deep.equal(microserviceResponse)
      })
    })
  })

  describe('.getAgentRegistries()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')
    def('userId', () => 15)

    def('fog', () => ({
      uuid: $uuid,
      userId: $userId,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.getAgentRegistries($fog, transaction))

    def('getAgentRegistriesResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findAll').returns($getAgentRegistriesResponse)
    })

    it('calls RegistryManager#findAll() with correct args', async () => {
      await $subject
      expect(RegistryManager.findAll).to.have.been.calledWith({}, transaction)
    })

    context('when RegistryManager#findAll() fails', () => {
      def('getAgentRegistriesResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when RegistryManager#findAll() succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('registries')
      })
    })
  })

  describe('.getAgentTunnel()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('token', () => 'testToken')

    def('subject', () => $subject.getAgentTunnel($fog, transaction))

    def('getTunnelResponse', () => Promise.resolve({}))

    beforeEach(() => {
      $sandbox.stub(TunnelManager, 'findOne').returns($getTunnelResponse)
    })

    it('calls TunnelManager#findOne() with correct args', async () => {
      await $subject
      expect(TunnelManager.findOne).to.have.been.calledWith({
        iofogUuid: $uuid,
      }, transaction)
    })

    context('when TunnelManager#findOne() fails', () => {
      def('getTunnelResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when TunnelManager#findOne() succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.have.property('tunnel')
      })
    })
  })

  describe('.getAgentChangeVersionCommand()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('versionCommandLine', () => 'testVersionCommand')
    def('versionCommand', () => ({
      versionCommand: $versionCommandLine,
    }))

    def('provisionKey', () => 'testKey')
    def('expirationTime', () => 12535352525)
    def('provision', () => ({
      provisionKey: $provisionKey,
      expirationTime: $expirationTime,
    }))

    def('response', () => ({
      versionCommand: $versionCommandLine,
      provisionKey: $provisionKey,
      expirationTime: $expirationTime,
    }))

    def('subject', () => $subject.getAgentChangeVersionCommand($fog, transaction))

    def('findCommandResponse', () => Promise.resolve($versionCommand))
    def('refreshProvisionResponse', () => Promise.resolve($provision))

    beforeEach(() => {
      $sandbox.stub(ioFogVersionCommandManager, 'findOne').returns($findCommandResponse)
      $sandbox.stub(ioFogProvisionKeyManager, 'updateOrCreate').returns($refreshProvisionResponse)
    })

    it('calls ioFogVersionCommandManager#findOne() with correct args', async () => {
      await $subject
      expect(ioFogVersionCommandManager.findOne).to.have.been.calledWith({
        iofogUuid: $uuid,
      }, transaction)
    })

    context('when ioFogVersionCommandManager#findOne() fails', () => {
      def('findCommandResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogVersionCommandManager#findOne() succeeds', () => {
      it('refreshes provision key via updateOrCreate', async () => {
        await $subject
        expect(ioFogProvisionKeyManager.updateOrCreate).to.have.been.calledOnce
        const [where, payload] = ioFogProvisionKeyManager.updateOrCreate.firstCall.args
        expect(where).to.eql({ iofogUuid: $uuid })
        expect(payload.iofogUuid).to.equal($uuid)
        expect(payload.provisionKey).to.be.a('string').and.not.be.empty
        expect(payload.expirationTime).to.be.a('number')
      })

      it('returns version command and refreshed provision key', () => {
        return expect($subject).to.eventually.eql($response)
      })

      context('when ioFogProvisionKeyManager#updateOrCreate() fails', () => {
        def('refreshProvisionResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })
    })

    context('when semver is set on version command', () => {
      def('semver', () => '3.2.0')
      def('versionCommand', () => ({
        versionCommand: $versionCommandLine,
        semver: $semver,
      }))
      def('response', () => ({
        versionCommand: $versionCommandLine,
        provisionKey: $provisionKey,
        expirationTime: $expirationTime,
        semver: $semver,
      }))

      it('includes semver in response', () => {
        return expect($subject).to.eventually.eql($response)
      })
    })

    context('when semver is null on version command', () => {
      def('versionCommand', () => ({
        versionCommand: $versionCommandLine,
        semver: null,
      }))

      it('omits semver from response', () => {
        return expect($subject).to.eventually.eql($response)
      })
    })
  })

  describe('.updateHalHardwareInfo()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('info', () => 'testInfo')
    def('hardwareData', () => ({
      info: $info,
    }))

    def('response', () => ({
      versionCommand: $versionCommandLine,
      provisionKey: $provisionKey,
      expirationTime: $expirationTime,
    }))

    def('subject', () => $subject.updateHalHardwareInfo($hardwareData, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('hwResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(HWInfoManager, 'updateOrCreate').returns($hwResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($hardwareData, Validator.schemas.updateHardwareInfo)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls HWInfoManager#updateOrCreate() with correct args', async () => {
        await $subject
        expect(HWInfoManager.updateOrCreate).to.have.been.calledWith({
          iofogUuid: $uuid,
        }, $hardwareData, transaction)

        context('when HWInfoManager#updateOrCreate() fails', () => {
          def('hwResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.equal(undefined)
          })
        })

        context('when HWInfoManager#updateOrCreate() succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.equal(undefined)
          })
        })
      })
    })
  })

  describe('.updateHalUsbInfo()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('info', () => 'testInfo')
    def('usbData', () => ({
      info: $info,
    }))

    def('response', () => ({
      versionCommand: $versionCommandLine,
      provisionKey: $provisionKey,
      expirationTime: $expirationTime,
    }))

    def('subject', () => $subject.updateHalUsbInfo($usbData, $fog, transaction))

    def('validatorResponse', () => Promise.resolve(true))
    def('usbResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(USBInfoManager, 'updateOrCreate').returns($usbResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith($usbData, Validator.schemas.updateUsbInfo)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls USBInfoManager#updateOrCreate() with correct args', async () => {
        await $subject
        expect(USBInfoManager.updateOrCreate).to.have.been.calledWith({
          iofogUuid: $uuid,
        }, $usbData, transaction)

        context('when USBInfoManager#updateOrCreate() fails', () => {
          def('usbResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.equal(undefined)
          })
        })

        context('when USBInfoManager#updateOrCreate() succeeds', () => {
          it(`succeeds`, () => {
            return expect($subject).to.equal(undefined)
          })
        })
      })
    })
  })

  describe('.deleteNode()', () => {
    const transaction = {}
    const error = 'Error!'

    def('uuid', () => 'testUuid')

    def('fog', () => ({
      uuid: $uuid,
    }))

    def('subject', () => $subject.deleteNode($fog, transaction))

    def('deleteResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ioFogManager, 'delete').returns($deleteResponse)
    })

    it('calls ioFogManager#delete() with correct args', async () => {
      await $subject
      expect(ioFogManager.delete).to.have.been.calledWith({
        uuid: $uuid,
      }, transaction)
    })

    context('when ioFogManager#delete() fails', () => {
      def('deleteResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ioFogManager#delete() succeeds', () => {
      it(`succeeds`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })

})

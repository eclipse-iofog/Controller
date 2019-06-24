const { expect } = require('chai')
const sinon = require('sinon')

const ConnectorManager = require('../../../src/sequelize/managers/connector-manager')
const MicroserviceService = require('../../../src/services/microservices-service')
const ConnectorService = require('../../../src/services/connector-service')
const Validator = require('../../../src/schemas')
const AppHelper = require('../../../src/helpers/app-helper')
const ConnectorPortManager = require('../../../src/sequelize/managers/connector-port-manager')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

describe('Connector Service', () => {
  def('subject', () => ConnectorService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.createConnector()', () => {
    const transaction = {}
    const error = 'Error!'

    const connectorData = {
      name: 'testName',
      domain: 'testDomain',
      publicIp: 'testPublicIp',
      cert: 'testCert',
      isSelfSignedCert: false,
      devMode: true,
    }

    def('subject', () => $subject.createConnector(connectorData, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('isValidDomainResponse', () => false)
    def('isValidPublicIpResponse', () => true)
    def('isValidPublicIpResponse2', () => true)
    def('findConnectorResponse', () => Promise.resolve())
    def('createConnectorResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'isValidDomain').returns($isValidDomainResponse)
      $sandbox.stub(AppHelper, 'isValidPublicIP')
          .onFirstCall().returns($isValidPublicIpResponse)
          .onSecondCall().returns($isValidPublicIpResponse2)
      $sandbox.stub(ConnectorManager, 'findOne').returns($findConnectorResponse)
      $sandbox.stub(ConnectorManager, 'create').returns($createConnectorResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(connectorData, Validator.schemas.connectorCreate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#isValidDomain() with correct args', async () => {
        await $subject
        expect(AppHelper.isValidDomain).to.have.been.calledWith(connectorData.domain)
      })

      context('when AppHelper#isValidDomain() fails', () => {
        def('isValidDomainResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })

      context('when AppHelper#isValidDomain() succeeds', () => {
        it('calls AppHelper#isValidPublicIP() with correct args', async () => {
          await $subject
          expect(AppHelper.isValidPublicIP).to.have.been.calledWith(connectorData.domain)
        })

        context('when AppHelper#isValidPublicIP() fails', () => {
          def('isValidPublicIpResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })

        context('when AppHelper#isValidPublicIP() succeeds', () => {
          it('calls AppHelper#isValidPublicIP() with correct args', async () => {
            await $subject
            expect(AppHelper.isValidPublicIP).to.have.been.calledWith(connectorData.publicIp)
          })

          context('when AppHelper#isValidPublicIP() fails', () => {
            def('isValidPublicIpResponse2', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when AppHelper#isValidPublicIP() succeeds', () => {
            it('calls ConnectorManager#findOne() with correct args', async () => {
              await $subject
              expect(ConnectorManager.findOne).to.have.been.calledWith({
                [Op.or]: [
                  {
                    name: connectorData.name,
                  },
                  {
                    publicIp: connectorData.publicIp,
                  },
                  {
                    domain: connectorData.domain,
                  },
                ],
              }, transaction)
            })

            context('when ConnectorManager#findOne() fails', () => {
              def('findConnectorResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ConnectorManager#findOne() succeeds', () => {
              it('calls ConnectorManager#create() with correct args', async () => {
                await $subject
                expect(ConnectorManager.create).to.have.been.calledWith(connectorData, transaction)
              })

              context('when ConnectorManager#create() fails', () => {
                def('createConnectorResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ConnectorManager#create() succeeds', () => {
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

  describe('.updateConnector()', () => {
    const transaction = {}
    const error = 'Error!'

    const connectorData = {
      name: 'testName',
      domain: 'testDomain',
      publicIp: 'testPublicIp',
      cert: 'testCert',
      isSelfSignedCert: false,
      devMode: true,
    }

    const connector = {}

    def('subject', () => $subject.updateConnector(connectorData, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('isValidDomainResponse', () => false)
    def('isValidPublicIpResponse', () => true)
    def('isValidPublicIpResponse2', () => true)
    def('updateConnectorResponse', () => Promise.resolve(connectorData))
    def('findOneConnectorResponse', () => Promise.resolve(connector))
    def('updateRouteOverConnectorResponse', () => Promise.resolve())
    def('updatePortMappingOverConnectorResponse', () => Promise.resolve())

    const queryConnectorData = {
      publicIp: connectorData.publicIp,
    }

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'isValidDomain').returns($isValidDomainResponse)
      $sandbox.stub(AppHelper, 'isValidPublicIP')
          .onFirstCall().returns($isValidPublicIpResponse)
          .onSecondCall().returns($isValidPublicIpResponse2)
      $sandbox.stub(ConnectorManager, 'update').returns($updateConnectorResponse)
      $sandbox.stub(ConnectorManager, 'findOne').returns($findOneConnectorResponse)
      $sandbox.stub(MicroserviceService, 'updateRouteOverConnector').returns($updateRouteOverConnectorResponse)
      $sandbox.stub(MicroserviceService, 'updatePortMappingOverConnector').returns($updatePortMappingOverConnectorResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(connectorData, Validator.schemas.connectorUpdate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls AppHelper#isValidDomain() with correct args', async () => {
        await $subject
        expect(AppHelper.isValidDomain).to.have.been.calledWith(connectorData.domain)
      })

      context('when AppHelper#isValidDomain() fails', () => {
        def('isValidDomainResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(connector)
        })
      })

      context('when AppHelper#isValidDomain() succeeds', () => {
        it('calls AppHelper#isValidPublicIP() with correct args', async () => {
          await $subject
          expect(AppHelper.isValidPublicIP).to.have.been.calledWith(connectorData.domain)
        })

        context('when AppHelper#isValidPublicIP() fails', () => {
          def('isValidPublicIpResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(connector)
          })
        })

        context('when AppHelper#isValidPublicIP() succeeds', () => {
          it('calls AppHelper#isValidPublicIP() with correct args', async () => {
            await $subject
            expect(AppHelper.isValidPublicIP).to.have.been.calledWith(connectorData.publicIp)
          })

          context('when AppHelper#isValidPublicIP() fails', () => {
            def('isValidPublicIpResponse2', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(connector)
            })
          })

          context('when AppHelper#isValidPublicIP() succeeds', () => {
            it('calls ConnectorManager#update() with correct args', async () => {
              await $subject
              expect(ConnectorManager.update).to.have.been.calledWith(queryConnectorData, connectorData, transaction)
            })

            context('when ConnectorManager#update() fails', () => {
              def('updateConnectorResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ConnectorManager#update() succeeds', () => {
              it('calls ConnectorManager#findOne() with correct args', async () => {
                await $subject
                expect(ConnectorManager.findOne).to.have.been.calledWith({
                  publicIp: connectorData.publicIp,
                }, transaction)
              })

              context('when ConnectorManager#findOne() fails', () => {
                def('findOneConnectorResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ConnectorManager#findOne() succeeds', () => {
                it('calls MicroserviceService#updateRouteOverConnector() with correct args', async () => {
                  await $subject
                  expect(MicroserviceService.updateRouteOverConnector).to.have.been.calledWith(connector, transaction)
                })

                context('when MicroserviceService#updateRouteOverConnector() fails', () => {
                  def('updateRouteOverConnectorResponse', () => Promise.reject(error))

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.be.rejectedWith(error)
                  })
                })

                context('when MicroserviceService#updateRouteOverConnector() succeeds', () => {
                  it('calls MicroserviceService#updatePortMappingOverConnector() with correct args', async () => {
                    await $subject
                    expect(MicroserviceService.updatePortMappingOverConnector).to.have.been.calledWith(connector, transaction)
                  })

                  context('when MicroserviceService#updatePortMappingOverConnector() fails', () => {
                    def('updatePortMappingOverConnectorResponse', () => Promise.reject(error))

                    it(`fails with ${error}`, () => {
                      return expect($subject).to.be.rejectedWith(error)
                    })
                  })

                  context('when MicroserviceService#updatePortMappingOverConnector() succeeds', () => {
                    it('fulfills the promise', () => {
                      return expect($subject).to.eventually.equal(connector)
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

  describe('.deleteConnector()', () => {
    const transaction = {}
    const error = 'Error!'

    const connectorData = {
      name: 'testName',
      domain: 'testDomain',
      publicIp: 'testPublicIp',
      cert: 'testCert',
      isSelfSignedCert: false,
      devMode: true,
    }

    const connector = {
      id: 15,
    }

    def('subject', () => $subject.deleteConnector(connectorData, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findConnectorResponse', () => Promise.resolve(connector))
    def('findConnectorPortsResponse', () => Promise.resolve())
    def('deleteConnectorResponse', () => Promise.resolve())

    const queryConnectorData = {
      publicIp: connectorData.publicIp,
    }

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ConnectorManager, 'findOne').returns($findConnectorResponse)
      $sandbox.stub(ConnectorPortManager, 'findAll').returns($findConnectorPortsResponse)
      $sandbox.stub(ConnectorManager, 'delete').returns($deleteConnectorResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(connectorData, Validator.schemas.connectorDelete)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ConnectorManager#findOne() with correct args', async () => {
        await $subject
        expect(ConnectorManager.findOne).to.have.been.calledWith(queryConnectorData, transaction)
      })

      context('when ConnectorManager#findOne() fails', () => {
        def('findConnectorResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.equal(undefined)
        })
      })

      context('when ConnectorManager#findOne() succeeds', () => {
        it('calls ConnectorPortManager#findAll() with correct args', async () => {
          await $subject
          expect(ConnectorPortManager.findAll).to.have.been.calledWith({
            connectorId: connector.id,
          }, transaction)
        })

        context('when ConnectorPortManager#findAll() fails', () => {
          def('findConnectorPortsResponse', () => {
          })

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })

        context('when ConnectorPortManager#findAll() succeeds', () => {
          it('calls ConnectorManager#delete() with correct args', async () => {
            await $subject
            expect(ConnectorManager.delete).to.have.been.calledWith(queryConnectorData, transaction)
          })

          context('when ConnectorManager#delete() fails', () => {
            def('deleteConnectorResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when ConnectorManager#delete() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })
        })
      })
    })
  })

  describe('.getConnectorList()', () => {
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.getConnectorList(transaction))
    def('findConnectorsResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ConnectorManager, 'findAll').returns($findConnectorsResponse)
    })

    it('calls ConnectorManager#findAll() with correct args', async () => {
      await $subject
      expect(ConnectorManager.findAll).to.have.been.calledWith({}, transaction)
    })

    context('when ConnectorManager#findAll() fails', () => {
      def('findConnectorsResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ConnectorManager#findAll() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })
  })
})

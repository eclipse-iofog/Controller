const {expect} = require('chai')
const sinon = require('sinon')

const FlowManager = require('../../../src/sequelize/managers/flow-manager')
const FlowService = require('../../../src/services/flow-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const ErrorMessages = require('../../../src/helpers/error-messages')

describe('Flow Service', () => {
  def('subject', () => FlowService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = false

  afterEach(() => $sandbox.restore())

  describe('.createFlow()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const flowId = null

    const flowData = {
      name: 'testName',
      description: 'testDescription',
      isActivated: false,
    }

    const flowToCreate = {
      name: flowData.name,
      description: flowData.description,
      isActivated: flowData.isActivated,
      userId: user.id,
    }

    const response = {
      id: 25,
    }

    def('subject', () => $subject.createFlow(flowData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findFlowResponse', () => Promise.resolve())
    def('deleteUndefinedFieldsResponse', () => flowToCreate)
    def('createFlowResponse', () => Promise.resolve(response))


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(FlowManager, 'findOne').returns($findFlowResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(FlowManager, 'create').returns($createFlowResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(flowData, Validator.schemas.flowCreate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls FlowManager#findOne() with correct args', async () => {
        await $subject
        const where = flowId
          ? {name: flowData.name, id: {[Op.ne]: flowId, userId: user.id}}
          : {name: flowData.name, userId: user.id}

        expect(FlowManager.findOne).to.have.been.calledWith(where, transaction)
      })

      context('when FlowManager#findOne() fails', () => {
        def('findFlowResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when FlowManager#findOne() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject

          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(flowToCreate)
        })

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('id')
          })
        })

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls FlowManager#create() with correct args', async () => {
            await $subject

            expect(FlowManager.create).to.have.been.calledWith(flowToCreate)
          })

          context('when FlowManager#create() fails', () => {
            def('createFlowResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.have.property('id')
            })
          })

          context('when FlowManager#create() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.have.property('id')
            })
          })
        })
      })
    })
  })

  describe('.deleteFlow()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const flowId = 75

    const whereObj = {
      id: flowId,
      userId: user.id,
    }

    const flowWithMicroservices = {
      microservices: [
        {
          iofogUuid: 15,
        },
      ],
    }

    def('subject', () => $subject.deleteFlow(flowId, user, isCLI, transaction))
    def('deleteUndefinedFieldsResponse', () => whereObj)
    def('findFlowMicroservicesResponse', () => Promise.resolve(flowWithMicroservices))
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('deleteFlowResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(FlowManager, 'findFlowMicroservices').returns($findFlowMicroservicesResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      $sandbox.stub(FlowManager, 'delete').returns($deleteFlowResponse)
    })

    it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
      await $subject
      expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(whereObj)
    })

    context('when AppHelper#deleteUndefinedFields() fails', () => {
      def('deleteUndefinedFieldsResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.eventually.equal(undefined)
      })
    })

    context('when AppHelper#deleteUndefinedFields() succeeds', () => {
      it('calls FlowManager#findFlowMicroservices() with correct args', async () => {
        await $subject

        expect(FlowManager.findFlowMicroservices).to.have.been.calledWith({
          id: flowId,
        }, transaction)
      })

      context('when FlowManager#findFlowMicroservices() fails', () => {
        def('findFlowMicroservicesResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when FlowManager#findFlowMicroservices() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject

          expect(ChangeTrackingService.update).to.have.been.calledWith(flowWithMicroservices.microservices[0].iofogUuid,
              ChangeTrackingService.events.microserviceFull, transaction)
        })

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })

        context('when ChangeTrackingService#update() succeeds', () => {
          it('calls FlowManager#delete() with correct args', async () => {
            await $subject

            expect(FlowManager.delete).to.have.been.calledWith(whereObj, transaction)
          })

          context('when FlowManager#delete() fails', () => {
            def('deleteFlowResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when FlowManager#delete() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })
        })
      })
    })
  })


  describe('.updateFlow()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const flowId = 75

    const oldFlowData = {
      name: 'testName',
      description: 'testDescription',
      isActivated: true,
    }

    const flowData = {
      name: 'testName',
      description: 'testDescription',
      isActivated: false,
    }

    const flowWithMicroservices = {
      microservices: [
        {
          iofogUuid: 15,
        },
      ],
    }

    def('subject', () => $subject.updateFlow(flowData, flowId, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findExcludedFlowResponse', () => Promise.resolve(oldFlowData))
    def('findFlowResponse', () => Promise.resolve())
    def('deleteUndefinedFieldsResponse', () => flowData)
    def('updateFlowResponse', () => Promise.resolve())
    def('findFlowMicroservicesResponse', () => Promise.resolve(flowWithMicroservices))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(FlowManager, 'findOneWithAttributes').returns($findExcludedFlowResponse)
      $sandbox.stub(FlowManager, 'findOne').returns($findFlowResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(FlowManager, 'update').returns($updateFlowResponse)
      $sandbox.stub(FlowManager, 'findFlowMicroservices').returns($findFlowMicroservicesResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(flowData, Validator.schemas.flowUpdate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls FlowManager#findOneWithAttributes() with correct args', async () => {
        await $subject

        const where = isCLI
          ? {id: flowId}
          : {id: flowId, userId: user.id}
        const attributes = {exclude: ['created_at', 'updated_at']}
        expect(FlowManager.findOneWithAttributes).to.have.been.calledWith(where, attributes, transaction)
      })

      context('when FlowManager#findOneWithAttributes() fails', () => {
        def('findExcludedFlowResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when FlowManager#findOneWithAttributes() succeeds', () => {
        it('calls FlowManager#findOne() with correct args', async () => {
          await $subject

          const where = flowId
            ? {name: flowData.name, userId: user.id, id: {[Op.ne]: flowId}}
            : {name: flowData.name, userId: user.id}
          expect(FlowManager.findOne).to.have.been.calledWith(where, transaction)
        })

        context('when FlowManager#findOne() fails', () => {
          def('findFlowResponse', () => Promise.reject(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME,
              flowData.name)))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME,
                flowData.name))
          })
        })

        context('when FlowManager#findOne() succeeds', () => {
          it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
            await $subject

            expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(flowData)
          })

          context('when AppHelper#deleteUndefinedFields() fails', () => {
            def('deleteUndefinedFieldsResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when AppHelper#deleteUndefinedFields() succeeds', () => {
            it('calls FlowManager#update() with correct args', async () => {
              await $subject

              const where = isCLI
                ? {id: flowId}
                : {id: flowId, userId: user.id}
              expect(FlowManager.update).to.have.been.calledWith(where, flowData, transaction)
            })

            context('when FlowManager#update() fails', () => {
              def('updateFlowResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when FlowManager#update() succeeds', () => {
              it('calls FlowManager#findFlowMicroservices() with correct args', async () => {
                await $subject

                expect(FlowManager.findFlowMicroservices).to.have.been.calledWith({
                  id: flowId,
                }, transaction)
              })

              context('when FlowManager#findFlowMicroservices() fails', () => {
                def('findFlowMicroservicesResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when FlowManager#findFlowMicroservices() succeeds', () => {
                it('calls ChangeTrackingService#update() with correct args', async () => {
                  await $subject

                  expect(ChangeTrackingService.update).to.have.been.calledWith(flowWithMicroservices.microservices[0].iofogUuid,
                      ChangeTrackingService.events.microserviceFull, transaction)
                })

                context('when ChangeTrackingService#update() fails', () => {
                  def('updateChangeTrackingResponse', () => error)

                  it(`fails with ${error}`, () => {
                    return expect($subject).to.eventually.equal(undefined)
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

  describe('.getUserFlows()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const flow = {
      userId: user.id,
    }

    def('subject', () => $subject.getUserFlows(user, isCLI, transaction))
    def('findExcludedFlowResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(FlowManager, 'findAllWithAttributes').returns($findExcludedFlowResponse)
    })

    it('calls FlowManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      const attributes = {exclude: ['created_at', 'updated_at']}
      expect(FlowManager.findAllWithAttributes).to.have.been.calledWith(flow, attributes, transaction)
    })

    context('when FlowManager#findAllWithAttributes() fails', () => {
      def('findExcludedFlowResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('flows')
      })
    })
  })


  describe('.getAllFlows()', () => {
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.getAllFlows(isCLI, transaction))
    def('findAllFlowsResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(FlowManager, 'findAllWithAttributes').returns($findAllFlowsResponse)
    })

    it('calls FlowManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      const attributes = {exclude: ['created_at', 'updated_at']}
      expect(FlowManager.findAllWithAttributes).to.have.been.calledWith({}, attributes, transaction)
    })

    context('when FlowManager#findAllWithAttributes() fails', () => {
      def('findAllFlowsResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('flows')
      })
    })
  })

  describe('.getFlow()', () => {
    const transaction = {}
    const error = 'Error!'

    const flowId = 75

    const user = {
      id: 15,
    }

    def('subject', () => $subject.getFlow(flowId, user, isCLI, transaction))
    def('findFlowResponse', () => Promise.resolve({}))

    beforeEach(() => {
      $sandbox.stub(FlowManager, 'findOneWithAttributes').returns($findFlowResponse)
    })

    it('calls FlowManager#findOneWithAttributes() with correct args', async () => {
      await $subject
      const where = isCLI
        ? {id: flowId}
        : {id: flowId, userId: user.id}
      const attributes = {exclude: ['created_at', 'updated_at']}
      expect(FlowManager.findOneWithAttributes).to.have.been.calledWith(where, attributes, transaction)
    })

    context('when FlowManager#findOneWithAttributes() fails', () => {
      def('findFlowResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FlowManager#findOneWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.deep.equal({})
      })
    })
  })
})

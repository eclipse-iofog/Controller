const { expect } = require('chai')
const sinon = require('sinon')

const ApplicationManager = require('../../../src/data/managers/application-manager')
const ApplicationService = require('../../../src/services/application-service')
const AppHelper = require('../../../src/helpers/app-helper')
const Validator = require('../../../src/schemas')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const MicroserviceService = require('../../../src/services/microservices-service')
const RoutingService = require('../../../src/services/routing-service')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const ErrorMessages = require('../../../src/helpers/error-messages')

describe('Application Service', () => {
  def('subject', () => ApplicationService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = false

  afterEach(() => $sandbox.restore())

  describe('.createApplicationEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const applicationId = null

    const applicationData = {
      name: 'test-name',
      description: 'testDescription',
      isActivated: false,
      isSystem: false
    }

    const applicationToCreate = {
      name: applicationData.name,
      description: applicationData.description,
      isActivated: applicationData.isActivated,
      isSystem: applicationData.isSystem,
      userId: user.id,
    }

    const response = {
      id: 25,
    }

    def('subject', () => $subject.createApplicationEndPoint(applicationData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findApplicationResponse', () => Promise.resolve())
    def('deleteUndefinedFieldsResponse', () => applicationToCreate)
    def('createApplicationResponse', () => Promise.resolve(response))


    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(ApplicationManager, 'findOne').returns($findApplicationResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ApplicationManager, 'create').returns($createApplicationResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(applicationData, Validator.schemas.applicationCreate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ApplicationManager#findOne() with correct args', async () => {
        await $subject
        const where = applicationId
          ? { name: applicationData.name, id: { [Op.ne]: applicationId, userId: user.id } }
          : { name: applicationData.name, userId: user.id }

        expect(ApplicationManager.findOne).to.have.been.calledWith(where, transaction)
      })

      context('when ApplicationManager#findOne() fails', () => {
        def('findApplicationResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ApplicationManager#findOne() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject

          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(applicationToCreate)
        })

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.have.property('id')
          })
        })

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls ApplicationManager#create() with correct args', async () => {
            await $subject

            expect(ApplicationManager.create).to.have.been.calledWith(applicationToCreate)
          })

          context('when ApplicationManager#create() fails', () => {
            def('createApplicationResponse', () => error)

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.have.property('id')
            })
          })

          context('when ApplicationManager#create() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.have.property('id')
            })
          })
        })
      })
    })

    context('when there are microservices to deploy', () => {
      const microservices = [{
        name: 'test-msvc',
      },{
        name: 'test-msvc-2',
      }]
      const data = {
        ...applicationData,
        microservices
      }

      def('subject', () => ApplicationService.createApplicationEndPoint(data, user, isCLI, transaction))
      beforeEach(() => {
        $sandbox.stub(MicroserviceService, 'createMicroserviceEndPoint')
      })

      it('Should create the microservices', async () => {
        await $subject
        for (const msvcData of microservices) {
          expect(MicroserviceService.createMicroserviceEndPoint).to.have.been.calledWith(msvcData, user, isCLI, transaction)
        }
      })
    })

    context('when there are routes to deploy', () => {
      const routes = [{
        name: 'test-msvc',
      },{
        name: 'test-msvc-2',
      }]
      const data = {
        ...applicationData,
        routes
      }
      def('subject', () => ApplicationService.createApplicationEndPoint(data, user, isCLI, transaction))
      beforeEach(() => {
        $sandbox.stub(RoutingService, 'createRouting')
      })
  
      it('Should create the routes', async () => {
        await $subject
        for (const routeData of routes) {
          expect(RoutingService.createRouting).to.have.been.calledWith(routeData, user, isCLI, transaction)
        }
      })
    })
  })

  describe('.deleteApplicationEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const name = 'my-app'

    const whereObj = {
      name,
      userId: user.id,
    }

    const applicationWithMicroservices = {
      microservices: [
        {
          iofogUuid: 15,
        },
      ],
    }

    def('subject', () => $subject.deleteApplicationEndPoint(name, user, isCLI, transaction))
    def('deleteUndefinedFieldsResponse', () => whereObj)
    def('findApplicationMicroservicesResponse', () => Promise.resolve(applicationWithMicroservices.microservices))
    def('updateChangeTrackingResponse', () => Promise.resolve())
    def('deleteApplicationResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ApplicationManager, 'findApplicationMicroservices').returns($findApplicationMicroservicesResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
      $sandbox.stub(MicroserviceService, 'deleteMicroserviceWithRoutesAndPortMappings')
      $sandbox.stub(ApplicationManager, 'delete').returns($deleteApplicationResponse)
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
      it('calls ApplicationManager#findApplicationMicroservices() with correct args', async () => {
        await $subject

        expect(ApplicationManager.findApplicationMicroservices).to.have.been.calledWith({
          name,
        }, transaction)
      })

      context('when ApplicationManager#findApplicationMicroservices() fails', () => {
        def('findApplicationMicroservicesResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ApplicationManager#findApplicationMicroservices() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject

          expect(ChangeTrackingService.update).to.have.been.calledWith(applicationWithMicroservices.microservices[0].iofogUuid,
              ChangeTrackingService.events.microserviceFull, transaction)
        })

        it('should delete microservices with routes and ports', async () => {
          await $subject

          for (const msvc of applicationWithMicroservices.microservices)
          expect(MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings).to.have.been.calledWith(msvc, transaction)
        })

        context('when ChangeTrackingService#update() fails', () => {
          def('updateChangeTrackingResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })

        context('when ChangeTrackingService#update() succeeds', () => {
          it('calls ApplicationManager#delete() with correct args', async () => {
            await $subject

            expect(ApplicationManager.delete).to.have.been.calledWith(whereObj, transaction)
          })

          context('when ApplicationManager#delete() fails', () => {
            def('deleteApplicationResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ApplicationManager#delete() succeeds', () => {
            it('fulfills the promise', () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })
        })
      })
    })
  })


  describe('.updateApplicationEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const name = 'my-app'

    const oldApplicationData = {
      id: 42,
      name,
      description: 'testDescription',
      isActivated: true,
      isSystem: false
    }

    const applicationData = {
      name: 'new-app-name',
      description: 'testDescription',
      isActivated: false,
      isSystem: true
    }

    const applicationWithMicroservices = {
      microservices: [
        {
          iofogUuid: 15,
        },
      ],
    }

    def('subject', () => $subject.updateApplicationEndPoint(applicationData, name, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findExcludedApplicationResponse', () => Promise.resolve(oldApplicationData))
    def('findApplicationResponse', () => Promise.resolve())
    def('deleteUndefinedFieldsResponse', () => applicationData)
    def('updateApplicationResponse', () => Promise.resolve({...applicationData, id: oldApplicationData.id}))
    def('findApplicationMicroservicesResponse', () => Promise.resolve(applicationWithMicroservices.microservices))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      const stub = $sandbox.stub(ApplicationManager, 'findOne')
      stub.withArgs({name, userId: user.id}, transaction).returns($findExcludedApplicationResponse)
      stub.returns($findApplicationResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(ApplicationManager, 'update').returns($updateApplicationResponse)
      $sandbox.stub(ApplicationManager, 'findApplicationMicroservices').returns($findApplicationMicroservicesResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(applicationData, Validator.schemas.applicationUpdate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls ApplicationManager#findOneWithAttributes() with correct args', async () => {
        await $subject
        expect(ApplicationManager.findOne).to.have.been.calledWith({ name, userId: user.id }, transaction)
      })

      context('when ApplicationManager#findOneWithAttributes() fails', () => {
        def('findExcludedApplicationResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when ApplicationManager#findOneWithAttributes() succeeds', () => {
        it('calls ApplicationManager#findOne() with correct args', async () => {
          await $subject

          const where = oldApplicationData.id
            ? { name: applicationData.name, userId: user.id, id: { [Op.ne]: oldApplicationData.id } }
            : { name: applicationData.name, userId: user.id }
          expect(ApplicationManager.findOne).to.have.been.calledWith(where, transaction)
        })

        context('when ApplicationManager#findOne() fails', () => {
          def('findApplicationResponse', () => Promise.reject(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME,
              applicationData.name)))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(AppHelper.formatMessage(ErrorMessages.DUPLICATE_NAME,
                applicationData.name))
          })
        })

        context('when ApplicationManager#findOne() succeeds', () => {
          it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
            await $subject

            expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(applicationData)
          })

          context('when AppHelper#deleteUndefinedFields() fails', () => {
            def('deleteUndefinedFieldsResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.eventually.equal(undefined)
            })
          })

          context('when AppHelper#deleteUndefinedFields() succeeds', () => {
            it('calls ApplicationManager#update() with correct args', async () => {
              await $subject

              const where = isCLI
                ? { id: oldApplicationData.id }
                : { id: oldApplicationData.id, userId: user.id }
              expect(ApplicationManager.update).to.have.been.calledWith(where, applicationData, transaction)
            })

            context('when ApplicationManager#update() fails', () => {
              def('updateApplicationResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ApplicationManager#update() succeeds', () => {
              it('calls ApplicationManager#findApplicationMicroservices() with correct args', async () => {
                await $subject

                expect(ApplicationManager.findApplicationMicroservices).to.have.been.calledWith({
                  name,
                }, transaction)
              })

              context('when ApplicationManager#findApplicationMicroservices() fails', () => {
                def('findApplicationMicroservicesResponse', () => Promise.reject(error))

                it(`fails with ${error}`, () => {
                  return expect($subject).to.be.rejectedWith(error)
                })
              })

              context('when ApplicationManager#findApplicationMicroservices() succeeds', () => {
                it('calls ChangeTrackingService#update() with correct args', async () => {
                  await $subject

                  expect(ChangeTrackingService.update).to.have.been.calledWith(applicationWithMicroservices.microservices[0].iofogUuid,
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

    context('when there are routes to update', () => {
      const newRoute = { name: 'new-route' }
      const oldRoute = { name: 'old-route' }
      const routes = [{
        name: 'test-msvc',
      },{
        name: 'test-msvc-2',
      }]
      const data = {
        ...applicationData,
        routes: [...routes, newRoute]
      }
      def('subject', () => ApplicationService.updateApplicationEndPoint(data, name, user, isCLI, transaction))
      beforeEach(() => {
        $sandbox.stub(RoutingService, 'createRouting')
        $sandbox.stub(RoutingService, 'updateRouting')
        $sandbox.stub(RoutingService, 'deleteRouting')
        $sandbox.stub(ApplicationManager, 'findApplicationRoutes').returns(Promise.resolve([...routes, oldRoute]))
      })
      it('Should update the routes', async () => {
        await $subject
        for (const routeData of routes) {
          expect(RoutingService.updateRouting).to.have.been.calledWith(routeData.name, routeData, user, isCLI, transaction)
        }
        expect(RoutingService.createRouting).to.have.been.calledWith(newRoute, user, isCLI, transaction)
        expect(RoutingService.deleteRouting).to.have.been.calledWith(oldRoute.name, user, isCLI, transaction)
      })
    })

    context('when there are microservices to update', () => {
      const newMsvc = { name: 'new-msvc' }
      const oldMsvc = { name: 'old-msvc', uuid: 'old-msvc-uuid' }
      const msvcs = [{
        name: 'test-msvc',
        uuid: 'msvc-1'
      },{
        name: 'test-msvc-2',
        uuid: 'msvc-2'
      }]
      const data = {
        ...applicationData,
        microservices: [...msvcs, newMsvc]
      }
      def('subject', () => ApplicationService.updateApplicationEndPoint(data, name, user, isCLI, transaction))
      def('findApplicationMicroservicesResponse', () => Promise.resolve([...msvcs, oldMsvc]))
      beforeEach(() => {
        $sandbox.stub(MicroserviceService, 'createMicroserviceEndPoint')
        $sandbox.stub(MicroserviceService, 'updateMicroserviceEndPoint')
        $sandbox.stub(MicroserviceService, 'deleteMicroserviceWithRoutesAndPortMappings')
      })
      it('Should update the microservices', async () => {
        await $subject
        for (const msvcData of msvcs) {
          expect(MicroserviceService.updateMicroserviceEndPoint).to.have.been.calledWith(msvcData.uuid, msvcData, user, isCLI, transaction)
        }
        expect(MicroserviceService.createMicroserviceEndPoint).to.have.been.calledWith(newMsvc, user, isCLI, transaction)
        expect(MicroserviceService.deleteMicroserviceWithRoutesAndPortMappings).to.have.been.calledWith(oldMsvc, transaction)
      })
    })
  })

  describe('.getUserApplicationsEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const application = {
      userId: user.id,
      isSystem: false
    }

    def('subject', () => $subject.getUserApplicationsEndPoint(user, isCLI, transaction))
    def('findExcludedApplicationResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findAllPopulated').returns($findExcludedApplicationResponse)
    })

    it('calls ApplicationManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      const attributes = { exclude: ['created_at', 'updated_at'] }
      expect(ApplicationManager.findAllPopulated).to.have.been.calledWith(application, attributes, transaction)
    })

    context('when ApplicationManager#findAllWithAttributes() fails', () => {
      def('findExcludedApplicationResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('applications')
      })
    })
  })


  describe('.getAllApplicationsEndPoint()', () => {
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.getAllApplicationsEndPoint(isCLI, transaction))
    def('findAllApplicationsResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findAllPopulated').returns($findAllApplicationsResponse)
    })

    it('calls ApplicationManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      const attributes = { exclude: ['created_at', 'updated_at'] }
      expect(ApplicationManager.findAllPopulated).to.have.been.calledWith({}, attributes, transaction)
    })

    context('when ApplicationManager#findAllWithAttributes() fails', () => {
      def('findAllApplicationsResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('applications')
      })
    })
  })

  describe('.getApplication()', () => {
    const transaction = {}
    const error = 'Error!'

    const name = 'my-app'

    const user = {
      id: 15,
    }

    def('subject', () => $subject.getApplication(name, user, isCLI, transaction))
    def('findApplicationResponse', () => Promise.resolve({}))

    beforeEach(() => {
      $sandbox.stub(ApplicationManager, 'findOnePopulated').returns($findApplicationResponse)
    })

    it('calls ApplicationManager#findOneWithAttributes() with correct args', async () => {
      await $subject
      const where = isCLI
        ? { name }
        : { name, userId: user.id }
      const attributes = { exclude: ['created_at', 'updated_at'] }
      expect(ApplicationManager.findOnePopulated).to.have.been.calledWith(where, attributes, transaction)
    })

    context('when ApplicationManager#findOneWithAttributes() fails', () => {
      def('findApplicationResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when ApplicationManager#findOneWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.deep.equal({})
      })
    })
  })
})

const { expect } = require('chai')
const sinon = require('sinon')

const RegistryManager = require('../../../src/sequelize/managers/registry-manager')
const RegistryService = require('../../../src/services/registry-service')
const Validator = require('../../../src/schemas')
const AppHelper = require('../../../src/helpers/app-helper')
const ioFogManager = require('../../../src/sequelize/managers/iofog-manager')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const Sequelize = require('sequelize')
const Op = Sequelize.Op

describe('Registry Service', () => {
  def('subject', () => RegistryService)
  def('sandbox', () => sinon.createSandbox())

  const isCLI = false

  afterEach(() => $sandbox.restore())

  describe('.createRegistry()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const registry = {
      url: 'testUrl',
      username: 'testUsername',
      password: 'testPassword',
      isPublic: false,
      userEmail: 'testEmail',
      requiresCert: false,
      certificate: 'testCertificate',
      userId: user.id,
    }

    const registryCreate = {
      url: registry.url,
      username: registry.username,
      password: registry.password,
      isPublic: registry.isPublic,
      userEmail: registry.email,
      requiresCert: registry.requiresCert,
      certificate: registry.certificate,
      userId: user.id,
    }

    const ioFogs = [{
      uuid: 'testUuid',
    }]

    def('subject', () => $subject.createRegistry(registry, user, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('deleteUndefinedFieldsResponse', () => registryCreate)
    def('createRegistryResponse', () => Promise.resolve({
      id: 16,
    }))
    def('findIoFogsResponse', () => Promise.resolve(ioFogs))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(RegistryManager, 'create').returns($createRegistryResponse)
      $sandbox.stub(ioFogManager, 'findAll').returns($findIoFogsResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(registry, Validator.schemas.registryCreate)
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
        expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(registryCreate)
      })

      context('when AppHelper#deleteUndefinedFields() fails', () => {
        def('deleteUndefinedFieldsResponse', () => error)

        it(`fails with ${error}`, () => {
          return expect($subject).to.eventually.have.property('id')
        })
      })

      context('when AppHelper#deleteUndefinedFields() succeeds', () => {
        it('calls RegistryManager#create() with correct args', async () => {
          await $subject
          expect(RegistryManager.create).to.have.been.calledWith(registryCreate, transaction)
        })

        context('when RegistryManager#create() fails', () => {
          def('createRegistryResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when RegistryManager#create() succeeds', () => {
          it('calls ioFogManager#findAll() with correct args', async () => {
            await $subject
            expect(ioFogManager.findAll).to.have.been.calledWith({
              userId: user.id,
            }, transaction)
          })

          context('when ioFogManager#findAll() fails', () => {
            def('findIoFogsResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ioFogManager#findAll() succeeds', () => {
            it('calls ChangeTrackingService#update() with correct args', async () => {
              await $subject
              expect(ChangeTrackingService.update).to.have.been.calledWith(ioFogs[0].uuid,
                  ChangeTrackingService.events.registries, transaction)
            })

            context('when ChangeTrackingService#update() fails', () => {
              def('findIoFogsResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ChangeTrackingService#update() succeeds', () => {
              it('fulfills the promise', () => {
                return expect($subject).to.eventually.have.property('id')
              })
            })
          })
        })
      })
    })
  })

  describe('.findRegistries()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const queryRegistry = isCLI
      ? {}
      : {
        [Op.or]:
          [
            {
              userId: user.id,
            },
            {
              isPublic: true,
            },
          ],
      }
    const attributes = { exclude: ['password'] }
    def('subject', () => $subject.findRegistries(user, isCLI, transaction))
    def('findRegistriesResponse', () => Promise.resolve([]))

    beforeEach(() => {
      $sandbox.stub(RegistryManager, 'findAllWithAttributes').returns($findRegistriesResponse)
    })

    it('calls RegistryManager#findAllWithAttributes() with correct args', async () => {
      await $subject
      expect(RegistryManager.findAllWithAttributes).to.have.been.calledWith(queryRegistry, attributes, transaction)
    })

    context('when RegistryManager#findAllWithAttributes() fails', () => {
      def('findRegistriesResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when RegistryManager#findAllWithAttributes() succeeds', () => {
      it('fulfills the promise', () => {
        return expect($subject).to.eventually.have.property('registries')
      })
    })
  })

  describe('.deleteRegistry()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const registryData = {
      id: 5,
    }

    const queryData = isCLI
      ? { id: registryData.id }
      : { id: registryData.id, userId: user.id }

    const ioFogs = [{
      uuid: 'testUuid',
    }]

    def('subject', () => $subject.deleteRegistry(registryData, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findRegistryResponse', () => Promise.resolve({
      userId: user.id,
    }))
    def('deleteRegistryResponse', () => Promise.resolve())
    def('findIoFogsResponse', () => Promise.resolve(ioFogs))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(RegistryManager, 'findOne').returns($findRegistryResponse)
      $sandbox.stub(RegistryManager, 'delete').returns($deleteRegistryResponse)
      $sandbox.stub(ioFogManager, 'findAll').returns($findIoFogsResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(registryData, Validator.schemas.registryDelete)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls RegistryManager#findOne() with correct args', async () => {
        await $subject
        expect(RegistryManager.findOne).to.have.been.calledWith(queryData, transaction)
      })

      context('when RegistryManager#findOne() fails', () => {
        def('findRegistryResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when RegistryManager#findOne() succeeds', () => {
        it('calls RegistryManager#delete() with correct args', async () => {
          await $subject
          expect(RegistryManager.delete).to.have.been.calledWith(queryData, transaction)
        })

        context('when RegistryManager#delete() fails', () => {
          def('deleteRegistryResponse', () => Promise.reject(error))

          it(`fails with ${error}`, () => {
            return expect($subject).to.be.rejectedWith(error)
          })
        })

        context('when RegistryManager#delete() succeeds', () => {
          it('calls ioFogManager#findAll() with correct args', async () => {
            await $subject
            expect(ioFogManager.findAll).to.have.been.calledWith({
              userId: user.id,
            }, transaction)
          })

          context('when ioFogManager#findAll() fails', () => {
            def('findIoFogsResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when ioFogManager#findAll() succeeds', () => {
            it('calls ChangeTrackingService#update() with correct args', async () => {
              await $subject
              expect(ChangeTrackingService.update).to.have.been.calledWith(ioFogs[0].uuid,
                  ChangeTrackingService.events.registries, transaction)
            })

            context('when ChangeTrackingService#update() fails', () => {
              def('findIoFogsResponse', () => Promise.reject(error))

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

  describe('.updateRegistry()', () => {
    const transaction = {}
    const error = 'Error!'

    const user = {
      id: 15,
    }

    const registryId = 5

    const registry = {
      url: 'testUrl',
      username: 'testUsername',
      password: 'testPassword',
      isPublic: false,
      userEmail: 'testEmail',
      requiresCert: false,
      certificate: 'testCertificate',
      userId: user.id,
    }

    const registryUpdate = {
      url: registry.url,
      username: registry.username,
      password: registry.password,
      isPublic: registry.isPublic,
      userEmail: registry.email,
      requiresCert: registry.requiresCert,
      certificate: registry.certificate,
    }

    const ioFogs = [{
      uuid: 'testUuid',
    }]

    const where = isCLI ?
      {
        id: registryId,
      }
      :
      {
        id: registryId,
        userId: user.id,
      }

    def('subject', () => $subject.updateRegistry(registry, registryId, user, isCLI, transaction))
    def('validatorResponse', () => Promise.resolve(true))
    def('findRegistryResponse', () => Promise.resolve({}))
    def('deleteUndefinedFieldsResponse', () => registryUpdate)
    def('updateRegistryResponse', () => Promise.resolve())
    def('findIoFogsResponse', () => Promise.resolve(ioFogs))
    def('updateChangeTrackingResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(RegistryManager, 'findOne').returns($findRegistryResponse)
      $sandbox.stub(AppHelper, 'deleteUndefinedFields').returns($deleteUndefinedFieldsResponse)
      $sandbox.stub(RegistryManager, 'update').returns($updateRegistryResponse)
      $sandbox.stub(ioFogManager, 'findAll').returns($findIoFogsResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($updateChangeTrackingResponse)
    })

    it('calls Validator#validate() with correct args', async () => {
      await $subject
      expect(Validator.validate).to.have.been.calledWith(registry, Validator.schemas.registryUpdate)
    })

    context('when Validator#validate() fails', () => {
      def('validatorResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when Validator#validate() succeeds', () => {
      it('calls RegistryManager#findOne() with correct args', async () => {
        await $subject
        expect(RegistryManager.findOne).to.have.been.calledWith({
          id: registryId,
        }, transaction)
      })

      context('when RegistryManager#findOne() fails', () => {
        def('findRegistryResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when RegistryManager#findOne() succeeds', () => {
        it('calls AppHelper#deleteUndefinedFields() with correct args', async () => {
          await $subject
          expect(AppHelper.deleteUndefinedFields).to.have.been.calledWith(registryUpdate)
        })

        context('when AppHelper#deleteUndefinedFields() fails', () => {
          def('deleteUndefinedFieldsResponse', () => error)

          it(`fails with ${error}`, () => {
            return expect($subject).to.eventually.equal(undefined)
          })
        })

        context('when AppHelper#deleteUndefinedFields() succeeds', () => {
          it('calls RegistryManager#update() with correct args', async () => {
            await $subject
            expect(RegistryManager.update).to.have.been.calledWith(where, registryUpdate, transaction)
          })

          context('when RegistryManager#update() fails', () => {
            def('updateRegistryResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when RegistryManager#update() succeeds', () => {
            it('calls ioFogManager#findAll() with correct args', async () => {
              await $subject
              expect(ioFogManager.findAll).to.have.been.calledWith({
                userId: user.id,
              }, transaction)
            })

            context('when ioFogManager#findAll() fails', () => {
              def('findIoFogsResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when ioFogManager#findAll() succeeds', () => {
              it('calls ChangeTrackingService#update() with correct args', async () => {
                await $subject
                expect(ChangeTrackingService.update).to.have.been.calledWith(ioFogs[0].uuid,
                    ChangeTrackingService.events.registries, transaction)
              })

              context('when ChangeTrackingService#update() fails', () => {
                def('findIoFogsResponse', () => Promise.reject(error))

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

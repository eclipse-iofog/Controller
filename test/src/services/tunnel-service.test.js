const { expect } = require('chai')
const sinon = require('sinon')

const AppHelper = require('../../../src/helpers/app-helper')
const ChangeTrackingService = require('../../../src/services/change-tracking-service')
const Config = require('../../../src/config')
const FogManager = require('../../../src/sequelize/managers/iofog-manager')
const TunnelManager = require('../../../src/sequelize/managers/tunnel-manager')
const TunnelService = require('../../../src/services/tunnel-service')
const Validator = require('../../../src/schemas')

describe('Tunnel Service', () => {
  def('subject', () => TunnelService)
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('.openTunnel()', () => {
    const uuid = 'abcd'
    const port = 12345
    const config = 'tunnel-config'
    const tunnelHost = 'tunnel-host'
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.openTunnel($tunnelData, $user, $cli, transaction))
    def('tunnelData', () => ({
      iofogUuid: uuid,
      host: tunnelHost,
    }))
    def('user', () => 'user')
    def('cli', () => false)
    def('fog', () => ({ uuid }))
    def('fogResponse', () => Promise.resolve($fog))
    def('portResponse', () => Promise.resolve(port))
    def('validatorResponse', () => Promise.resolve(true))
    def('tunnelManagerResponse', () => Promise.resolve())
    def('changeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(FogManager, 'findOne').returns($fogResponse)
      $sandbox.stub(AppHelper, 'findAvailablePort').returns($portResponse)
      $sandbox.stub(Config, 'get').returns(config)
      $sandbox.stub(Validator, 'validate').returns($validatorResponse)
      $sandbox.stub(TunnelManager, 'updateOrCreate').returns($tunnelManagerResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($changeResponse)
    })

    it('calls FogManager#findOne() with correct args', async () => {
      await $subject
      expect(FogManager.findOne).to.have.been.calledWith({ uuid }, transaction)
    })

    context('when FogManager#findOne() fails', () => {
      def('fogResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when FogManager#findOne() succeeds', () => {
      context('when FogManager#findOne() does not return a Fog instance', () => {
        def('fog', () => null)

        it('fails with error', () => {
          return expect($subject).to.be.rejectedWith("Invalid ioFog UUID 'abcd'")
        })
      })

      context('when FogManager#findOne() returns a Fog instance', () => {
        const testOpenTunnel = function (cli) {
          const tunnel = cli ? {
            host: tunnelHost,
            iofogUuid: uuid,
            rport: port,
          } : {
              closed: false,
              host: config,
              iofogUuid: uuid,
              lport: config,
              password: config,
              rport: port,
              rsakey: config,
              username: config,
            }

          it('calls Validator#validate() with correct args', async () => {
            await $subject
            expect(Validator.validate).to.have.been.calledWith(tunnel, Validator.schemas.tunnelCreate)
          })

          context('when Validator#validate() fails', () => {
            def('validatorResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when Validator#validate() succeeds', () => {
            it('calls TunnelManager#updateOrCreate() with correct args', async () => {
              await $subject
              expect(TunnelManager.updateOrCreate).to.have.been.calledWith($tunnelData, tunnel, transaction)
            })

            context('when TunnelManager#updateOrCreate() fails', () => {
              def('tunnelManagerResponse', () => Promise.reject(error))

              it(`fails with ${error}`, () => {
                return expect($subject).to.be.rejectedWith(error)
              })
            })

            context('when TunnelManager#updateOrCreate() succeeds', () => {
              it('calls ChangeTrackingService#update() with correct args', async () => {
                await $subject
                expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.tunnel, transaction)
              })

              context('when ChangeTrackingService#update() fails', () => {
                def('changeResponse', () => Promise.reject(error))

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
        }

        context('when running from command line', () => {
          def('cli', () => true)

          it('calls AppHelper#findAvailablePort() with correct args', async () => {
            await $subject
            expect(AppHelper.findAvailablePort).to.have.been.calledWith(tunnelHost)
          })

          context('when AppHelper#findAvailablePort() fails', () => {
            def('portResponse', () => Promise.reject(error))

            it(`fails with ${error}`, () => {
              return expect($subject).to.be.rejectedWith(error)
            })
          })

          context('when AppHelper#findAvailablePort() succeeds', () => {
            testOpenTunnel(true)
          })
        })

        context('when running from api', () => {
          testOpenTunnel(false)
        })
      })
    })
  })

  describe('.findTunnel()', () => {
    const uuid = 'abcd'
    const tunnelHost = 'tunnel-host'
    const tunnel = {
      username: 'user',
      host: tunnelHost,
      rport: 12345,
      lport: 54321,
      closed: false,
    }
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.findTunnel($tunnelData, $user, transaction))
    def('tunnelData', () => ({
      iofogUuid: uuid,
      host: tunnelHost,
    }))
    def('user', () => 'user')
    def('tunnelManagerResponse', () => Promise.resolve(tunnel))

    beforeEach(() => {
      $sandbox.stub(TunnelManager, 'findOne').returns($tunnelManagerResponse)
    })

    it('calls TunnelManager#findOne() with correct args', async () => {
      await $subject
      expect(TunnelManager.findOne).to.have.been.calledWith($tunnelData, transaction)
    })

    context('when TunnelManager#findOne() fails', () => {
      def('tunnelManagerResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when tunnelManagerResponse#findOne() succeeds', () => {
      context('when tunnelManagerResponse#findOne() does not return tunnel info', () => {
        def('tunnelManagerResponse', () => null)

        it('fails with error', () => {
          return expect($subject).to.be.rejectedWith('Invalid Tunnel Id')
        })
      })

      context('when tunnelManagerResponse#findOne() returns tunnel info', () => {
        it('resolves with tunnel info', () => {
          return expect($subject).to.eventually.eql({
            username: tunnel.username,
            host: tunnel.host,
            remotePort: tunnel.rport,
            localPort: tunnel.lport,
            status: 'open',
          })
        })
      })
    })
  })

  describe('.findAll()', () => {
    const tunnel = [{}]
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.findAll(transaction))
    def('tunnelManagerResponse', () => Promise.resolve(tunnel))

    beforeEach(() => {
      $sandbox.stub(TunnelManager, 'findAll').returns($tunnelManagerResponse)
    })

    it('calls TunnelManager#findAll() with correct args', async () => {
      await $subject
      expect(TunnelManager.findAll).to.have.been.calledWith({}, transaction)
    })

    context('when TunnelManager#findAll() fails', () => {
      def('tunnelManagerResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when tunnelManagerResponse#findAll() succeeds', () => {
      it('resolves with tunnel info', () => {
        return expect($subject).to.eventually.eql({ tunnels: tunnel })
      })
    })
  })

  describe('.closeTunnel()', () => {
    const tunnel = {}
    const uuid = 'abcd'
    const tunnelHost = 'tunnel-host'
    const transaction = {}
    const error = 'Error!'

    def('subject', () => $subject.closeTunnel($tunnelData, $user, transaction))
    def('tunnelData', () => ({
      iofogUuid: uuid,
      host: tunnelHost,
    }))
    def('user', () => 'user')
    def('findTunnelResponse', () => Promise.resolve(tunnel))
    def('tunnelManagerResponse', () => Promise.resolve())
    def('changeResponse', () => Promise.resolve())

    beforeEach(() => {
      $sandbox.stub(TunnelService, 'findTunnel').returns($findTunnelResponse)
      $sandbox.stub(TunnelManager, 'update').returns($tunnelManagerResponse)
      $sandbox.stub(ChangeTrackingService, 'update').returns($changeResponse)
    })

    it('calls TunnelService#findTunnel() with correct args', async () => {
      await $subject
      expect(TunnelService.findTunnel).to.have.been.calledWith($tunnelData, $user, transaction)
    })

    context('when TunnelService#findTunnel() fails', () => {
      def('findTunnelResponse', () => Promise.reject(error))

      it(`fails with ${error}`, () => {
        return expect($subject).to.be.rejectedWith(error)
      })
    })

    context('when TunnelService#findTunnel() succeeds', () => {
      it('calls TunnelManager#update() with correct args', async () => {
        await $subject
        expect(TunnelManager.update).to.have.been.calledWith($tunnelData, { closed: true }, transaction)
      })

      context('when TunnelManager#updateOrCreate() fails', () => {
        def('tunnelManagerResponse', () => Promise.reject(error))

        it(`fails with ${error}`, () => {
          return expect($subject).to.be.rejectedWith(error)
        })
      })

      context('when TunnelManager#updateOrCreate() succeeds', () => {
        it('calls ChangeTrackingService#update() with correct args', async () => {
          await $subject
          expect(ChangeTrackingService.update).to.have.been.calledWith(uuid, ChangeTrackingService.events.tunnel, transaction)
        })

        context('when ChangeTrackingService#update() fails', () => {
          def('changeResponse', () => Promise.reject(error))

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
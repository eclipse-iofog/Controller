const { expect } = require('chai')
const sinon = require('sinon')

const MicroservicePortService = require('../../../src/services/microservice-ports/microservice-port')
const ioFogManager = require('../../../src/data/managers/iofog-manager')
const Constants = require('../../../src/helpers/constants')
const Errors = require('../../../src/helpers/errors')

describe('Microservice Port Service', () => {
  def('sandbox', () => sinon.createSandbox())

  afterEach(() => $sandbox.restore())

  describe('reserved ports', () => {
    it('includes port 53 in RESERVED_PORTS', () => {
      expect(Constants.RESERVED_PORTS).to.include(53)
    })
  })

  describe('.validatePortMappings()', () => {
    const transaction = {}
    const iofogUuid = 'fog-uuid'
    const agent = {
      uuid: iofogUuid,
      getMicroservice: sinon.stub().resolves([])
    }

    def('microserviceData', () => ({
      iofogUuid,
      ports: [{ internal: 53, external: 53 }]
    }))
    def('subject', () => MicroservicePortService.validatePortMappings($microserviceData, transaction))

    beforeEach(() => {
      $sandbox.stub(ioFogManager, 'findOne').resolves(agent)
    })

    it('rejects external port 53 as reserved', () => {
      return expect($subject).to.be.rejectedWith(
        Errors.ValidationError,
        /Port '53' is reserved for internal use/
      )
    })
  })

  describe('.validatePortMappings() duplicate check', () => {
    const transaction = { id: 'tx-1' }
    const iofogUuid = 'fog-uuid'
    const occupiedPort = 8080
    let agent
    let microserviceOnAgent

    def('microserviceData', () => ({
      iofogUuid,
      ports: [{ internal: 80, external: occupiedPort }]
    }))
    def('subject', () => MicroservicePortService.validatePortMappings($microserviceData, transaction))

    beforeEach(() => {
      microserviceOnAgent = {
        uuid: 'other-ms-uuid',
        getPorts: sinon.stub().resolves([{ portExternal: occupiedPort }])
      }
      agent = {
        uuid: iofogUuid,
        getMicroservice: sinon.stub().resolves([microserviceOnAgent])
      }
      $sandbox.stub(ioFogManager, 'findOne').resolves(agent)
    })

    it('passes the caller transaction to association reads', async () => {
      try {
        await $subject
      } catch (error) {
        // expected when port is taken
      }
      expect(agent.getMicroservice).to.have.been.calledWith({ transaction })
      expect(microserviceOnAgent.getPorts).to.have.been.calledWith({ transaction })
    })

    it('rejects when external port is already allocated on the agent', () => {
      return expect($subject).to.be.rejectedWith(
        Errors.ValidationError,
        /Port '8080' is not available/
      )
    })
  })
})

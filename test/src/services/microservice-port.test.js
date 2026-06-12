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
      getMicroservice: () => Promise.resolve([])
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
})

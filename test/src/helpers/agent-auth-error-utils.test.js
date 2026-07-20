const { expect } = require('chai')

const CODES = require('../../../src/helpers/agent-auth-error-codes')
const {
  classifyCheckFogTokenFailure,
  classifyVerifyJwtFailure
} = require('../../../src/helpers/agent-auth-error-utils')
const {
  AgentAuthenticationError,
  ServiceUnavailableError
} = require('../../../src/helpers/errors')

describe('agent-auth-error-utils', () => {
  describe('classifyVerifyJwtFailure()', () => {
    it('maps public key missing to AGENT_PUBLIC_KEY_NOT_FOUND', () => {
      const result = classifyVerifyJwtFailure(new Error('Public key not found for fog node'))
      expect(result).to.be.instanceOf(AgentAuthenticationError)
      expect(result.code).to.equal(CODES.AGENT_PUBLIC_KEY_NOT_FOUND)
      expect(result.retryable).to.equal(false)
    })

    it('maps JTI reuse to AGENT_JWT_ALREADY_USED', () => {
      const result = classifyVerifyJwtFailure(new Error('JWT already used'))
      expect(result.code).to.equal(CODES.AGENT_JWT_ALREADY_USED)
    })

    it('maps sqlite busy to CONTROLLER_DB_BUSY', () => {
      const result = classifyVerifyJwtFailure(new Error('SQLITE_BUSY: database is locked'))
      expect(result).to.be.instanceOf(ServiceUnavailableError)
      expect(result.code).to.equal(CODES.CONTROLLER_DB_BUSY)
      expect(result.retryable).to.equal(true)
    })
  })

  describe('classifyCheckFogTokenFailure()', () => {
    it('passes through AgentAuthenticationError', () => {
      const original = new AgentAuthenticationError(CODES.AGENT_FOG_NOT_FOUND, 'missing')
      expect(classifyCheckFogTokenFailure(original)).to.equal(original)
    })

    it('maps sequelize errors to CONTROLLER_DB_UNAVAILABLE', () => {
      const error = new Error('connect ECONNREFUSED')
      error.name = 'SequelizeConnectionError'
      const result = classifyCheckFogTokenFailure(error)
      expect(result).to.be.instanceOf(ServiceUnavailableError)
      expect(result.code).to.equal(CODES.CONTROLLER_DB_UNAVAILABLE)
    })
  })
})

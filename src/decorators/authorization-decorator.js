const logger = require('../logger')
const FogManager = require('../data/managers/iofog-manager')
const FogKeyService = require('../services/iofog-key-service')
const Errors = require('../helpers/errors')
const CODES = require('../helpers/agent-auth-error-codes')
const { classifyCheckFogTokenFailure } = require('../helpers/agent-auth-error-utils')
const { isTest } = require('../helpers/app-helper')
const { runInTransaction } = require('../helpers/transaction-runner')

function checkFogToken (f) {
  return async function (...fArgs) {
    if (isTest()) {
      return f.apply(this, fArgs)
    }

    const req = fArgs[0]
    const authHeader = req.headers.authorization

    if (!authHeader) {
      logger.error('No authorization token provided')
      throw new Errors.AgentAuthenticationError(CODES.AGENT_AUTH_HEADER_INVALID, 'Authorization header required')
    }

    const [scheme, token] = authHeader.split(' ')
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      logger.error('Invalid authorization scheme')
      throw new Errors.AgentAuthenticationError(CODES.AGENT_AUTH_HEADER_INVALID, 'Bearer authorization required')
    }

    try {
      logger.debug({ token }, 'Received JWT')

      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        logger.error('Invalid JWT format')
        throw new Errors.AgentAuthenticationError(CODES.AGENT_JWT_MALFORMED, 'Agent JWT is malformed')
      }

      let payload
      try {
        payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      } catch (parseError) {
        logger.error('Invalid JWT payload encoding')
        throw new Errors.AgentAuthenticationError(CODES.AGENT_JWT_MALFORMED, 'Agent JWT payload is malformed')
      }

      const fogUuid = payload.sub
      logger.debug({ payload }, 'JWT payload')
      logger.info({ iofogUUID: payload.sub })

      if (!fogUuid) {
        logger.error('JWT missing subject claim')
        throw new Errors.AgentAuthenticationError(CODES.AGENT_JWT_MISSING_SUBJECT, 'Agent JWT missing subject claim')
      }

      const fog = await runInTransaction(async (transaction) => {
        const foundFog = await FogManager.findOne({ uuid: fogUuid }, transaction)
        if (!foundFog) {
          return null
        }

        await FogKeyService.verifyJWT(token, fogUuid, transaction)

        const timestamp = Date.now()
        await FogManager.updateLastActive(foundFog.uuid, timestamp, transaction)

        return foundFog
      }, { label: 'checkFogToken' })

      if (!fog) {
        logger.error(`Fog with UUID ${fogUuid} not found`)
        throw new Errors.AgentAuthenticationError(CODES.AGENT_FOG_NOT_FOUND, 'Agent fog not found')
      }

      fArgs.push(fog)

      return f.apply(this, fArgs)
    } catch (error) {
      const classified = classifyCheckFogTokenFailure(error)
      logger.error(`Agent authentication failed: ${classified.message}`, { code: classified.code })
      throw classified
    }
  }
}

module.exports = {
  checkFogToken
}

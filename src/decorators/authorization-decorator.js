/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */
const logger = require('../logger')
const FogManager = require('../data/managers/iofog-manager')
const FogKeyService = require('../services/iofog-key-service')
const Errors = require('../helpers/errors')
const { isTest } = require('../helpers/app-helper')

function checkFogToken (f) {
  return async function (...fArgs) {
    if (isTest()) {
      return f.apply(this, fArgs)
    }

    const req = fArgs[0]
    const authHeader = req.headers.authorization

    if (!authHeader) {
      logger.error('No authorization token provided')
      throw new Errors.AuthenticationError('authorization failed')
    }

    // Extract token from Bearer scheme
    const [scheme, token] = authHeader.split(' ')
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      logger.error('Invalid authorization scheme')
      throw new Errors.AuthenticationError('authorization failed')
    }

    try {
      // Debug log for JWT
      logger.debug({ token }, 'Received JWT')

      // First, decode the JWT without verification to get the fog UUID
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        logger.error('Invalid JWT format')
        throw new Errors.AuthenticationError('authorization failed')
      }

      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
      const fogUuid = payload.sub
      logger.debug({ payload }, 'JWT payload')
      logger.info({ iofogUUID: payload.sub })

      if (!fogUuid) {
        logger.error('JWT missing subject claim')
        throw new Errors.AuthenticationError('authorization failed')
      }

      // Get the fog with transaction
      const fog = await FogManager.findOne({
        uuid: fogUuid
      }, { fakeTransaction: true })

      if (!fog) {
        logger.error(`Fog with UUID ${fogUuid} not found`)
        throw new Errors.AuthenticationError('authorization failed')
      }

      // Verify the JWT with transaction
      await FogKeyService.verifyJWT(token, fogUuid, { fakeTransaction: true })

      // Update last active timestamp with transaction
      const timestamp = Date.now()
      await FogManager.updateLastActive(fog.uuid, timestamp, { fakeTransaction: true })

      fArgs.push(fog)

      return f.apply(this, fArgs)
    } catch (error) {
      logger.error(`JWT verification failed: ${error.message}`)
      throw new Errors.AuthenticationError('authorization failed')
    }
  }
}

module.exports = {
  checkFogToken: checkFogToken
}

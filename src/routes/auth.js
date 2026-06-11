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

const constants = require('../helpers/constants')
const AuthController = require('../controllers/auth-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

function protectEmbeddedAdminRoute (handler, successCode) {
  return async (req, res) => {
    logger.apiReq(req)

    await rbacMiddleware.protect()(req, res, async () => {
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_FORBIDDEN,
          errors: [Errors.ForbiddenError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const endpoint = ResponseDecorator.handleErrors(handler, successCode, errorCodes)
      const responseObject = await endpoint(req)
      const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
        ? req.kauth.grant.access_token.content.preferred_username
        : 'system'

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes({ req, user, res, responseObject })
    })
  }
}

module.exports = [
  {
    method: 'post',
    path: '/api/v3/auth/migration/export',
    middleware: protectEmbeddedAdminRoute(AuthController.migrationExportEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'post',
    path: '/api/v3/auth/jwks/rotate',
    middleware: protectEmbeddedAdminRoute(AuthController.jwksRotateEndPoint, constants.HTTP_CODE_SUCCESS)
  }
]

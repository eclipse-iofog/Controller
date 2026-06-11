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
const UsersController = require('../controllers/users-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

function embeddedErrorCodes (successCode) {
  const errorCodes = [
    {
      code: constants.HTTP_CODE_BAD_REQUEST,
      errors: [Errors.ValidationError, Errors.InvalidArgumentError]
    },
    {
      code: constants.HTTP_CODE_UNAUTHORIZED,
      errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
    },
    {
      code: constants.HTTP_CODE_FORBIDDEN,
      errors: [Errors.ForbiddenError]
    },
    {
      code: constants.HTTP_CODE_NOT_FOUND,
      errors: [Errors.NotFoundError]
    },
    {
      code: constants.HTTP_CODE_DUPLICATE_PROPERTY,
      errors: [Errors.ConflictError]
    },
    {
      code: constants.HTTP_CODE_NOT_IMPLEMENTED,
      errors: [Errors.NotImplementedError]
    }
  ]

  if (successCode === constants.HTTP_CODE_NO_CONTENT) {
    return errorCodes
  }

  return errorCodes
}

function protectEmbeddedRoute (handler, successCode) {
  return async (req, res) => {
    logger.apiReq(req)

    await rbacMiddleware.protect()(req, res, async () => {
      const endpoint = ResponseDecorator.handleErrors(handler, successCode, embeddedErrorCodes(successCode))
      const responseObject = await endpoint(req)
      const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
        ? req.kauth.grant.access_token.content.preferred_username
        : 'system'

      if (responseObject.code === constants.HTTP_CODE_NO_CONTENT) {
        res.status(responseObject.code).send()
      } else {
        res.status(responseObject.code).send(responseObject.body)
      }

      logger.apiRes({ req, user, res, responseObject })
    })
  }
}

module.exports = [
  {
    method: 'get',
    path: '/api/v3/users',
    middleware: protectEmbeddedRoute(UsersController.listUsersEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'post',
    path: '/api/v3/users',
    middleware: protectEmbeddedRoute(UsersController.createUserEndPoint, constants.HTTP_CODE_CREATED)
  },
  {
    method: 'get',
    path: '/api/v3/users/:id',
    middleware: protectEmbeddedRoute(UsersController.getUserEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'patch',
    path: '/api/v3/users/:id',
    middleware: protectEmbeddedRoute(UsersController.updateUserEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'delete',
    path: '/api/v3/users/:id',
    middleware: protectEmbeddedRoute(UsersController.deleteUserEndPoint, constants.HTTP_CODE_NO_CONTENT)
  },
  {
    method: 'post',
    path: '/api/v3/users/:id/reset-password',
    middleware: protectEmbeddedRoute(UsersController.resetPasswordEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'post',
    path: '/api/v3/users/:id/reset-token',
    middleware: protectEmbeddedRoute(UsersController.resetTokenEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'get',
    path: '/api/v3/groups',
    middleware: protectEmbeddedRoute(UsersController.listGroupsEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'post',
    path: '/api/v3/groups',
    middleware: protectEmbeddedRoute(UsersController.createGroupEndPoint, constants.HTTP_CODE_CREATED)
  },
  {
    method: 'get',
    path: '/api/v3/groups/:name',
    middleware: protectEmbeddedRoute(UsersController.getGroupEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'patch',
    path: '/api/v3/groups/:name',
    middleware: protectEmbeddedRoute(UsersController.updateGroupEndPoint, constants.HTTP_CODE_SUCCESS)
  },
  {
    method: 'delete',
    path: '/api/v3/groups/:name',
    middleware: protectEmbeddedRoute(UsersController.deleteGroupEndPoint, constants.HTTP_CODE_NO_CONTENT)
  }
]

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
const ClusterController = require('../controllers/cluster-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/cluster/controllers',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const listClusterControllersEndPoint = ResponseDecorator.handleErrors(ClusterController.listClusterControllersEndPoint, successCode, errorCodes)

      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await listClusterControllersEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/cluster/controllers/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getClusterControllerEndPoint = ResponseDecorator.handleErrors(ClusterController.getClusterControllerEndPoint, successCode, errorCodes)

      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await getClusterControllerEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/cluster/controllers/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const updateClusterControllerEndPoint = ResponseDecorator.handleErrors(ClusterController.updateClusterControllerEndPoint, successCode, errorCodes)

      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await updateClusterControllerEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/cluster/controllers/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const deleteClusterControllerEndPoint = ResponseDecorator.handleErrors(ClusterController.deleteClusterControllerEndPoint, successCode, errorCodes)

      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await deleteClusterControllerEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  }
]

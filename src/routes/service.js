/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
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
const ServiceController = require('../controllers/service-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/services',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const listServicesEndpoint = ResponseDecorator.handleErrors(
          ServiceController.listServicesEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await listServicesEndpoint(req)
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
    path: '/api/v3/services/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const getServiceEndpoint = ResponseDecorator.handleErrors(
          ServiceController.getServiceEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await getServiceEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/services',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.DuplicatePropertyError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const createServiceEndpoint = ResponseDecorator.handleErrors(
          ServiceController.createServiceEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await createServiceEndpoint(req)
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
    path: '/api/v3/services/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const updateServiceEndpoint = ResponseDecorator.handleErrors(
          ServiceController.updateServiceEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await updateServiceEndpoint(req)
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
    path: '/api/v3/services/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteServiceEndpoint = ResponseDecorator.handleErrors(
          ServiceController.deleteServiceEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await deleteServiceEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/services/yaml',
    fileInput: 'service',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.DuplicatePropertyError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const createServiceYAMLEndpoint = ResponseDecorator.handleErrors(
          ServiceController.createServiceYAMLEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await createServiceYAMLEndpoint(req)
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
    path: '/api/v3/services/yaml/:name',
    fileInput: 'service',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const updateServiceYAMLEndpoint = ResponseDecorator.handleErrors(
          ServiceController.updateServiceYAMLEndpoint,
          successCode,
          errorCodes
        )
        const responseObject = await updateServiceYAMLEndpoint(req)
        const user = req.kauth.grant.access_token.content.preferred_username
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  }
]

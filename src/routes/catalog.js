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
const CatalogController = require('../controllers/catalog-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/catalog/microservices',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const listCatalogItemsEndPoint = ResponseDecorator.handleErrors(
        CatalogController.listCatalogItemsEndPoint,
        successCode,
        errorCodes
      )

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await listCatalogItemsEndPoint(req)
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
    path: '/api/v3/catalog/microservices',
    supportSubstitution: true,
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
          code: constants.HTTP_CODE_DUPLICATE_PROPERTY,
          errors: [Errors.DuplicatePropertyError]
        }
      ]

      const createCatalogItemEndpoint = ResponseDecorator.handleErrors(
        CatalogController.createCatalogItemEndPoint,
        successCode,
        errorCodes
      )

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await createCatalogItemEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/catalog/microservices/:id',
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

      const listCatalogItemEndPoint = ResponseDecorator.handleErrors(
        CatalogController.listCatalogItemEndPoint,
        successCode,
        errorCodes
      )

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await listCatalogItemEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/catalog/microservices/:id',
    supportSubstitution: true,
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
          code: constants.HTTP_CODE_DUPLICATE_PROPERTY,
          errors: [Errors.DuplicatePropertyError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      const updateCatalogItemEndpoint = ResponseDecorator.handleErrors(
        CatalogController.updateCatalogItemEndPoint,
        successCode,
        errorCodes
      )

      // Add rbacMiddleware.protect middleware to protect the route for SRE and Developer
      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await updateCatalogItemEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/catalog/microservices/:id',
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

      const deleteCatalogItemEndPoint = ResponseDecorator.handleErrors(
        CatalogController.deleteCatalogItemEndPoint,
        successCode,
        errorCodes
      )

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const responseObject = await deleteCatalogItemEndPoint(req)
        const user = req.kauth.grant.access_token.content.preferred_username
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req, user: user, res: res, responseObject: responseObject })
      })
    }
  }

]

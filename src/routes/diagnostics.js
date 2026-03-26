/*
 *  *******************************************************************************
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
const DiagnosticController = require('../controllers/diagnostic-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const fs = require('fs')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'post',
    path: '/api/v3/microservices/:uuid/image-snapshot',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
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

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.createMicroserviceImageSnapshotEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await createMicroserviceImageSnapshotEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/image-snapshot',
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

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.getMicroserviceImageSnapshotEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await getMicroserviceImageSnapshotEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        if (responseObject.code !== successCode) {
          res
            .status(responseObject.code)
            .send(responseObject.body)

          logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
        } else {
          res.writeHead(successCode, {
            'Content-Length': responseObject.body['Content-Length'],
            'Content-Type': responseObject.body['Content-Type'],
            'Content-Disposition': 'attachment; filename=' + responseObject.body.fileName
          })
          fs.createReadStream(responseObject.body.filePath).pipe(res)
        }
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/microservices/:uuid/strace',
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
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const changeMicroserviceStraceStateEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.changeMicroserviceStraceStateEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await changeMicroserviceStraceStateEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/strace',
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

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroserviceStraceDataEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.getMicroserviceStraceDataEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await getMicroserviceStraceDataEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'put',
    path: '/api/v3/microservices/:uuid/strace',
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
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_INTERNAL_ERROR,
          errors: [Errors.FtpError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        const postMicroserviceStraceDataToFtpEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.postMicroserviceStraceDataToFtpEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await postMicroserviceStraceDataToFtpEndPoint(req)
        const user = req.kauth.grant.access_token.content.preferred_username
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  }
]

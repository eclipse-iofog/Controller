/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
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
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
      ]

      const createMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.createMicroserviceImageSnapshotEndPoint,
          successCode,
          errorCodes
      )
      const responseObject = await createMicroserviceImageSnapshotEndPoint(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
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
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
      ]

      const getMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.getMicroserviceImageSnapshotEndPoint,
          successCode,
          errorCodes
      )
      const responseObject = await getMicroserviceImageSnapshotEndPoint(req)
      if (responseObject.code !== successCode) {
        res
            .status(responseObject.code)
            .send(responseObject.body)

        logger.apiRes({ req: req, res: responseObject })
      } else {
        res.writeHead(successCode, {
          'Content-Length': responseObject.body['Content-Length'],
          'Content-Type': responseObject.body['Content-Type'],
          'Content-Disposition': 'attachment; filename=' + responseObject.body.fileName,
        })
        fs.createReadStream(responseObject.body.filePath).pipe(res)
      }
    },
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
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
      ]

      const changeMicroserviceStraceStateEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.changeMicroserviceStraceStateEndPoint,
          successCode,
          errorCodes
      )
      const responseObject = await changeMicroserviceStraceStateEndPoint(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
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
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
      ]

      const getMicroserviceStraceDataEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.getMicroserviceStraceDataEndPoint,
          successCode,
          errorCodes
      )
      const responseObject = await getMicroserviceStraceDataEndPoint(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
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
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
        {
          code: constants.HTTP_CODE_INTERNAL_ERROR,
          errors: [Errors.FtpError],
        },
      ]

      const postMicroserviceStraceDataToFtpEndPoint = ResponseDecorator.handleErrors(
          DiagnosticController.postMicroserviceStraceDataToFtpEndPoint,
          successCode,
          errorCodes
      )
      const responseObject = await postMicroserviceStraceDataToFtpEndPoint(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
]

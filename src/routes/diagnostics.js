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
const constants = require('../helpers/constants');
const DiagnosticController = require('../controllers/diagnostic-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'post',
    path: '/api/v3/iofog/microservices/:id/image-snapshot',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/microservices/:id/image-snapshot',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/iofog/microservices/:id/strace',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_NO_CONTENT;
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
      ];

      const changeMicroserviceStraceStateEndPoint = ResponseDecorator.handleErrors(
        DiagnosticController.changeMicroserviceStraceStateEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await changeMicroserviceStraceStateEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/microservices/:id/strace',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_SUCCESS;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ];

      const getMicroserviceStraceDataEndPoint = ResponseDecorator.handleErrors(
        DiagnosticController.getMicroserviceStraceDataEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await getMicroserviceStraceDataEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'put',
    path: '/api/v3/iofog/microservices/:id/strace',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_NO_CONTENT;
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
      ];

      const postMicroserviceStraceDataToFtpEndPoint = ResponseDecorator.handleErrors(
        DiagnosticController.postMicroserviceStraceDataToFtpEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await postMicroserviceStraceDataToFtpEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  }
]

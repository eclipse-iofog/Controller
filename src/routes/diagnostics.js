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
const fs = require('fs');

module.exports = [
  {
    method: 'post',
    path: '/api/v3/microservices/:id/image-snapshot',
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
        }
      ];

      const createMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
        DiagnosticController.createMicroserviceImageSnapshotEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await createMicroserviceImageSnapshotEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/microservices/:id/image-snapshot',
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
        }
      ];

      const getMicroserviceImageSnapshotEndPoint = ResponseDecorator.handleErrors(
        DiagnosticController.getMicroserviceImageSnapshotEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await getMicroserviceImageSnapshotEndPoint(req);

      fs.exists(responseObject.body.filePath, function(exists){
        if (exists) {
          res.writeHead(200, {
            "Content-Length": responseObject.body['Content-Length'],
            "Content-Type": responseObject.body['Content-Type'],
            "Content-Disposition": "attachment; filename=" + responseObject.body.fileName
          });
          fs.createReadStream(responseObject.body.filePath).pipe(res);
        } else {
          res.writeHead(400, {"Content-Type": "text/plain"});
          res.end("ERROR File does not exist");
        }
      });
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

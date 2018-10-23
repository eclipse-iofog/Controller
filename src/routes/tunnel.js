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
const TunnelController = require('../controllers/tunnel-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'patch',
    path: '/api/v3/iofog/:id/tunnel',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_NO_CONTENT;
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
      ];
      const tunnelEndPoint = ResponseDecorator.handleErrors(TunnelController.manageTunnelEndPoint, successCode, errorCodes);
      const responseObject = await tunnelEndPoint(req);
      res
          .status(responseObject.code)
          .send(responseObject.body);
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:id/tunnel',
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
      const tunnelEndPoint = ResponseDecorator.handleErrors(TunnelController.getTunnelEndPoint, successCode, errorCodes);
      const responseObject = await tunnelEndPoint(req);
      res
          .status(responseObject.code)
          .send(responseObject.body);
    }
  }
];
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

const FlowController = require('../controllers/flow-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'get',
    path: '/api/v3/flow',
    middleware: (req, res) => {

        // add errors

        const successCode = constants.HTTP_CODE_SUCCESS;
        const errorCodes = [
            {
                code: constants.HTTP_CODE_UNAUTHORIZED,
                errors: []
            },
            {
                code: constants.HTTP_CODE_INTERNAL_ERROR,
                errors: []
            }
        ];

        // add auth

        const flowsByUserEndPoint = ResponseDecorator.handleErrors(FlowController.flowsByUserEndPoint(req), successCode, errorCodes);
        const responseObject = await flowsByUserEndPoint(req);

        res
            .status(responseObject.code)
            .send(responseObject.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/flow',
    middleware: (req, res) => {

        // add errors

        const successCode = constants.HTTP_CODE_CREATED;
        const errorCodes = [
            {
                code: constants.HTTP_CODE_BAD_REQUEST,
                errors: [Errors.ValidationError]
            },
            {
                code: constants.HTTP_CODE_UNAUTHORIZED,
                errors: []
            },
            {
                code: constants.HTTP_CODE_INTERNAL_ERROR,
                errors: []
            }
        ];

        // add auth

        const flowCreateEndPoint = ResponseDecorator.handleErrors(FlowController.flowCreateEndPoint, successCode, errorCodes);
        const responseObject = await flowCreateEndPoint(req);

        res
            .status(responseObject.code)
            .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/flow/:id',
    middleware: (req, res) => {

        // add errors

        const successCode = constants.HTTP_CODE_SUCCESS;
        const errorCodes = [
            {
                code: constants.HTTP_CODE_UNAUTHORIZED,
                errors: []
            },
            {
                code: constants.HTTP_CODE_NOT_FOUND,
                errors: []
            },
            {
                code: constants.HTTP_CODE_INTERNAL_ERROR,
                errors: []
            }
        ];

        // add auth

        const flowGetEndPoint = ResponseDecorator.handleErrors(FlowController.flowGetEndPoint(req), successCode, errorCodes);
        const responseObject = await flowGetEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/flow/:id',
    middleware: (req, res) => {

        // add errors

        const successCode = constants.HTTP_CODE_NO_CONTENT;
        const errorCodes = [
            {
                code: constants.HTTP_CODE_BAD_REQUEST,
                errors: []
            },
            {
                code: constants.HTTP_CODE_UNAUTHORIZED,
                errors: []
            },
            {
                code: constants.HTTP_CODE_NOT_FOUND,
                errors: []
            },
            {
                code: constants.HTTP_CODE_INTERNAL_ERROR,
                errors: []
            }
        ];

        // add auth

        const flowUpdateEndPoint = ResponseDecorator.handleErrors(FlowController.flowUpdateEndPoint(req), successCode, errorCodes);
        const responseObject = await flowUpdateEndPoint(req);

        res
            .status(responseObject.code)
            .send(responseObject.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/flow/:id',
    middleware: (req, res) => {

        // add errors

        const successCode = constants.HTTP_CODE_NO_CONTENT;
        const errorCodes = [
            {
                code: constants.HTTP_CODE_UNAUTHORIZED,
                errors: []
            },
            {
                code: constants.HTTP_CODE_NOT_FOUND,
                errors: []
            },
            {
                code: constants.HTTP_CODE_INTERNAL_ERROR,
                errors: []
            }
        ];

        // add auth

        const flowDeleteEndPoint = ResponseDecorator.handleErrors(FlowController.flowDeleteEndPoint(req), successCode, errorCodes);
        const responseObject = await flowDeleteEndPoint(req);

        res
            .status(responseObject.code)
            .send(responseObject.body)
    }
  }
];
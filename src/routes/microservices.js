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
const MicroservicesController = require('../controllers/microservices-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
     method: 'get',
     path: '/api/v3/microservices/',
     middleware: async (req, res) => {

       const successCode = constants.HTTP_CODE_SUCCESS;
       const errorCodes = [
         {
           code: constants.HTTP_CODE_UNAUTHORIZED,
           errors: [Errors.AuthenticationError]
         }
       ];

       const getMicroservicesByFlowEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getMicroservicesByFlowEndPoint, successCode, errorCodes);
       const responseObject = await getMicroservicesByFlowEndPoint(req);

       res
         .status(responseObject.code)
         .send(responseObject.body)
      }
  },
  {
    method: 'post',
    path: '/api/v3/microservices',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_SUCCESS;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ];

      const createMicroservicesOnFogEndPoint = ResponseDecorator.handleErrors(MicroservicesController.createMicroservicesOnFogEndPoint, successCode, errorCodes);
      const responseObject = await createMicroservicesOnFogEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/microservices/:uuid',
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

      const getMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getMicroserviceEndPoint, successCode, errorCodes);
      const responseObject = await getMicroserviceEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },

  {
    method: 'patch',
    path: '/api/v3/microservices/:uuid',
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

      const updateMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateMicroserviceEndPoint, successCode, errorCodes);
      const responseObject = await updateMicroserviceEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/microservices/:uuid',
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

      const deleteMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.deleteMicroserviceEndPoint, successCode, errorCodes);
      const responseObject = await deleteMicroserviceEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/microservices/:uuid/routes/:receiverUuid',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_CREATED;
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

      const createMicroserviceRoute = ResponseDecorator.handleErrors(MicroservicesController.createMicroserviceRoute, successCode, errorCodes);
      const responseObject = await createMicroserviceRoute(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    },
  },
  {
    method: 'delete',
    path: '/api/v3/microservices/:uuid/routes/:receiverUuid',
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

      const deleteMicroserviceRoute = ResponseDecorator.handleErrors(MicroservicesController.deleteMicroserviceRoute, successCode, errorCodes);
      const responseObject = await deleteMicroserviceRoute(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    },
  },
  {
    method: 'post',
    path: '/api/v3/microservices/:uuid/port-mapping',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_CREATED;
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

      const createMicroservicePortMapping = ResponseDecorator.handleErrors(MicroservicesController.createMicroservicePortMapping, successCode, errorCodes);
      const responseObject = await createMicroservicePortMapping(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    },
  },
  {
    method: 'delete',
    path: '/api/v3/microservices/:uuid/port-mapping/:internalPort',
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

      const deleteMicroservicePortMapping = ResponseDecorator.handleErrors(MicroservicesController.deleteMicroservicePortMapping, successCode, errorCodes);
      const responseObject = await deleteMicroservicePortMapping(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    },
  },
]

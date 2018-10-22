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
const CatalogController = require('../controllers/catalog-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'get',
    path: '/api/v3/catalog/microservices',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_SUCCESS;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ];

      const listCatalogItemsEndPoint = ResponseDecorator.handleErrors(
        CatalogController.listCatalogItemsEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await listCatalogItemsEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/catalog/microservices',
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
          code: constants.HTTP_CODE_DUPLICATE_PROPERTY,
          errors: [Errors.DuplicatePropertyError]
        }
      ];

      const createCatalogItemEndpoint = ResponseDecorator.handleErrors(
        CatalogController.createCatalogItemEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await createCatalogItemEndpoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/catalog/microservices/:id',
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

      const listCatalogItemEndPoint = ResponseDecorator.handleErrors(
        CatalogController.listCatalogItemEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await listCatalogItemEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/catalog/microservices/:id',
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
          code: constants.HTTP_CODE_DUPLICATE_PROPERTY,
          errors: [Errors.DuplicatePropertyError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ];

      const updateCatalogItemEndpoint = ResponseDecorator.handleErrors(
        CatalogController.updateCatalogItemEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await updateCatalogItemEndpoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/catalog/microservices/:id',
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

      const deleteCatalogItemEndPoint = ResponseDecorator.handleErrors(
        CatalogController.deleteCatalogItemEndPoint,
        successCode,
        errorCodes
      );
      const responseObject = await deleteCatalogItemEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  }
]

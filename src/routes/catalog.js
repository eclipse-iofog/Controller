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

module.exports = [
  {
    method: 'get',
    path: '/api/v3/catalog/microservices',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/catalog/microservices',
    middleware: (req, res) => {

      const successCode = 201;
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



      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/catalog/microservices/:id',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/catalog/microservices/:id',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/catalog/microservices/:id',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  }
]

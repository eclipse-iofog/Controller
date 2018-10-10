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
const FogController = require('../controllers/iofog-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')

module.exports = [
  {
    method: 'post',
    path: '/api/v3/iofog/list',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/iofog',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_CREATED
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        }
      ]

      const createFog = ResponseDecorator.handleErrors(FogController.createFog, successCode, errCodes)
      const responseObject = await createFog(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      const createFog = ResponseDecorator.handleErrors(FogController.updateFog, successCode, errCodes)
      const responseObject = await createFog(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/iofog/:id',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:id',
    middleware: async (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:id/provisioning-key',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/iofog/:id/version/:versionCommand',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  }
]

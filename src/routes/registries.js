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
const RegistryController = require('../controllers/registry-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')

module.exports = [
  {
    method: 'post',
    path: '/api/v3/registries',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError],
        },
      ]
      const registriesEndPoint = ResponseDecorator.handleErrors(RegistryController.createRegistryEndPoint, successCode, errorCodes)
      const responseObject = await registriesEndPoint(req)
      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({req: req, res: responseObject})
    },
  },
  {
    method: 'get',
    path: '/api/v3/registries',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError],
        },
      ]
      const registriesEndPoint = ResponseDecorator.handleErrors(RegistryController.getRegistriesEndPoint, successCode, errorCodes)
      const responseObject = await registriesEndPoint(req)
      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({req: req, res: responseObject})
    },
  },
  {
    method: 'delete',
    path: '/api/v3/registries/:id',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
      ]
      const registriesEndPoint = ResponseDecorator.handleErrors(RegistryController.deleteRegistryEndPoint, successCode, errorCodes)
      const responseObject = await registriesEndPoint(req)
      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({req: req, res: responseObject})
    },
  },
  {
    method: 'patch',
    path: '/api/v3/registries/:id',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError],
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError],
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError],
        },
      ]
      const updateRegistryEndPoint = ResponseDecorator.handleErrors(RegistryController.updateRegistryEndPoint,
          successCode, errorCodes)
      const responseObject = await updateRegistryEndPoint(req)
      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({req: req, res: responseObject})
    },
  },
]

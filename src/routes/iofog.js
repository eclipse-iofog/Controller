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
const logger = require('../logger')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/iofog-list',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError],
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
      ]

      const getFogList = ResponseDecorator.handleErrors(FogController.getFogListEndPoint, successCode, errCodes)
      const responseObject = await getFogList(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'post',
    path: '/api/v3/iofog',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError],
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
      ]

      const createFog = ResponseDecorator.handleErrors(FogController.createFogEndPoint, successCode, errCodes)
      const responseObject = await createFog(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'patch',
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError],
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const updateFog = ResponseDecorator.handleErrors(FogController.updateFogEndPoint, successCode, errCodes)
      const responseObject = await updateFog(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'delete',
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_ACCEPTED
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const deleteFog = ResponseDecorator.handleErrors(FogController.deleteFogEndPoint, successCode, errCodes)
      const responseObject = await deleteFog(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const getFog = ResponseDecorator.handleErrors(FogController.getFogEndPoint, successCode, errCodes)
      const responseObject = await getFog(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:uuid/provisioning-key',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const generateFogProvisioningKey = ResponseDecorator.handleErrors(FogController.generateProvisioningKeyEndPoint,
          successCode, errCodes)
      const responseObject = await generateFogProvisioningKey(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'post',
    path: '/api/v3/iofog/:uuid/version/:versionCommand',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError],
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const setFogVersionCommand = ResponseDecorator.handleErrors(FogController.setFogVersionCommandEndPoint,
          successCode, errCodes)
      const responseObject = await setFogVersionCommand(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'post',
    path: '/api/v3/iofog/:uuid/reboot',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError],
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]


      const setFogRebootCommand = ResponseDecorator.handleErrors(FogController.setFogRebootCommandEndPoint,
          successCode, errCodes)
      const responseObject = await setFogRebootCommand(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:uuid/hal/hw',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const getHalHardwareInfo = ResponseDecorator.handleErrors(FogController.getHalHardwareInfoEndPoint,
          successCode, errCodes)
      const responseObject = await getHalHardwareInfo(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
  {
    method: 'get',
    path: '/api/v3/iofog/:uuid/hal/usb',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError],
        },
        {
          code: 404,
          errors: [Errors.NotFoundError],
        },
      ]

      const getHalUsbInfo = ResponseDecorator.handleErrors(FogController.getHalUsbInfoEndPoint, successCode, errCodes)
      const responseObject = await getHalUsbInfo(req)

      res
          .status(responseObject.code)
          .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    },
  },
]

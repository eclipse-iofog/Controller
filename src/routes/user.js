/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
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
const UserController = require('../controllers/user-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')

module.exports = [
  {
    method: 'post',
    path: '/api/v3/user/login',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/login') // don't use req as arg, because password not encrypted

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.InvalidCredentialsError]
        }
      ]

      const userLoginEndPoint = ResponseDecorator.handleErrors(UserController.userLoginEndPoint, successCode, errorCodes)
      const responseObject = await userLoginEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes('POST /api/v3/user/login', { args: { statusCode: responseObject.code } })
      // don't use req and responseObject as args, because they have password and token
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/refresh',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/refresh') // don't use req as arg, because password not encrypted

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.InvalidCredentialsError]
        }
      ]

      const refreshTokenEndPoint = ResponseDecorator.handleErrors(UserController.refreshTokenEndPoint, successCode, errorCodes)
      const responseObject = await refreshTokenEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes('POST /api/v3/user/refresh', { args: { statusCode: responseObject.code } })
      // don't use req and responseObject as args, because they have password and token
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/profile',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getUserProfileEndPoint = ResponseDecorator.handleErrors(
        UserController.getUserProfileEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await getUserProfileEndPoint(req)
      const user = req.kauth.grant.access_token.content.preferred_username
      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/logout',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const userLogoutEndPoint = ResponseDecorator.handleErrors(UserController.userLogoutEndPoint, successCode, errorCodes)
      const responseObject = await userLogoutEndPoint(req)

      res
        .status(responseObject.code)
        .send()
    }
  }
]

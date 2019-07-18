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

const UserController = require('../controllers/user-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')

const Config = require('../config')
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
  },
  {
    method: 'post',
    path: '/api/v3/user/signup',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/signup') // don't use req as arg, because password not encrypted

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const userSignupEndPoint = ResponseDecorator.handleErrors(UserController.userSignupEndPoint, successCode, errorCodes)
      const responseObject = await userSignupEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/signup/resend-activation',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const resendActivationEndPoint = ResponseDecorator.handleErrors(UserController.resendActivationEndPoint,
        successCode, errorCodes)
      const responseObject = await resendActivationEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/activate',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SEE_OTHER
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      const activateUserEndPoint = ResponseDecorator.handleErrors(UserController.activateUserAccountEndPoint,
        successCode, errorCodes)
      const responseObject = await activateUserEndPoint(req)

      // redirect to login page
      if (responseObject.code === successCode) {
        res.setHeader('Location', Config.get('Email:HomeUrl'))
      }

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
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

      const getUserProfileEndPoint = ResponseDecorator.handleErrors(UserController.getUserProfileEndPoint, successCode, errorCodes)
      const responseObject = await getUserProfileEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/profile',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const updateUserProfileEndPoint = ResponseDecorator.handleErrors(UserController.updateUserProfileEndPoint,
        successCode, errorCodes)
      const responseObject = await updateUserProfileEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/profile',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const deleteUserProfileEndPoint = ResponseDecorator.handleErrors(UserController.deleteUserProfileEndPoint,
        successCode, errorCodes)
      const responseObject = await deleteUserProfileEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/password',
    middleware: async (req, res) => {
      logger.apiReq('PATCH /api/v3/user/password') // don't use req as arg, because password not encrypted

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const updateUserPasswordEndPoint = ResponseDecorator.handleErrors(UserController.updateUserPasswordEndPoint,
        successCode, errorCodes)
      const responseObject = await updateUserPasswordEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/password',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      const resetUserPasswordEndPoint = ResponseDecorator.handleErrors(UserController.resetUserPasswordEndPoint,
        successCode, errorCodes)
      const responseObject = await resetUserPasswordEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  }
]

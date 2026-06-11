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
    path: '/api/v3/user/mfa/enroll',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError, Errors.InvalidArgumentError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      const enrollMfaEndPoint = ResponseDecorator.handleErrors(UserController.enrollMfaEndPoint, successCode, errorCodes)
      const responseObject = await enrollMfaEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes(req, { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/mfa/confirm',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError, Errors.InvalidArgumentError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        }
      ]

      const confirmMfaEndPoint = ResponseDecorator.handleErrors(UserController.confirmMfaEndPoint, successCode, errorCodes)
      const responseObject = await confirmMfaEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes(req, { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/mfa',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError, Errors.InvalidArgumentError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      const disableMfaEndPoint = ResponseDecorator.handleErrors(UserController.disableMfaEndPoint, successCode, errorCodes)
      const responseObject = await disableMfaEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes(req, { args: { statusCode: responseObject.code } })
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
    method: 'post',
    path: '/api/v3/user/change-password',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/change-password')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError, Errors.InvalidArgumentError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const changePasswordEndPoint = ResponseDecorator.handleErrors(UserController.changePasswordEndPoint, successCode, errorCodes)
      const responseObject = await changePasswordEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes('POST /api/v3/user/change-password', { args: { statusCode: responseObject.code } })
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
      res
        .status(responseObject.code)
        .send(responseObject.body)

      const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
        ? req.kauth.grant.access_token.content.preferred_username
        : undefined
      logger.apiRes({ req, user, res, responseObject })
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
    method: 'get',
    path: '/api/v3/user/oauth/authorize',
    middleware: async (req, res) => {
      logger.apiReq('GET /api/v3/user/oauth/authorize')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const oauthAuthorizeEndPoint = ResponseDecorator.handleErrors(
        UserController.oauthAuthorizeEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await oauthAuthorizeEndPoint(req)
      if (responseObject.code === constants.HTTP_CODE_SUCCESS) {
        res.redirect(302, responseObject.body.redirectUrl)
        logger.apiRes('GET /api/v3/user/oauth/authorize', { args: { statusCode: 302 } })
        return
      }

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('GET /api/v3/user/oauth/authorize', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/oauth/callback',
    middleware: async (req, res) => {
      logger.apiReq('GET /api/v3/user/oauth/callback')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const oauthCallbackEndPoint = ResponseDecorator.handleErrors(
        UserController.oauthCallbackEndPoint,
        successCode,
        errorCodes
      )

      const responseObject = await oauthCallbackEndPoint(req)

      if (responseObject.code !== constants.HTTP_CODE_SUCCESS) {
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes('GET /api/v3/user/oauth/callback', { args: { statusCode: responseObject.code } })
        return
      }

      const { tokens, viewerUrl } = responseObject.body

      if (viewerUrl) {
        const fragment = new URLSearchParams()
        fragment.set('accessToken', tokens.accessToken)
        if (tokens.refreshToken) {
          fragment.set('refreshToken', tokens.refreshToken)
        }
        res.redirect(302, `${viewerUrl}/login#${fragment.toString()}`)
        logger.apiRes('GET /api/v3/user/oauth/callback', { args: { statusCode: 302 } })
        return
      }

      res
        .status(responseObject.code)
        .send(tokens)

      logger.apiRes('GET /api/v3/user/oauth/callback', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/interaction/:uid',
    middleware: async (req, res) => {
      logger.apiReq('GET /api/v3/user/interaction/:uid')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionStatusEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionStatusEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionStatusEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('GET /api/v3/user/interaction/:uid', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/login',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/login')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionLoginEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionLoginEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionLoginEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/login', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/mfa',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/mfa')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionMfaEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionMfaEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionMfaEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/mfa', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/enroll',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/enroll')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionEnrollEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionEnrollEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionEnrollEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/enroll', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/confirm-enroll',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/confirm-enroll')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionConfirmEnrollEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionConfirmEnrollEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionConfirmEnrollEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/confirm-enroll', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/change-password',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/change-password')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError, Errors.InvalidArgumentError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionChangePasswordEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionChangePasswordEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionChangePasswordEndPoint(req)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/change-password', { args: { statusCode: responseObject.code } })
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/interaction/:uid/complete',
    middleware: async (req, res) => {
      logger.apiReq('POST /api/v3/user/interaction/:uid/complete')

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError, Errors.InvalidCredentialsError]
        },
        {
          code: constants.HTTP_CODE_NOT_IMPLEMENTED,
          errors: [Errors.NotImplementedError]
        }
      ]

      const interactionCompleteEndPoint = ResponseDecorator.handleErrors(
        UserController.interactionCompleteEndPoint,
        successCode,
        errorCodes
      )
      const responseObject = await interactionCompleteEndPoint(req, res)

      res.status(responseObject.code).send(responseObject.body)
      logger.apiRes('POST /api/v3/user/interaction/:uid/complete', { args: { statusCode: responseObject.code } })
    }
  }
]

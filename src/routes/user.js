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

const UserController = require('../controllers/user-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'post',
    path: '/api/v3/user/login',
    middleware: async (req, res) => {
      const successCode = constants.HTTP_CODE_SUCCESS;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.InvalidCredentialsError]
        }
      ];

      const userLoginEndPoint = ResponseDecorator.handleErrors(UserController.userLoginEndPoint, successCode, errorCodes);
      const responseObject = await userLoginEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/logout',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_NO_CONTENT;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ];

      const userLogoutEndPoint = ResponseDecorator.handleErrors(UserController.userLogoutEndPoint, successCode, errorCodes);
      const responseObject = await userLogoutEndPoint(req);

      res
        .status(responseObject.code)
        .send()
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/signup',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_CREATED;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ];

      const userSignupEndPoint = ResponseDecorator.handleErrors(UserController.userSignupEndPoint, successCode, errorCodes);
      const responseObject = await userSignupEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/signup/resend-activation',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_NO_CONTENT;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ];

      const resendActivationEndPoint = ResponseDecorator.handleErrors(UserController.resendActivationEndPoint, successCode, errorCodes);
      const responseObject = await resendActivationEndPoint(req);

      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/activate',
    middleware: async (req, res) => {

      const successCode = constants.HTTP_CODE_SEE_OTHER;
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ];

      const activateUserEndPoint = ResponseDecorator.handleErrors(UserController.activateUserAccountEndPoint, successCode, errorCodes);
      const responseObject = await activateUserEndPoint(req);

      // redirect to login page
      if (responseObject.code === successCode) {
        res.setHeader('Location', 'https://google.com');
      }


      res
        .status(responseObject.code)
        .send(responseObject.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/password',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/password',
    middleware: (req, res) => {
      res
        .status(constants.HTTP_CODE_SUCCESS)
        .send(req.body)
    }
  }
];
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

const UserController = require('../controllers/user-controller');
const ResponseDecorator = require('../decorators/response-decorator');
const Errors = require('../helpers/errors');

module.exports = [
  {
    method: 'post',
    path: '/api/v3/user/login',
    middleware: async (req, res) => {
      const successCode = 200;
      const errorCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
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
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'post',
    path: '/api/v3/user/signup',
    middleware: async (req, res) => {

      const successCode = 201;
      const errorCodes = [
        {
          code: 400,
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

      const successCode = 204;
      const errorCodes = [
        {
          code: 400,
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
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'get',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/profile',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'patch',
    path: '/api/v3/user/password',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  },
  {
    method: 'delete',
    path: '/api/v3/user/password',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
    }
  }
];
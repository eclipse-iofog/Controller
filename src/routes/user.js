const logger = require('./../logger');
const config = require('./../config');
const async = require('async');
const UserController = require('./../controllers/userController');
const ResponseDecorator = require('./../decorators/responseDecorator');
const Errors = require('../helpers/errors');


module.exports = [
  {
    method: 'post',
    path: '/api/v3/user/login',
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
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
    middleware: (req, res) => {
      res
        .status(200)
        .send(req.body)
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
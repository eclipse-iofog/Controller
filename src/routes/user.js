const logger = require('./../logger');
const config = require('./../config');
const async = require('async');
const userController = require('./../controllers/userController');


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
      let responseObject;
      try {
        const responseBody = await userController.userSignupEndPoint(req);
        responseObject = {code: 200, body: responseBody}
      } catch (errMsg) {
        switch (errMsg) {

          case 'some_err':
            responseObject = {code: 400, body: errMsg};
            break;
          case 'some_other_err':
            responseObject = {code: 500, body: errMsg};
            break;
          default:
            responseObject = {code: 500, body: errMsg};
            break;
        }
      }

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
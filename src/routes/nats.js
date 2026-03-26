/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
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
const NatsController = require('../controllers/nats-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/nats/operator',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.getOperatorEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/operator/rotate',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.rotateOperatorEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/bootstrap',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_FORBIDDEN, errors: [Errors.ForbiddenError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.getBootstrapEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/hub',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.getHubEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'put',
    path: '/api/v3/nats/hub',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.upsertHubEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/accounts',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.listAccountsEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/users',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.listAllUsersEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/account-rules',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.listAccountRulesEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/account-rules',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createAccountRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/account-rules/yaml',
    fileInput: 'natsAccountRule',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createAccountRuleFromYamlEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/nats/account-rules/:ruleName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.updateAccountRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/nats/account-rules/yaml/:ruleName',
    fileInput: 'natsAccountRule',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.updateAccountRuleFromYamlEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/nats/account-rules/:ruleName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.deleteAccountRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/user-rules',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.listUserRulesEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/user-rules',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createUserRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/user-rules/yaml',
    fileInput: 'natsUserRule',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createUserRuleFromYamlEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/nats/user-rules/:ruleName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.updateUserRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/nats/user-rules/yaml/:ruleName',
    fileInput: 'natsUserRule',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.updateUserRuleFromYamlEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/nats/user-rules/:ruleName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.deleteUserRuleEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/accounts/:appName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.getAccountEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/accounts/:appName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.ensureAccountEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/accounts/:appName/users',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.listUsersEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/accounts/:appName/users',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createUserEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/nats/accounts/:appName/users/:userName/creds',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.getUserCredsEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/nats/accounts/:appName/users/:userName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.deleteUserEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/nats/accounts/:appName/mqtt-bearer',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.createMqttBearerEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/nats/accounts/:appName/mqtt-bearer/:userName',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        { code: constants.HTTP_CODE_UNAUTHORIZED, errors: [Errors.AuthenticationError] },
        { code: constants.HTTP_CODE_BAD_REQUEST, errors: [Errors.ValidationError] },
        { code: constants.HTTP_CODE_NOT_FOUND, errors: [Errors.NotFoundError] }
      ]
      await rbacMiddleware.protect()(req, res, async () => {
        const endpoint = ResponseDecorator.handleErrors(
          NatsController.deleteMqttBearerEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await endpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token
          ? req.kauth.grant.access_token.content.preferred_username
          : 'system'
        res.status(responseObject.code).send(responseObject.body)
        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  }
]

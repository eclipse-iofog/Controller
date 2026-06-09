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
const VolumeMountController = require('../controllers/volume-mount-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')
const Errors = require('../helpers/errors')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/volumeMounts',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const getVolumeMountsEndpoint = ResponseDecorator.handleErrors(VolumeMountController.listVolumeMountsEndpoint, successCode, errorCodes)
        const responseObject = await getVolumeMountsEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/volumeMounts/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const getVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.getVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await getVolumeMountEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/volumeMounts/:name',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const updateVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.updateVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await updateVolumeMountEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/volumeMounts/:name',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_ACCEPTED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const deleteVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.deleteVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await deleteVolumeMountEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/volumeMounts',
    supportSubstitution: true,
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

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const createVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.createVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await createVolumeMountEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/volumeMounts/yaml',
    fileInput: 'volumeMount',
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

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const createVolumeMountYamlEndpoint = ResponseDecorator.handleErrors(VolumeMountController.createVolumeMountYamlEndpoint, successCode, errorCodes)
        const responseObject = await createVolumeMountYamlEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/volumeMounts/yaml/:name',
    fileInput: 'volumeMount',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const updateVolumeMountYamlEndpoint = ResponseDecorator.handleErrors(VolumeMountController.updateVolumeMountYamlEndpoint, successCode, errorCodes)
        const responseObject = await updateVolumeMountYamlEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'get',
    path: '/api/v3/volumeMounts/:name/link',
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

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const getVolumeMountLinkEndpoint = ResponseDecorator.handleErrors(VolumeMountController.getVolumeMountLinkEndpoint, successCode, errorCodes)
        const responseObject = await getVolumeMountLinkEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'post',
    path: '/api/v3/volumeMounts/:name/link',
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

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const linkVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.linkVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await linkVolumeMountEndpoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/volumeMounts/:name/link',
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

      // Add rbacMiddleware.protect middleware to protect the route for SRE role
      await rbacMiddleware.protect()(req, res, async () => {
        const unlinkVolumeMountEndpoint = ResponseDecorator.handleErrors(VolumeMountController.unlinkVolumeMountEndpoint, successCode, errorCodes)
        const responseObject = await unlinkVolumeMountEndpoint(req)
        const user = req.kauth.grant.access_token.content.preferred_username
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  }
]

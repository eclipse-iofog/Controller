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
const MicroservicesController = require('../controllers/microservices-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')
const WebSocketServer = require('../websocket/server')
const TransactionDecorator = require('../decorators/transaction-decorator')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/microservices/',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroservicesByApplicationEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getMicroservicesByApplicationEndPoint,
          successCode, errorCodes)
        const responseObject = await getMicroservicesByApplicationEndPoint(req)
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
    path: '/api/v3/microservices/system',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const getSystemMicroservicesByApplicationEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getSystemMicroservicesByApplicationEndPoint,
          successCode, errorCodes)
        const responseObject = await getSystemMicroservicesByApplicationEndPoint(req)
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
    path: '/api/v3/microservices',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroservicesOnFogEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createMicroserviceOnFogEndPoint, successCode, errorCodes)
        const responseObject = await createMicroservicesOnFogEndPoint(req)
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
    path: '/api/v3/microservices/yaml',
    supportSubstitution: true,
    fileInput: 'microservice',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroservicesYAMLEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createMicroserviceYAMLEndPoint, successCode, errorCodes)
        const responseObject = await createMicroservicesYAMLEndPoint(req)
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
    path: '/api/v3/microservices/:uuid',
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

      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await getMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid',
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

      await rbacMiddleware.protect()(req, res, async () => {
        const getSystemMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getSystemMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await getSystemMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/:uuid',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await updateMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateSystemMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateSystemMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await updateSystemMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/rebuild',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const rebuildMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.rebuildMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await rebuildMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/rebuild',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const rebuildSystemMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.rebuildSystemMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await rebuildSystemMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/yaml/:uuid',
    supportSubstitution: true,
    fileInput: 'microservice',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateMicroserviceYAMLEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateMicroserviceYAMLEndPoint,
          successCode, errorCodes)
        const responseObject = await updateMicroserviceYAMLEndPoint(req)
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
    path: '/api/v3/microservices/system/yaml/:uuid',
    supportSubstitution: true,
    fileInput: 'microservice',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateSystemMicroserviceYAMLEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateSystemMicroserviceYAMLEndPoint,
          successCode, errorCodes)
        const responseObject = await updateSystemMicroserviceYAMLEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await getMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await updateMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const getSystemMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.getSystemMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await getSystemMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const updateSystemMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.updateSystemMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await updateSystemMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.deleteMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await deleteMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteSystemMicroserviceConfigEndPoint = ResponseDecorator.handleErrors(MicroservicesController.deleteSystemMicroserviceConfigEndPoint,
          successCode, errorCodes)
        const responseObject = await deleteSystemMicroserviceConfigEndPoint(req)
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
    path: '/api/v3/microservices/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.deleteMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await deleteMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/port-mapping',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroservicePortMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createMicroservicePortMappingEndPoint, successCode, errorCodes)
        const responseObject = await createMicroservicePortMappingEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/port-mapping',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createSystemMicroservicePortMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createSystemMicroservicePortMappingEndPoint, successCode, errorCodes)
        const responseObject = await createSystemMicroservicePortMappingEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/port-mapping/:internalPort',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteMicroservicePortMapping = ResponseDecorator.handleErrors(
          MicroservicesController.deleteMicroservicePortMappingEndPoint, successCode, errorCodes)
        const responseObject = await deleteMicroservicePortMapping(req)
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
    path: '/api/v3/microservices/system/:uuid/port-mapping/:internalPort',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteSystemMicroservicePortMapping = ResponseDecorator.handleErrors(
          MicroservicesController.deleteSystemMicroservicePortMappingEndPoint, successCode, errorCodes)
        const responseObject = await deleteSystemMicroservicePortMapping(req)
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
    path: '/api/v3/microservices/:uuid/port-mapping',
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

      await rbacMiddleware.protect()(req, res, async () => {
        const getMicroservicePortMapping = ResponseDecorator.handleErrors(
          MicroservicesController.getMicroservicePortMappingListEndPoint, successCode, errorCodes)
        const responseObject = await getMicroservicePortMapping(req)
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
    path: '/api/v3/microservices/:uuid/volume-mapping',
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

      await rbacMiddleware.protect()(req, res, async () => {
        const listMicroserviceVolumeMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.listMicroserviceVolumeMappingsEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await listMicroserviceVolumeMappingEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/volume-mapping',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroserviceVolumeMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createMicroserviceVolumeMappingEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await createMicroserviceVolumeMappingEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/volume-mapping',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createSystemMicroserviceVolumeMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createSystemMicroserviceVolumeMappingEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await createSystemMicroserviceVolumeMappingEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/volume-mapping/:id',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteMicroserviceVolumeMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.deleteMicroserviceVolumeMappingEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await deleteMicroserviceVolumeMappingEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/volume-mapping/:id',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteSystemMicroserviceVolumeMappingEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.deleteSystemMicroserviceVolumeMappingEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await deleteSystemMicroserviceVolumeMappingEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createMicroserviceExecEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createMicroserviceExecEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await createMicroserviceExecEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const createSystemMicroserviceExecEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.createSystemMicroserviceExecEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await createSystemMicroserviceExecEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteMicroserviceExecEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.deleteMicroserviceExecEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await deleteMicroserviceExecEndPoint(req)
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
    path: '/api/v3/microservices/system/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const deleteSystemMicroserviceExecEndPoint = ResponseDecorator.handleErrors(
          MicroservicesController.deleteSystemMicroserviceExecEndPoint,
          successCode,
          errorCodes
        )
        const responseObject = await deleteSystemMicroserviceExecEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/start',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const startMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.startMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await startMicroserviceEndPoint(req)
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
    path: '/api/v3/microservices/:uuid/stop',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
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

      await rbacMiddleware.protect()(req, res, async () => {
        const stopMicroserviceEndPoint = ResponseDecorator.handleErrors(MicroservicesController.stopMicroserviceEndPoint,
          successCode, errorCodes)
        const responseObject = await stopMicroserviceEndPoint(req)
        const user = req.kauth && req.kauth.grant && req.kauth.grant.access_token ? req.kauth.grant.access_token.content.preferred_username : 'system'
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'ws',
    path: '/api/v3/microservices/exec/:microserviceUuid',
    middleware: rbacMiddleware.protectWebSocket(async (ws, req) => {
      logger.apiReq(req)
      try {
        // RBAC already passed, token already extracted by protectWebSocket
        // Set flag to indicate RBAC authorization is complete
        req._rbacAuthorized = true

        // Extract token from headers (set by protectWebSocket)
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }

        // Call handler directly
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.microserviceUuid
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleUserConnection(ws, req, token, microserviceUuid, false, transaction)
        })()
      } catch (error) {
        logger.error('Error in microservice WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.microserviceUuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Connection failed')
          }
        } catch (closeError) {
          logger.error('Error closing microservice WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })
  },
  {
    method: 'ws',
    path: '/api/v3/microservices/system/exec/:microserviceUuid',
    middleware: rbacMiddleware.protectWebSocket(async (ws, req) => {
      logger.apiReq(req)
      try {
        // RBAC already passed, token already extracted by protectWebSocket
        // Set flag to indicate RBAC authorization is complete
        req._rbacAuthorized = true

        // Extract token from headers (set by protectWebSocket)
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }

        // Call handler directly
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.microserviceUuid
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleUserConnection(ws, req, token, microserviceUuid, true, transaction) // true = expectSystem
        })()
      } catch (error) {
        logger.error('Error in system microservice WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.microserviceUuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Connection failed')
          }
        } catch (closeError) {
          logger.error('Error closing system microservice WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })
  },
  {
    method: 'ws',
    path: '/api/v3/microservices/:uuid/logs',
    middleware: rbacMiddleware.protectWebSocket(async (ws, req) => {
      logger.apiReq(req)
      try {
        // RBAC already passed, token already extracted by protectWebSocket
        // Set flag to indicate RBAC authorization is complete
        req._rbacAuthorized = true

        // Extract token from headers (set by protectWebSocket)
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }

        // Call handler directly with extracted parameters
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.uuid
        const fogUuid = null
        const expectSystem = false
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleUserLogsConnection(ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction)
        })()
      } catch (error) {
        logger.error('Error in microservice logs WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.uuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Connection failed')
          }
        } catch (closeError) {
          logger.error('Error closing microservice logs WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })
  },
  {
    method: 'ws',
    path: '/api/v3/microservices/system/:uuid/logs',
    middleware: rbacMiddleware.protectWebSocket(async (ws, req) => {
      logger.apiReq(req)
      try {
        // RBAC already passed, token already extracted by protectWebSocket
        // Set flag to indicate RBAC authorization is complete
        req._rbacAuthorized = true

        // Extract token from headers (set by protectWebSocket)
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:', error.message)
          }
          return
        }

        // Call handler directly with extracted parameters
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.uuid
        const fogUuid = null
        const expectSystem = true
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleUserLogsConnection(ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction)
        })()
      } catch (error) {
        logger.error('Error in system microservice logs WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.uuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Connection failed')
          }
        } catch (closeError) {
          logger.error('Error closing system microservice logs WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })
  }
]

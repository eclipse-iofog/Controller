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
const FogController = require('../controllers/iofog-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/iofog-list',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        }
      ]

      // Add rbacMiddleware.protect middleware to protect the route for SRE, Developer, and Viewer roles
      await rbacMiddleware.protect()(req, res, async () => {
        const getFogList = ResponseDecorator.handleErrors(FogController.getFogListEndPoint, successCode, errCodes)
        const responseObject = await getFogList(req)
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
    path: '/api/v3/iofog',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        }
      ]

      // Protect the route with SRE access control
      await rbacMiddleware.protect()(req, res, async () => {
        const createFog = ResponseDecorator.handleErrors(FogController.createFogEndPoint, successCode, errCodes)
        const responseObject = await createFog(req)
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
    path: '/api/v3/iofog/:uuid',
    supportSubstitution: true,
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      // Protect the route with SRE access control
      await rbacMiddleware.protect()(req, res, async () => {
        const updateFog = ResponseDecorator.handleErrors(FogController.updateFogEndPoint, successCode, errCodes)
        const responseObject = await updateFog(req)
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
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_ACCEPTED
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      // Protect the route with SRE access control
      await rbacMiddleware.protect()(req, res, async () => {
        const deleteFog = ResponseDecorator.handleErrors(FogController.deleteFogEndPoint, successCode, errCodes)
        const responseObject = await deleteFog(req)
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
    path: '/api/v3/iofog/:uuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      // Protect the route with SRE, Developer, and Viewer access control
      await rbacMiddleware.protect()(req, res, async () => {
        const getFog = ResponseDecorator.handleErrors(FogController.getFogEndPoint, successCode, errCodes)
        const responseObject = await getFog(req)
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
    path: '/api/v3/iofog/:uuid/provisioning-key',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_CREATED
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const generateFogProvisioningKey = ResponseDecorator.handleErrors(FogController.generateProvisioningKeyEndPoint,
          successCode, errCodes)
        const responseObject = await generateFogProvisioningKey(req)
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
    path: '/api/v3/iofog/:uuid/version/:versionCommand',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const setFogVersionCommand = ResponseDecorator.handleErrors(FogController.setFogVersionCommandEndPoint,
          successCode, errCodes)
        const responseObject = await setFogVersionCommand(req)
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
    path: '/api/v3/iofog/:uuid/reboot',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const setFogRebootCommand = ResponseDecorator.handleErrors(FogController.setFogRebootCommandEndPoint,
          successCode, errCodes)
        const responseObject = await setFogRebootCommand(req)
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
    path: '/api/v3/iofog/:uuid/hal/hw',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const getHalHardwareInfo = ResponseDecorator.handleErrors(FogController.getHalHardwareInfoEndPoint,
          successCode, errCodes)
        const responseObject = await getHalHardwareInfo(req)
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
    path: '/api/v3/iofog/:uuid/hal/usb',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const getHalUsbInfo = ResponseDecorator.handleErrors(FogController.getHalUsbInfoEndPoint, successCode, errCodes)
        const responseObject = await getHalUsbInfo(req)
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
    path: '/api/v3/iofog/:uuid/prune',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const setFogPruneCommand = ResponseDecorator.handleErrors(FogController.setFogPruneCommandEndPoint,
          successCode, errCodes)
        const responseObject = await setFogPruneCommand(req)
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
    path: '/api/v3/iofog/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const enableNodeExecEndPoint = ResponseDecorator.handleErrors(FogController.enableNodeExecEndPoint,
          successCode, errCodes)
        const responseObject = await enableNodeExecEndPoint(req)
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
    path: '/api/v3/iofog/:uuid/exec',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 400,
          errors: [Errors.ValidationError]
        },
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        },
        {
          code: 404,
          errors: [Errors.NotFoundError]
        }
      ]

      await rbacMiddleware.protect()(req, res, async () => {
        const disableNodeExecEndPoint = ResponseDecorator.handleErrors(FogController.disableNodeExecEndPoint,
          successCode, errCodes)
        const responseObject = await disableNodeExecEndPoint(req)
        const user = req.kauth.grant.access_token.content.preferred_username
        res
          .status(responseObject.code)
          .send(responseObject.body)

        logger.apiRes({ req: req, user: user, res: res, responseObject: responseObject })
      })
    }
  },
  {
    method: 'ws',
    path: '/api/v3/iofog/:uuid/logs',
    middleware: rbacMiddleware.protectWebSocket(async (ws, req) => {
      const WebSocketServer = require('../websocket/server')
      const TransactionDecorator = require('../decorators/transaction-decorator')
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
        const microserviceUuid = null
        const fogUuid = req.params.uuid
        const expectSystem = false
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleUserLogsConnection(ws, req, token, microserviceUuid, fogUuid, expectSystem, transaction)
        })()
      } catch (error) {
        logger.error('Error in fog logs WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          iofogUuid: req.params.uuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Connection failed')
          }
        } catch (closeError) {
          logger.error('Error closing fog logs WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    })
  }
]

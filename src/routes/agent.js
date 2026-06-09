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
const AgentController = require('../controllers/agent-controller')
const ResponseDecorator = require('../decorators/response-decorator')
const WebSocketServer = require('../websocket/server')
const Errors = require('../helpers/errors')
const logger = require('../logger')
const TransactionDecorator = require('../decorators/transaction-decorator')

module.exports = [
  {
    method: 'post',
    path: '/api/v3/agent/provision',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const agentProvisionEndPoint = ResponseDecorator.handleErrors(AgentController.agentProvisionEndPoint, successCode, errorCodes)
      const responseObject = await agentProvisionEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'post',
    path: '/api/v3/agent/deprovision',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const agentDeprovisionEndPoint = ResponseDecorator.handleErrors(AgentController.agentDeprovisionEndPoint,
        successCode, errorCodes)
      const responseObject = await agentDeprovisionEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentConfigEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentConfigEndPoint, successCode, errorCodes)
      const responseObject = await getAgentConfigEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/agent/config',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const updateAgentConfigEndPoint = ResponseDecorator.handleErrors(AgentController.updateAgentConfigEndPoint,
        successCode, errorCodes)
      const responseObject = await updateAgentConfigEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/agent/config/gps',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const updateAgentGpsEndPoint = ResponseDecorator.handleErrors(AgentController.updateAgentGpsEndPoint,
        successCode, errorCodes)
      const responseObject = await updateAgentGpsEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/config/changes',
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

      const getAgentConfigChangesEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentConfigChangesEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentConfigChangesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'patch',
    path: '/api/v3/agent/config/changes',
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

      const resetAgentConfigChangesEndPoint = ResponseDecorator.handleErrors(AgentController.resetAgentConfigChangesEndPoint,
        successCode, errorCodes)
      const responseObject = await resetAgentConfigChangesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'put',
    path: '/api/v3/agent/status',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const updateAgentStatusEndPoint = ResponseDecorator.handleErrors(AgentController.updateAgentStatusEndPoint,
        successCode, errorCodes)
      const responseObject = await updateAgentStatusEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/edgeResources',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentLinkedEdgeResourcesEndpoint = ResponseDecorator.handleErrors(AgentController.getAgentLinkedEdgeResourcesEndpoint,
        successCode, errorCodes)
      const responseObject = await getAgentLinkedEdgeResourcesEndpoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/volumeMounts',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentLinkedVolumeMountsEndpoint = ResponseDecorator.handleErrors(AgentController.getAgentLinkedVolumeMountsEndpoint,
        successCode, errorCodes)
      const responseObject = await getAgentLinkedVolumeMountsEndpoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/microservices',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentMicroservicesEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentMicroservicesEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentMicroservicesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/microservices/:microserviceUuid',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentMicroserviceEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentMicroserviceEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentMicroserviceEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/registries',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentRegistriesEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentRegistriesEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentRegistriesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/tunnel',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentTunnelEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentTunnelEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentTunnelEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/strace',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentStraceEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentStraceEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentStraceEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'put',
    path: '/api/v3/agent/strace',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errorCodes = [
        {
          code: constants.HTTP_CODE_NOT_FOUND,
          errors: [Errors.NotFoundError]
        },
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        },
        {
          code: constants.HTTP_CODE_BAD_REQUEST,
          errors: [Errors.ValidationError]
        }
      ]

      const updateAgentStraceEndPoint = ResponseDecorator.handleErrors(AgentController.updateAgentStraceEndPoint,
        successCode, errorCodes)
      const responseObject = await updateAgentStraceEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/version',
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

      const getAgentChangeVersionCommandEndPoint = ResponseDecorator.handleErrors(
        AgentController.getAgentChangeVersionCommandEndPoint, successCode, errorCodes)
      const responseObject = await getAgentChangeVersionCommandEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'put',
    path: '/api/v3/agent/hal/hw',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const updateHalHardwareInfoEndPoint = ResponseDecorator.handleErrors(AgentController.updateHalHardwareInfoEndPoint,
        successCode, errorCodes)
      const responseObject = await updateHalHardwareInfoEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'put',
    path: '/api/v3/agent/hal/usb',
    middleware: async (req, res) => {
      logger.apiReq(req)

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

      const updateHalUsbInfoEndPoint = ResponseDecorator.handleErrors(AgentController.updateHalUsbInfoEndPoint,
        successCode, errorCodes)
      const responseObject = await updateHalUsbInfoEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'delete',
    path: '/api/v3/agent/delete-node',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_NO_CONTENT
      const errCodes = [
        {
          code: 401,
          errors: [Errors.AuthenticationError]
        }
      ]

      const deleteNodeEndPoint = ResponseDecorator.handleErrors(AgentController.deleteNodeEndPoint,
        successCode, errCodes)
      const responseObject = await deleteNodeEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/image-snapshot',
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

      const getImageSnapshotEndPoint = ResponseDecorator.handleErrors(AgentController.getImageSnapshotEndPoint,
        successCode, errorCodes)
      const responseObject = await getImageSnapshotEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'put',
    path: '/api/v3/agent/image-snapshot',
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

      const putImageSnapshotEndPoint = ResponseDecorator.handleErrors(AgentController.putImageSnapshotEndPoint,
        successCode, errorCodes)
      const responseObject = await putImageSnapshotEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/cert',
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

      const getControllerCAEndPoint = ResponseDecorator.handleErrors(AgentController.getControllerCAEndPoint,
        successCode, errorCodes)
      const responseObject = await getControllerCAEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/agent/logs/sessions',
    middleware: async (req, res) => {
      logger.apiReq(req)
      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = [
        {
          code: constants.HTTP_CODE_UNAUTHORIZED,
          errors: [Errors.AuthenticationError]
        }
      ]

      const getAgentLogSessionsEndPoint = ResponseDecorator.handleErrors(AgentController.getAgentLogSessionsEndPoint,
        successCode, errorCodes)
      const responseObject = await getAgentLogSessionsEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'ws',
    path: '/api/v3/agent/exec/:microserviceUuid',
    middleware: async (ws, req) => {
      logger.apiReq(req)
      try {
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:' + JSON.stringify({
              error: error.message,
              originalError: 'Missing authentication token'
            }))
          }
          return
        }

        // Set flag to bypass route matching
        // Token validation will be done by validateAgentConnection in handleAgentConnection
        req._rbacAuthorized = true

        // Call handler directly (it will validate the token)
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.microserviceUuid
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleAgentConnection(ws, req, token, microserviceUuid, transaction)
        })()
      } catch (error) {
        logger.error('Error in agent WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.microserviceUuid
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Authentication failed')
          }
        } catch (closeError) {
          logger.error('Error closing agent WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    }
  },
  {
    method: 'ws',
    path: '/api/v3/agent/logs/microservice/:microserviceUuid/:sessionId',
    middleware: async (ws, req) => {
      logger.apiReq(req)
      try {
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:' + JSON.stringify({
              error: error.message,
              originalError: 'Missing authentication token'
            }))
          }
          return
        }

        // Set flag to bypass route matching
        // Token validation will be done by validateAgentLogsConnection in handleAgentLogsConnection
        req._rbacAuthorized = true

        // Call handler directly (it will validate the token)
        const wsServer = WebSocketServer.getInstance()
        const microserviceUuid = req.params.microserviceUuid
        const sessionId = req.params.sessionId
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleAgentLogsConnection(ws, req, token, microserviceUuid, null, sessionId, transaction)
        })()
      } catch (error) {
        logger.error('Error in agent microservice logs WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          microserviceUuid: req.params.microserviceUuid,
          sessionId: req.params.sessionId
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Authentication failed')
          }
        } catch (closeError) {
          logger.error('Error closing agent microservice logs WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    }
  },
  {
    method: 'ws',
    path: '/api/v3/agent/logs/iofog/:iofogUuid/:sessionId',
    middleware: async (ws, req) => {
      logger.apiReq(req)
      try {
        const token = req.headers.authorization
        if (!token) {
          logger.error('WebSocket connection failed: Missing authentication token')
          try {
            ws.close(1008, 'Missing authentication token')
          } catch (error) {
            logger.error('Error closing WebSocket:' + JSON.stringify({
              error: error.message,
              originalError: 'Missing authentication token'
            }))
          }
          return
        }

        // Set flag to bypass route matching
        // Token validation will be done by validateAgentLogsConnection in handleAgentLogsConnection
        req._rbacAuthorized = true

        // Call handler directly (it will validate the token)
        const wsServer = WebSocketServer.getInstance()
        const iofogUuid = req.params.iofogUuid
        const sessionId = req.params.sessionId
        await TransactionDecorator.generateTransaction(async (transaction) => {
          await wsServer.handleAgentLogsConnection(ws, req, token, null, iofogUuid, sessionId, transaction)
        })()
      } catch (error) {
        logger.error('Error in agent fog logs WebSocket connection:' + JSON.stringify({
          error: error.message,
          stack: error.stack,
          url: req.url,
          iofogUuid: req.params.iofogUuid,
          sessionId: req.params.sessionId
        }))
        try {
          if (ws.readyState === ws.OPEN) {
            ws.close(1008, error.message || 'Authentication failed')
          }
        } catch (closeError) {
          logger.error('Error closing agent fog logs WebSocket:' + JSON.stringify({
            error: closeError.message,
            originalError: error.message
          }))
        }
      }
    }
  }
]

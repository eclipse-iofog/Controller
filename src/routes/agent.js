/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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

const Errors = require('../helpers/errors')
const logger = require('../logger')

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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
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

      logger.apiRes({ req: req, res: responseObject })
    }
  },
  {
    method: 'post',
    path: '/api/v3/agent/tracking',
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

      const postTracking = ResponseDecorator.handleErrors(AgentController.postTrackingEndPoint,
        successCode, errorCodes)
      const responseObject = await postTracking(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: responseObject })
    }
  }
]

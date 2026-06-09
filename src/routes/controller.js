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
const Controller = require('../controllers/controller')
const ResponseDecorator = require('../decorators/response-decorator')
const logger = require('../logger')

module.exports = [
  {
    method: 'get',
    path: '/api/v3/status',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = []
      const statusControllerEndPoint = ResponseDecorator.handleErrors(Controller.statusControllerEndPoint, successCode, errorCodes)
      const responseObject = await statusControllerEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  },
  {
    method: 'get',
    path: '/api/v3/fog-types/',
    middleware: async (req, res) => {
      logger.apiReq(req)

      const successCode = constants.HTTP_CODE_SUCCESS
      const errorCodes = []
      const fogTypesEndPoint = ResponseDecorator.handleErrors(Controller.fogTypesEndPoint, successCode, errorCodes)
      const responseObject = await fogTypesEndPoint(req)

      res
        .status(responseObject.code)
        .send(responseObject.body)

      logger.apiRes({ req: req, res: res, responseObject: responseObject })
    }
  }
]

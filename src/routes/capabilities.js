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
const logger = require('../logger')

module.exports = [
  {
    method: 'head',
    path: '/api/v3/capabilities/edgeResources',
    middleware: async (req, res) => {
      logger.apiReq(req)
      res.sendStatus(204)
    }
  },
  {
    method: 'head',
    path: '/api/v3/capabilities/applicationTemplates',
    middleware: async (req, res) => {
      logger.apiReq(req)
      res.sendStatus(204)
    }
  }
]

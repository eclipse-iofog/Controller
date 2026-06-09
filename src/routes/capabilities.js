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
const logger = require('../logger')
const config = require('../config')
const rbacMiddleware = require('../lib/rbac/middleware')

module.exports = [
  {
    method: 'head',
    path: '/api/v3/capabilities/edgeResources',
    middleware: async (req, res) => {
      logger.apiReq(req)

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        res.sendStatus(204)
      })
    }
  },
  {
    method: 'head',
    path: '/api/v3/capabilities/applicationTemplates',
    middleware: async (req, res) => {
      logger.apiReq(req)

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        res.sendStatus(204)
      })
    }
  },
  {
    method: 'head',
    path: '/api/v3/capabilities/nats',
    middleware: async (req, res) => {
      logger.apiReq(req)

      // Add rbacMiddleware.protect middleware to protect the route
      await rbacMiddleware.protect()(req, res, async () => {
        if (config.get('nats.enabled')) {
          res.sendStatus(204)
          return
        }
        res.sendStatus(404)
      })
    }
  }
]

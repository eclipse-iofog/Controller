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

const BaseManager = require('./base-manager')
const models = require('../models')
const RouterConnection = models.RouterConnection
const Router = models.Router

class RouterConnectionManager extends BaseManager {
  getEntity () {
    return RouterConnection
  }

  findAllWithRouters (where, transaction) {
    return RouterConnection.findAll({
      include: [
        {
          model: Router,
          as: 'source',
          required: true,
          attributes: ['iofogUuid', 'host', 'edgeRouterPort', 'interRouterPort', 'messagingPort', 'isEdge', 'isDefault', 'id']
        },
        {
          model: Router,
          as: 'dest',
          required: true,
          attributes: ['iofogUuid', 'host', 'edgeRouterPort', 'interRouterPort', 'messagingPort', 'isEdge', 'isDefault', 'id']
        }
      ],
      where: where
    }, { transaction: transaction })
  }
}

const instance = new RouterConnectionManager()
module.exports = instance

/*
 * *******************************************************************************
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
const MicroservicePort = models.MicroservicePort
const MicroservicePublicPort = models.MicroservicePublicPort
const MicroserviceProxyPort = models.MicroserviceProxyPort

class MicroservicePortManager extends BaseManager {
  getEntity () {
    return MicroservicePort
  }

  findAllPublicPorts (transaction) {
    return MicroservicePort.findAll({
      include: [
        {
          model: MicroservicePublicPort,
          as: 'publicPort',
          required: true,
          attributes: ['queueName', 'publicPort', 'protocol', 'isTcp', 'hostId']
        }
      ],
      where: { isPublic: true },
      attributes: ['microserviceUuid']
    }, { transaction: transaction })
  }

  findAllProxyPorts (transaction) {
    return MicroservicePort.findAll({
      include: [
        {
          model: MicroserviceProxyPort,
          as: 'proxyPort',
          required: true,
          attributes: ['publicPort', 'protocol', 'host']
        }
      ],
      where: { isProxy: true },
      attributes: ['microserviceUuid']
    }, { transaction: transaction })
  }
}

const instance = new MicroservicePortManager()
module.exports = instance

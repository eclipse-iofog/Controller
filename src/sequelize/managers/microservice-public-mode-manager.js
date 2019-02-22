/*
 *  *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const BaseManager = require('../managers/base-manager')
const models = require('./../models')
const MicroservicePublicMode = models.MicroservicePublicMode
const ConnectorPort = models.ConnectorPort

class MicroservicePublicModeManager extends BaseManager {
  getEntity() {
    return MicroservicePublicMode
  }

  findAllMicroservicePublicModesByConnectorId(connectorId, transaction) {
    return MicroservicePublicMode.findAll({
      include: [
        {
          model: ConnectorPort,
          as: 'connectorPort',
          required: true,
        },
      ],
      where: {
        '$connectorPort.connector_id$': connectorId,
      },
    }, {transaction: transaction})
  }
}

const instance = new MicroservicePublicModeManager()
module.exports = instance

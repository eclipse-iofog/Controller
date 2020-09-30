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
const Routing = models.Routing

class RoutingManager extends BaseManager {
  getEntity () {
    return Routing
  }

  findOnePopulated (where, transaction) {
    return Routing.findOne({
      include: [
        {
          model: models.Microservice,
          as: 'sourceMicroservice',
          required: true,
          attributes: ['name', 'uuid', 'iofogUuid']
        },
        {
          model: models.Microservice,
          as: 'destMicroservice',
          required: true,
          attributes: ['name', 'uuid', 'iofogUuid']
        },
        {
          model: models.Application,
          as: 'application',
          required: true,
          attributes: ['name', 'id']
        }
      ],
      where
    })
  }

  findAllPopulated (where, transaction) {
    return Routing.findAll({
      include: [
        {
          model: models.Microservice,
          as: 'sourceMicroservice',
          required: true,
          attributes: ['name', 'uuid', 'iofogUuid']
        },
        {
          model: models.Microservice,
          as: 'destMicroservice',
          required: true,
          attributes: ['name', 'uuid', 'iofogUuid']
        },
        {
          model: models.Application,
          as: 'application',
          required: true,
          attributes: ['name', 'id']
        }
      ],
      where
    })
  }
}

const instance = new RoutingManager()
module.exports = instance

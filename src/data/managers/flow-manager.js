/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const Flow = models.Flow
const Microservice = models.Microservice

class FlowManager extends BaseManager {
  getEntity () {
    return Flow
  }

  async findFlowMicroservices (where, transaction) {
    return Flow.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false
        }
      ],
      where: where,
      attributes: ['id']
    }, { transaction: transaction })
  }

  async findAllWithAttributes (where, attributes, transaction) {
    return Flow.findAll({
      where: where,
      attributes: attributes },
    { transaction: transaction })
  }

  async findOneWithAttributes (where, attributes, transaction) {
    return Flow.findOne({
      where: where,
      attributes: attributes
    },
    { transaction: transaction })
  }
}

const instance = new FlowManager()
module.exports = instance

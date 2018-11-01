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

const BaseManager = require('./base-manager');
const models = require('./../models');
const Flow = models.Flow;
const Microservice = models.Microservice;
const sequelize = require('sequelize');

class FlowManager extends BaseManager {
  getEntity() {
    return Flow
  }

  async findFlowMicroservices(where, transaction) {
    return Flow.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservices',
          required: false,
          attributes: ['iofogUuid']
        }
      ],
      where: where,
      attributes: ['id']
    }, {transaction: transaction})
  }

  async findAllExcludeFields(where, transaction) {
    return Flow.findAll({
      where: where,
      attributes: {
        exclude: [
          'created_at',
          'updated_at',
          'updatedById',
          'userId'
        ]}}, {transaction: transaction})
  }
}


const instance = new FlowManager();
module.exports = instance;
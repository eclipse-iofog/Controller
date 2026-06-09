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

const BaseManager = require('./base-manager')
const models = require('../models')
const MicroserviceExecStatus = models.MicroserviceExecStatus

const microserviceExecStatusExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid',
  'created_at',
  'updated_at'
]

class MicroserviceExecStatusManager extends BaseManager {
  getEntity () {
    return MicroserviceExecStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: microserviceExecStatusExcludedFields }, transaction)
  }
}

const instance = new MicroserviceExecStatusManager()
module.exports = instance

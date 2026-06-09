/*
 * *******************************************************************************
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
const MicroserviceCapDrop = models.MicroserviceCapDrop

const MicroserviceCapDropExcludedFields = [
  'id',
  'microservice_uuid',
  'microserviceUuid'
]

class MicroserviceCapDropManager extends BaseManager {
  getEntity () {
    return MicroserviceCapDrop
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: MicroserviceCapDropExcludedFields }, transaction)
  }
}

const instance = new MicroserviceCapDropManager()
module.exports = instance

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
const FogLogStatus = models.FogLogStatus

const fogLogStatusExcludedFields = [
  'id',
  'iofog_uuid',
  'iofogUuid',
  'created_at',
  'updated_at'
]

class FogLogStatusManager extends BaseManager {
  getEntity () {
    return FogLogStatus
  }

  findAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: fogLogStatusExcludedFields }, transaction)
  }
}

const instance = new FogLogStatusManager()
module.exports = instance

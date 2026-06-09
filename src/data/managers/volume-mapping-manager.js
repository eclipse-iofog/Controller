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
const VolumeMapping = models.VolumeMapping

class VolumeMappingManager extends BaseManager {
  getEntity () {
    return VolumeMapping
  }

  findAll (where, transaction) {
    return VolumeMapping.findAll({
      where: where,
      attributes: ['hostDestination', 'containerDestination', 'accessMode', 'id', 'type']
    }, { transaction: transaction })
  }
}

const instance = new VolumeMappingManager()
module.exports = instance

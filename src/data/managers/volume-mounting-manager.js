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
const VolumeMount = models.VolumeMount

const volumeMountExcludedFields = [
  'created_at',
  'updated_at'
]

class VolumeMountingManager extends BaseManager {
  getEntity () {
    return VolumeMount
  }

  getAllExcludeFields (where, transaction) {
    return this.findAllWithAttributes(where, { exclude: volumeMountExcludedFields }, transaction)
  }

  getAll (where, transaction) {
    return VolumeMount.findAll({
      where: where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName']
    }, { transaction: transaction })
  }

  getOne (where, transaction) {
    return VolumeMount.findOne({
      where: where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction: transaction })
  }

  findOne (where, transaction) {
    return VolumeMount.findOne({
      where: where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction: transaction })
  }

  findAll (where, transaction) {
    return VolumeMount.findAll({
      where: where,
      attributes: ['uuid', 'name', 'configMapName', 'secretName', 'version']
    }, { transaction: transaction })
  }
}

const instance = new VolumeMountingManager()
module.exports = instance

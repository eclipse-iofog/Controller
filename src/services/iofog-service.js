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

const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const FogManager = require('../sequelize/managers/iofog-manager')
const Errors = require('../helpers/errors')
const ObjBuilder = require('../helpers/object-builder')

async function _createFog(newFog, user, transaction) {
  AppHelper.validateFields(newFog, ['name', 'fogType'])
  _validateLatLon(newFog.latitude, newFog.longitude)

  const ob = new ObjBuilder()
  const createFogData = ob
    .pushRequiredFieldWithCondition('uuid', newFog.uuid, newFog.uuid, AppHelper.generateRandomString(32))
    .pushFieldIfValExists('name', newFog.name)
    .pushFieldIfValExists('location', newFog.location)
    .pushFieldIfValExists('latitude', newFog.latitude)
    .pushFieldIfValExists('longitude', newFog.longitude)
    .pushOptionalFieldWithCondition('gpsMode', newFog.latitude || newFog.longitude, 'manual')
    .pushFieldIfValExists('description', newFog.description)
    .pushFieldIfValExists('dockerUrl', newFog.dockerUrl)
    .pushFieldIfValExists('diskLimit', newFog.diskLimit)
    .pushFieldIfValExists('diskDirectory', newFog.diskDirectory)
    .pushFieldIfValExists('memoryLimit', newFog.memoryLimit)
    .pushFieldIfValExists('cpuLimit', newFog.cpuLimit)
    .pushFieldIfValExists('logLimit', newFog.logLimit)
    .pushFieldIfValExists('logLimit', newFog.logLimit)
    .pushFieldIfValExists('logDirectory', newFog.logDirectory)
    .pushFieldIfValExists('logFileCount', newFog.logFileCount)
    .pushFieldIfValExists('statusFrequency', newFog.statusFrequency)
    .pushFieldIfValExists('changeFrequency', newFog.changeFrequency)
    .pushFieldIfValExists('deviceScanFrequency', newFog.deviceScanFrequency)
    .pushFieldIfValExists('bluetooth', newFog.bluetoothEnabled)
    .pushFieldIfValExists('isolatedDockerContainer', newFog.watchdogEnabled)
    .pushFieldIfValExists('hal', newFog.abstractedHardwareEnabled)
    .pushFieldIfValExists('fogTypeId', newFog.fogType)
    .pushFieldIfValExists('userId', user.id)
    .popObj()

  const fog = await FogManager.create(createFogData, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}

async function _updateFog(updateFog, user, transaction) {
  AppHelper.validateFields(updateFog, ['uuid'])
  _validateLatLon(updateFog.latitude, updateFog.longitude)

  const queryFogData = {
    uuid: updateFog.uuid
  }

  const ob = new ObjBuilder()
  const updateFogData = ob
    .pushRequiredFieldWithCondition('uuid', newFog.uuid, newFog.uuid, AppHelper.generateRandomString(32))
    .pushFieldIfValExists('name', newFog.name)
    .pushFieldIfValExists('location', newFog.location)
    .pushFieldIfValExists('latitude', newFog.latitude)
    .pushFieldIfValExists('longitude', newFog.longitude)
    .pushOptionalFieldWithCondition('gpsMode', newFog.latitude || newFog.longitude, 'manual')
    .pushFieldIfValExists('description', newFog.description)
    .pushFieldIfValExists('dockerUrl', newFog.dockerUrl)
    .pushFieldIfValExists('diskLimit', newFog.diskLimit)
    .pushFieldIfValExists('diskDirectory', newFog.diskDirectory)
    .pushFieldIfValExists('memoryLimit', newFog.memoryLimit)
    .pushFieldIfValExists('cpuLimit', newFog.cpuLimit)
    .pushFieldIfValExists('logLimit', newFog.logLimit)
    .pushFieldIfValExists('logLimit', newFog.logLimit)
    .pushFieldIfValExists('logDirectory', newFog.logDirectory)
    .pushFieldIfValExists('logFileCount', newFog.logFileCount)
    .pushFieldIfValExists('statusFrequency', newFog.statusFrequency)
    .pushFieldIfValExists('changeFrequency', newFog.changeFrequency)
    .pushFieldIfValExists('deviceScanFrequency', newFog.deviceScanFrequency)
    .pushFieldIfValExists('bluetooth', newFog.bluetoothEnabled)
    .pushFieldIfValExists('isolatedDockerContainer', newFog.watchdogEnabled)
    .pushFieldIfValExists('hal', newFog.abstractedHardwareEnabled)
    .pushFieldIfValExists('fogTypeId', newFog.fogType)
    .pushFieldIfValExists('userId', user.id)
    .popObj()

  const fog = await FogManager.update(queryFogData, updateFogData, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}

function _validateLatLon(lat, lon) {
  if (lat && lon) {
    if (lat > 90 || lat < -90
      || lon > 180 || lon < -180) {
      throw new Errors.ValidationError('incorrect gps coordinates')
    }
  }
}

module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog),
  updateFogWithTransaction: TransactionDecorator.generateTransaction(_updateFog)
}
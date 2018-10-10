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
    .pushFieldIfValExists('name', updateFog.name)
    .pushFieldIfValExists('location', updateFog.location)
    .pushFieldIfValExists('latitude', updateFog.latitude)
    .pushFieldIfValExists('longitude', updateFog.longitude)
    .pushOptionalFieldWithCondition('gpsMode', updateFog.latitude || updateFog.longitude, 'manual')
    .pushFieldIfValExists('description', updateFog.description)
    .pushFieldIfValExists('dockerUrl', updateFog.dockerUrl)
    .pushFieldIfValExists('diskLimit', updateFog.diskLimit)
    .pushFieldIfValExists('diskDirectory', updateFog.diskDirectory)
    .pushFieldIfValExists('memoryLimit', updateFog.memoryLimit)
    .pushFieldIfValExists('cpuLimit', updateFog.cpuLimit)
    .pushFieldIfValExists('logLimit', updateFog.logLimit)
    .pushFieldIfValExists('logLimit', updateFog.logLimit)
    .pushFieldIfValExists('logDirectory', updateFog.logDirectory)
    .pushFieldIfValExists('logFileCount', updateFog.logFileCount)
    .pushFieldIfValExists('statusFrequency', updateFog.statusFrequency)
    .pushFieldIfValExists('changeFrequency', updateFog.changeFrequency)
    .pushFieldIfValExists('deviceScanFrequency', updateFog.deviceScanFrequency)
    .pushFieldIfValExists('bluetooth', updateFog.bluetoothEnabled)
    .pushFieldIfValExists('isolatedDockerContainer', updateFog.watchdogEnabled)
    .pushFieldIfValExists('hal', updateFog.abstractedHardwareEnabled)
    .pushFieldIfValExists('fogTypeId', updateFog.fogType)
    .pushFieldIfValExists('userId', user.id)
    .popObj()

  try {
    await FogManager.findOneAndUpdate(queryFogData, updateFogData, transaction)
  } catch (e) {
    if (e instanceof Errors.ModelNotFoundError) {
      throw new Errors.NotFoundError('Invalid Fog Node Id')
    }
    throw e
  }
}

async function _deleteFog(deleteFog, user, transaction) {
  AppHelper.validateFields(deleteFog, ['uuid'])

  const queryFogData = {
    uuid: deleteFog.uuid
  }

  try {
    await FogManager.findOneAndDelete(queryFogData, transaction)
  } catch (e) {
    if (e instanceof Errors.ModelNotFoundError) {
      throw new Errors.NotFoundError('Invalid Fog Node Id')
    }
    throw e
  }
}

async function _getFog(getFog, user, transaction) {
  AppHelper.validateFields(getFog, ['uuid'])

  const queryFogData = {
    uuid: getFog.uuid
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  return fog
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
  updateFogWithTransaction: TransactionDecorator.generateTransaction(_updateFog),
  deleteFogWithTransaction: TransactionDecorator.generateTransaction(_deleteFog),
  getFogWithTransaction: TransactionDecorator.generateTransaction(_getFog),
}
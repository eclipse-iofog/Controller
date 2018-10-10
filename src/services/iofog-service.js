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
const FogProvisionKeyManager = require('../sequelize/managers/iofog-provision-key-manager')
const FogVersionCommandManager = require('../sequelize/managers/iofog-version-command-manager')
const Errors = require('../helpers/errors')
const ObjBuilder = require('../helpers/object-builder')

async function _createFog(fogData, user, transaction) {
  AppHelper.validateFields(fogData, ['name', 'fogType'])
  _validateLatLon(fogData.latitude, fogData.longitude)

  const ob = new ObjBuilder()
  const createFogData = ob
    .pushRequiredFieldWithCondition('uuid', fogData.uuid, fogData.uuid, AppHelper.generateRandomString(32))
    .pushFieldIfValExists('name', fogData.name)
    .pushFieldIfValExists('location', fogData.location)
    .pushFieldIfValExists('latitude', fogData.latitude)
    .pushFieldIfValExists('longitude', fogData.longitude)
    .pushOptionalFieldWithCondition('gpsMode', fogData.latitude || fogData.longitude, 'manual')
    .pushFieldIfValExists('description', fogData.description)
    .pushFieldIfValExists('dockerUrl', fogData.dockerUrl)
    .pushFieldIfValExists('diskLimit', fogData.diskLimit)
    .pushFieldIfValExists('diskDirectory', fogData.diskDirectory)
    .pushFieldIfValExists('memoryLimit', fogData.memoryLimit)
    .pushFieldIfValExists('cpuLimit', fogData.cpuLimit)
    .pushFieldIfValExists('logLimit', fogData.logLimit)
    .pushFieldIfValExists('logLimit', fogData.logLimit)
    .pushFieldIfValExists('logDirectory', fogData.logDirectory)
    .pushFieldIfValExists('logFileCount', fogData.logFileCount)
    .pushFieldIfValExists('statusFrequency', fogData.statusFrequency)
    .pushFieldIfValExists('changeFrequency', fogData.changeFrequency)
    .pushFieldIfValExists('deviceScanFrequency', fogData.deviceScanFrequency)
    .pushFieldIfValExists('bluetooth', fogData.bluetoothEnabled)
    .pushFieldIfValExists('isolatedDockerContainer', fogData.watchdogEnabled)
    .pushFieldIfValExists('hal', fogData.abstractedHardwareEnabled)
    .pushFieldIfValExists('fogTypeId', fogData.fogType)
    .pushFieldIfValExists('userId', user.id)
    .popObj()

  const fog = await FogManager.create(createFogData, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}

async function _updateFog(fogData, user, transaction) {
  AppHelper.validateFields(fogData, ['uuid'])
  _validateLatLon(fogData.latitude, fogData.longitude)

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }

  const ob = new ObjBuilder()
  const updateFogData = ob
    .pushFieldIfValExists('name', fogData.name)
    .pushFieldIfValExists('location', fogData.location)
    .pushFieldIfValExists('latitude', fogData.latitude)
    .pushFieldIfValExists('longitude', fogData.longitude)
    .pushOptionalFieldWithCondition('gpsMode', fogData.latitude || fogData.longitude, 'manual')
    .pushFieldIfValExists('description', fogData.description)
    .pushFieldIfValExists('dockerUrl', fogData.dockerUrl)
    .pushFieldIfValExists('diskLimit', fogData.diskLimit)
    .pushFieldIfValExists('diskDirectory', fogData.diskDirectory)
    .pushFieldIfValExists('memoryLimit', fogData.memoryLimit)
    .pushFieldIfValExists('cpuLimit', fogData.cpuLimit)
    .pushFieldIfValExists('logLimit', fogData.logLimit)
    .pushFieldIfValExists('logLimit', fogData.logLimit)
    .pushFieldIfValExists('logDirectory', fogData.logDirectory)
    .pushFieldIfValExists('logFileCount', fogData.logFileCount)
    .pushFieldIfValExists('statusFrequency', fogData.statusFrequency)
    .pushFieldIfValExists('changeFrequency', fogData.changeFrequency)
    .pushFieldIfValExists('deviceScanFrequency', fogData.deviceScanFrequency)
    .pushFieldIfValExists('bluetooth', fogData.bluetoothEnabled)
    .pushFieldIfValExists('isolatedDockerContainer', fogData.watchdogEnabled)
    .pushFieldIfValExists('hal', fogData.abstractedHardwareEnabled)
    .pushFieldIfValExists('fogTypeId', fogData.fogType)
    .popObj()

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  await FogManager.update(queryFogData, updateFogData, transaction)
}

async function _deleteFog(fogData, user, transaction) {
  AppHelper.validateFields(fogData, ['uuid'])

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  await FogManager.delete(queryFogData, transaction)
}

async function _getFog(getFog, user, transaction) {
  AppHelper.validateFields(getFog, ['uuid'])

  const queryFogData = {
    uuid: getFog.uuid,
    userId: user.id
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  return fog
}

async function _generateProvisioningKey(fogData, user, transaction) {
  AppHelper.validateFields(fogData, ['uuid'])

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }

  const newProvision = {
    iofogUuid: fogData.uuid,
    provisionKey: AppHelper.generateRandomString(8),
    expirationTime: new Date().getTime() + (20 * 60 * 1000)
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  const provisioningKeyData = await FogProvisionKeyManager.updateOrCreate({iofogUuid: fogData.uuid}, newProvision, transaction)

  const res = {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime
  }

  return res
}

async function _setFogVersionCommand(fogVersionData, user, transaction) {
  AppHelper.validateFields(fogVersionData, ['uuid', 'versionCommand'])
  _validateVersionCommand(fogVersionData.versionCommand)

  const queryFogData = {
    uuid: fogVersionData.uuid,
    userId: user.id
  }
  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }

  await FogVersionCommandManager.updateOrCreate({iofogUuid: fogVersionData.uuid}, newVersionCommand, transaction)
}

function _validateLatLon(lat, lon) {
  if (lat && lon) {
    if (lat > 90 || lat < -90
      || lon > 180 || lon < -180) {
      throw new Errors.ValidationError('incorrect gps coordinates')
    }
  }
}

function _validateVersionCommand(command) {
  if (command !== 'upgrade' && command !== 'rollback') {
    throw new Errors.ValidationError('incorrect version command')
  }
}

module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog),
  updateFogWithTransaction: TransactionDecorator.generateTransaction(_updateFog),
  deleteFogWithTransaction: TransactionDecorator.generateTransaction(_deleteFog),
  getFogWithTransaction: TransactionDecorator.generateTransaction(_getFog),
  generateProvisioningKeyWithTransaction: TransactionDecorator.generateTransaction(_generateProvisioningKey),
  setFogVersionCommandWithTransaction: TransactionDecorator.generateTransaction(_setFogVersionCommand)
}
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
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager')
const Errors = require('../helpers/errors')
const Validator = require('../schemas')

async function _createFog(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogCreate)

  let createFogData = {
    uuid: fogData.uuid ? fogData.uuid : AppHelper.generateRandomString(32),
    name: fogData.name,
    location: fogData.location,
    latitude: fogData.latitude,
    longitude: fogData.longitude,
    gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
    description: fogData.description,
    dockerUrl: fogData.dockerUrl,
    diskLimit: fogData.diskLimit,
    diskDirectory: fogData.diskDirectory,
    memoryLimit: fogData.memoryLimit,
    cpuLimit: fogData.cpuLimit,
    logLimit: fogData.logLimit,
    logDirectory: fogData.logDirectory,
    logFileCount: fogData.logFileCount,
    statusFrequency: fogData.statusFrequency,
    changeFrequency: fogData.changeFrequency,
    deviceScanFrequency: fogData.deviceScanFrequency,
    bluetoothEnabled: fogData.bluetoothEnabled,
    watchdogEnabled: fogData.watchdogEnabled,
    abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
    fogTypeId: fogData.fogType,
    userId: user.id
  }
  createFogData = AppHelper.deleteUndefinedFields(createFogData)

  const fog = await FogManager.create(createFogData, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}

async function _updateFog(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogUpdate)

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }

  let updateFogData = {
    name: fogData.name,
    location: fogData.location,
    latitude: fogData.latitude,
    longitude: fogData.longitude,
    gpsMode: fogData.latitude || fogData.longitude ? 'manual' : undefined,
    description: fogData.description,
    dockerUrl: fogData.dockerUrl,
    diskLimit: fogData.diskLimit,
    diskDirectory: fogData.diskDirectory,
    memoryLimit: fogData.memoryLimit,
    cpuLimit: fogData.cpuLimit,
    logLimit: fogData.logLimit,
    logDirectory: fogData.logDirectory,
    logFileCount: fogData.logFileCount,
    statusFrequency: fogData.statusFrequency,
    changeFrequency: fogData.changeFrequency,
    deviceScanFrequency: fogData.deviceScanFrequency,
    bluetoothEnabled: fogData.bluetoothEnabled,
    watchdogEnabled: fogData.watchdogEnabled,
    abstractedHardwareEnabled: fogData.abstractedHardwareEnabled,
    fogTypeId: fogData.fogType,
  }
  updateFogData = AppHelper.deleteUndefinedFields(updateFogData)

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  await FogManager.update(queryFogData, updateFogData, transaction)
}

async function _deleteFog(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogDelete)

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

async function _getFog(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGet)

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }
  return fog
}

async function _getFogList(filters, user, transaction) {
  await Validator.validate(filters, Validator.schemas.iofogFilters)

  const queryFogData = {
    userId: user.id
  }

  let fogs = await FogManager.findAll(queryFogData, transaction)
  fogs = _filterFogs(fogs, filters)
  return fogs
}

async function _generateProvisioningKey(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision)

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
  await Validator.validate(fogVersionData, Validator.schemas.iofogSetVersionCommand)

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

async function _setFogRebootCommand(fogData, user, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogReboot)

  const queryFogData = {
    uuid: fogData.uuid,
    userId: user.id
  }
  const newRebootCommand = {
    iofogUuid: fogData.uuid,
    reboot: true
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError('Invalid Fog Node Id')
  }

  await ChangeTrackingManager.updateOrCreate({iofogUuid: fogData.uuid}, newRebootCommand, transaction)
}

function _filterFogs(fogs, filters) {
  if (!filters) {
    return fogs
  }

  const filtered = []
  fogs.forEach((fog) => {
    let isMatchFog = true
    filters.some((filter) => {
      let fld = filter.key,
          val = filter.value,
          condition = filter.condition;
      let isMatchField = (condition === 'equals' && fog[fld] && fog[fld] === val)
        || (condition === 'has' && fog[fld] && fog[fld].includes(val));
      if (!isMatchField) {
        isMatchFog = false;
        return false
      }
    })
    if (isMatchFog) {
      filtered.push(fog)
    }
  })
  return filtered
}

module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog),
  updateFogWithTransaction: TransactionDecorator.generateTransaction(_updateFog),
  deleteFogWithTransaction: TransactionDecorator.generateTransaction(_deleteFog),
  getFogWithTransaction: TransactionDecorator.generateTransaction(_getFog),
  getFogListWithTransaction: TransactionDecorator.generateTransaction(_getFogList),
  generateProvisioningKeyWithTransaction: TransactionDecorator.generateTransaction(_generateProvisioningKey),
  setFogVersionCommandWithTransaction: TransactionDecorator.generateTransaction(_setFogVersionCommand),
  setFogRebootCommandWithTransaction: TransactionDecorator.generateTransaction(_setFogRebootCommand)
}
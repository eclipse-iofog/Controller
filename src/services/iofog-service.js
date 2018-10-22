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

const TransactionDecorator = require('../decorators/transaction-decorator');
const AppHelper = require('../helpers/app-helper');
const FogManager = require('../sequelize/managers/iofog-manager');
const FogProvisionKeyManager = require('../sequelize/managers/iofog-provision-key-manager');
const FogVersionCommandManager = require('../sequelize/managers/iofog-version-command-manager');
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validator = require('../schemas');
const HWInfoManager = require('../sequelize/managers/hw-info-manager');
const USBInfoManager = require('../sequelize/managers/usb-info-manager');

async function _createFog(fogData, user, isCli, transaction) {
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

  await ChangeTrackingManager.create({iofogUuid: fog.uuid}, transaction)
  //TODO: finish after microservices endpoints will be added. implement bluetooth, hal and watchdog
  return res
}

async function _updateFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogUpdate)

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id}

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

  const changeTrackingUpdates = {
    iofogUuid: fogData.uuid,
    config: true,
    containerList: true
  }

  const affectedRows = await FogManager.update(queryFogData, updateFogData, transaction)
  if (affectedRows[0] === 0) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }
  await ChangeTrackingManager.update({iofogUuid: fogData.uuid}, changeTrackingUpdates, transaction)
  //TODO: finish after microservices endpoints will be added. implement bluetooth, hal and watchdog
}

async function _deleteFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogDelete)

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id}

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }
  await _updateFogsConnectionStatus(fog, transaction)
  await _processDeleteCommand(fog, transaction)
}

async function _getFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGet)

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id}

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }
  await _updateFogsConnectionStatus(fog, transaction)

  return fog
}

async function _getFogList(filters, user, isCli, transaction) {
  await Validator.validate(filters, Validator.schemas.iofogFilters)

  const queryFogData = isCli
    ? {}
    : {userId: user.id}

  let fogs = await FogManager.findAll(queryFogData, transaction)
  fogs = _filterFogs(fogs, filters)
  for (const fog of fogs) {
    await _updateFogsConnectionStatus(fog, transaction)
  }
  return fogs
}

async function _generateProvisioningKey(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision)

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id}

  const newProvision = {
    iofogUuid: fogData.uuid,
    provisionKey: AppHelper.generateRandomString(8),
    expirationTime: new Date().getTime() + (20 * 60 * 1000)
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }
  const provisioningKeyData = await FogProvisionKeyManager.updateOrCreate({iofogUuid: fogData.uuid}, newProvision, transaction)

  const res = {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime
  }

  return res
}

async function _setFogVersionCommand(fogVersionData, user, isCli, transaction) {
  await Validator.validate(fogVersionData, Validator.schemas.iofogSetVersionCommand)

  const queryFogData = isCli
    ? {uuid: fogVersionData.uuid}
    : {uuid: fogVersionData.uuid, userId: user.id}

  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand
  }

  const changeTrackingUpdates = {
    iofogUuid: fogVersionData.uuid,
    version: true
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }

  await _generateProvisioningKey({uuid: fogVersionData.uuid}, user, isCli, transaction)
  await FogVersionCommandManager.updateOrCreate({iofogUuid: fogVersionData.uuid}, newVersionCommand, transaction)
  await ChangeTrackingManager.update({iofogUuid: fogVersionData.uuid}, changeTrackingUpdates, transaction)
}

async function _setFogRebootCommand(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogReboot)

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id}

  const newRebootCommand = {
    iofogUuid: fogData.uuid,
    reboot: true
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, fogData.uuid))
  }

  await ChangeTrackingManager.update({iofogUuid: fogData.uuid}, newRebootCommand, transaction)
}

async function _getHalHardwareInfo(uuidObj, user, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet);

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid
  }, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, uuidObj.uuid));
  }

  return await HWInfoManager.findOne({
    iofogUuid: uuidObj.uuid
  }, transaction);
}

async function _getHalUsbInfo(uuidObj, user, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet);

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid
  }, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_ID, uuidObj.uuid));
  }

  return await USBInfoManager.findOne({
    iofogUuid: uuidObj.uuid
  }, transaction);
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

async function _updateFogsConnectionStatus(fog, transaction) {
  const minInMs = 60000
  const intervalInMs = fog.statusFrequency > minInMs ? fog.statusFrequency * 2 : minInMs
  if (fog.daemonStatus !== 'UNKNOWN' && Date.now() - fog.lastStatusTime > intervalInMs) {
    fog.daemonStatus = 'UNKNOWN'
    fog.ipAddress = '0.0.0.0'
    const queryFogData = {uuid: fog.uuid}
    const toUpdate = {daemonStatus: fog.daemonStatus, ipAddress: fog.ipAddress}
    await FogManager.update(queryFogData, toUpdate, transaction)
  }
}

async function _processDeleteCommand(fog, transaction) {
  if (!fog.daemonStatus || fog.daemonStatus === 'UNKNOWN') {
    await FogManager.delete({uuid: fog.uuid}, transaction)
  } else {
    await ChangeTrackingManager.update({iofogUuid: fog.uuid}, {
      iofogUuid: fog.uuid,
      deleteNode: true
    }, transaction)
  }
}

module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog),
  updateFogWithTransaction: TransactionDecorator.generateTransaction(_updateFog),
  deleteFogWithTransaction: TransactionDecorator.generateTransaction(_deleteFog),
  getFogWithTransaction: TransactionDecorator.generateTransaction(_getFog),
  getFogListWithTransaction: TransactionDecorator.generateTransaction(_getFogList),
  generateProvisioningKeyWithTransaction: TransactionDecorator.generateTransaction(_generateProvisioningKey),
  setFogVersionCommandWithTransaction: TransactionDecorator.generateTransaction(_setFogVersionCommand),
  setFogRebootCommandWithTransaction: TransactionDecorator.generateTransaction(_setFogRebootCommand),
  getHalHardwareInfo: TransactionDecorator.generateTransaction(_getHalHardwareInfo),
  getHalUsbInfo: TransactionDecorator.generateTransaction(_getHalUsbInfo)
};
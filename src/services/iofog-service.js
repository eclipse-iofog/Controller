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

const config = require('../config')
const request = require('request-promise')

const TransactionDecorator = require('../decorators/transaction-decorator')
const AppHelper = require('../helpers/app-helper')
const FogManager = require('../sequelize/managers/iofog-manager')
const FogProvisionKeyManager = require('../sequelize/managers/iofog-provision-key-manager')
const FogVersionCommandManager = require('../sequelize/managers/iofog-version-command-manager')
const ChangeTrackingService = require('./change-tracking-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas')
const HWInfoManager = require('../sequelize/managers/hw-info-manager')
const USBInfoManager = require('../sequelize/managers/usb-info-manager')
const CatalogService = require('../services/catalog-service')
const MicroserviceManager = require('../sequelize/managers/microservice-manager')
const FogStates = require('../enums/fog-state')
const TrackingDecorator = require('../decorators/tracking-decorator')
const TrackingEventType = require('../enums/tracking-event-type')

async function createFogEndPoint(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogCreate)

  let createFogData = {
    uuid: AppHelper.generateRandomString(32),
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
    userId: user.id,
  }
  createFogData = AppHelper.deleteUndefinedFields(createFogData)

  const fog = await FogManager.create(createFogData, transaction)

  const res = {
    uuid: fog.uuid,
  }

  await ChangeTrackingService.create(fog.uuid, transaction)

  if (fogData.abstractedHardwareEnabled) {
    await _createHalMicroserviceForFog(fog, null, user, transaction)
  }

  if (fogData.bluetoothEnabled) {
    await _createBluetoothMicroserviceForFog(fog, null, user, transaction)
  }

  await ChangeTrackingService.update(createFogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction)

  try {
    await informKubelet(fog.uuid, 'POST')
  } catch (e) {}

  return res
}

async function updateFogEndPoint(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogUpdate)

  const queryFogData = isCLI
    ? { uuid: fogData.uuid }
    : { uuid: fogData.uuid, userId: user.id }

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

  const oldFog = await FogManager.findOne(queryFogData, transaction)
  if (!oldFog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  await FogManager.update(queryFogData, updateFogData, transaction)
  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.config, transaction)

  let msChanged = false

  if (oldFog.abstractedHardwareEnabled === true && fogData.abstractedHardwareEnabled === false) {
    await _deleteHalMicroserviceByFog(fogData, transaction)
    msChanged = true
  }
  if (oldFog.abstractedHardwareEnabled === false && fogData.abstractedHardwareEnabled === true) {
    await _createHalMicroserviceForFog(fogData, oldFog, user, transaction)
    msChanged = true
  }

  if (oldFog.bluetoothEnabled === true && fogData.bluetoothEnabled === false) {
    await _deleteBluetoothMicroserviceByFog(fogData, transaction)
    msChanged = true
  }
  if (oldFog.bluetoothEnabled === false && fogData.bluetoothEnabled === true) {
    await _createBluetoothMicroserviceForFog(fogData, oldFog, user, transaction)
    msChanged = true
  }

  if (msChanged) {
    await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

async function deleteFogEndPoint(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogDelete)

  const queryFogData = isCLI
    ? { uuid: fogData.uuid }
    : { uuid: fogData.uuid, userId: user.id }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  await _processDeleteCommand(fog, transaction)

  try {
    await informKubelet(fog.uuid, 'DELETE')
  } catch (e) {}
}

async function getFog(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGet)

  const queryFogData = isCLI
    ? { uuid: fogData.uuid }
    : { uuid: fogData.uuid, userId: user.id }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  return fog
}

async function getFogEndPoint(fogData, user, isCLI, transaction) {
  return await getFog(fogData, user, isCLI, transaction)
}

async function getFogListEndPoint(filters, user, isCLI, transaction) {
  await Validator.validate(filters, Validator.schemas.iofogFilters)

  const queryFogData = isCLI
    ? {}
    : { userId: user.id }

  let fogs = await FogManager.findAll(queryFogData, transaction)
  fogs = _filterFogs(fogs, filters)

  return {
    fogs: fogs,
  }
}

async function generateProvisioningKeyEndPoint(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision)

  const queryFogData = isCLI
    ? { uuid: fogData.uuid }
    : { uuid: fogData.uuid, userId: user.id }

  const newProvision = {
    iofogUuid: fogData.uuid,
    provisionKey: AppHelper.generateRandomString(8),
    expirationTime: new Date().getTime() + (20 * 60 * 1000),
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }
  const provisioningKeyData = await FogProvisionKeyManager.updateOrCreate({ iofogUuid: fogData.uuid }, newProvision, transaction)

  return {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime,
  }
}

async function setFogVersionCommandEndPoint(fogVersionData, user, isCLI, transaction) {
  await Validator.validate(fogVersionData, Validator.schemas.iofogSetVersionCommand)

  const queryFogData = isCLI
    ? { uuid: fogVersionData.uuid }
    : { uuid: fogVersionData.uuid, userId: user.id }

  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand,
  }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  if (!fog.isReadyToRollback && fogVersionData.versionCommand === 'rollback') {
    throw new Errors.ValidationError(ErrorMessages.INVALID_VERSION_COMMAND_ROLLBACK)
  }
  if (!fog.isReadyToUpgrade && fogVersionData.versionCommand === 'upgrade') {
    throw new Errors.ValidationError(ErrorMessages.INVALID_VERSION_COMMAND_UPGRADE)
  }

  await generateProvisioningKeyEndPoint({ uuid: fogVersionData.uuid }, user, isCLI, transaction)
  await FogVersionCommandManager.updateOrCreate({ iofogUuid: fogVersionData.uuid }, newVersionCommand, transaction)
  await ChangeTrackingService.update(fogVersionData.uuid, ChangeTrackingService.events.version, transaction)
}

async function setFogRebootCommandEndPoint(fogData, user, isCLI, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogReboot)

  const queryFogData = isCLI
    ? { uuid: fogData.uuid }
    : { uuid: fogData.uuid, userId: user.id }

  const fog = await FogManager.findOne(queryFogData, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, fogData.uuid))
  }

  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.reboot, transaction)
}

async function getHalHardwareInfoEndPoint(uuidObj, user, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet)

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid,
  }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuidObj.uuid))
  }

  return await HWInfoManager.findOne({
    iofogUuid: uuidObj.uuid,
  }, transaction)
}

async function getHalUsbInfoEndPoint(uuidObj, user, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet)

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid,
  }, transaction)
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, uuidObj.uuid))
  }

  return await USBInfoManager.findOne({
    iofogUuid: uuidObj.uuid,
  }, transaction)
}

function _filterFogs(fogs, filters) {
  if (!filters) {
    return fogs
  }

  const filtered = []
  fogs.forEach((fog) => {
    let isMatchFog = true
    filters.some((filter) => {
      const fld = filter.key
      const val = filter.value
      const condition = filter.condition
      const isMatchField = (condition === 'equals' && fog[fld] && fog[fld] === val)
        || (condition === 'has' && fog[fld] && fog[fld].includes(val))
      if (!isMatchField) {
        isMatchFog = false
        return false
      }
    })
    if (isMatchFog) {
      filtered.push(fog)
    }
  })
  return filtered
}

async function _processDeleteCommand(fog, transaction) {
  if (!fog.daemonStatus || fog.daemonStatus === FogStates.UNKNOWN) {
    await FogManager.delete({ uuid: fog.uuid }, transaction)
  } else {
    await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.deleteNode, transaction)
  }
}

async function _createHalMicroserviceForFog(fogData, oldFog, user, transaction) {
  const halItem = await CatalogService.getHalCatalogItem(transaction)

  const halMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Hal for Fog ${fogData.uuid}`,
    config: '{}',
    catalogItemId: halItem.id,
    iofogUuid: fogData.uuid,
    rootHostAccess: true,
    logSize: 50,
    userId: oldFog ? oldFog.userId : user.id,
    configLastUpdated: Date.now(),
  }

  await MicroserviceManager.create(halMicroserviceData, transaction)
}

async function _deleteHalMicroserviceByFog(fogData, transaction) {
  const halItem = await CatalogService.getHalCatalogItem(transaction)
  const deleteHalMicroserviceData = {
    iofogUuid: fogData.uuid,
    catalogItemId: halItem.id,
  }

  await MicroserviceManager.delete(deleteHalMicroserviceData, transaction)
}

async function _createBluetoothMicroserviceForFog(fogData, oldFog, user, transaction) {
  const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction)

  const bluetoothMicroserviceData = {
    uuid: AppHelper.generateRandomString(32),
    name: `Bluetooth for Fog ${fogData.uuid}`,
    config: '{}',
    catalogItemId: bluetoothItem.id,
    iofogUuid: fogData.uuid,
    rootHostAccess: true,
    logSize: 50,
    userId: oldFog ? oldFog.userId : user.id,
    configLastUpdated: Date.now(),
  }

  await MicroserviceManager.create(bluetoothMicroserviceData, transaction)
}

async function _deleteBluetoothMicroserviceByFog(fogData, transaction) {
  const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction)
  const deleteBluetoothMicroserviceData = {
    iofogUuid: fogData.uuid,
    catalogItemId: bluetoothItem.id,
  }

  await MicroserviceManager.delete(deleteBluetoothMicroserviceData, transaction)
}

// decorated functions
const createFogWithTracking = TrackingDecorator.trackEvent(createFogEndPoint, TrackingEventType.IOFOG_CREATED)

const informKubelet = function(iofogUuid, method) {
  const kubeletUri = config.get('Kubelet:Uri')
  const options = {
    uri: kubeletUri + '/node',
    qs: {
      uuid: iofogUuid,
    },
    method: method,
  }

  return request(options)
}

module.exports = {
  createFogEndPoint: TransactionDecorator.generateTransaction(createFogWithTracking),
  updateFogEndPoint: TransactionDecorator.generateTransaction(updateFogEndPoint),
  deleteFogEndPoint: TransactionDecorator.generateTransaction(deleteFogEndPoint),
  getFogEndPoint: TransactionDecorator.generateTransaction(getFogEndPoint),
  getFogListEndPoint: TransactionDecorator.generateTransaction(getFogListEndPoint),
  generateProvisioningKeyEndPoint: TransactionDecorator.generateTransaction(generateProvisioningKeyEndPoint),
  setFogVersionCommandEndPoint: TransactionDecorator.generateTransaction(setFogVersionCommandEndPoint),
  setFogRebootCommandEndPoint: TransactionDecorator.generateTransaction(setFogRebootCommandEndPoint),
  getHalHardwareInfoEndPoint: TransactionDecorator.generateTransaction(getHalHardwareInfoEndPoint),
  getHalUsbInfoEndPoint: TransactionDecorator.generateTransaction(getHalUsbInfoEndPoint),
  getFog: getFog,
}

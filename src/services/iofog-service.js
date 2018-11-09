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
const ChangeTrackingService = require('./change-tracking-service');
const Errors = require('../helpers/errors');
const ErrorMessages = require('../helpers/error-messages');
const Validator = require('../schemas');
const HWInfoManager = require('../sequelize/managers/hw-info-manager');
const USBInfoManager = require('../sequelize/managers/usb-info-manager');
const CatalogService = require('../services/catalog-service');
const MicroserviceManager = require('../sequelize/managers/microservice-manager');

async function _createFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogCreate);

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
    userId: user.id
  };
  createFogData = AppHelper.deleteUndefinedFields(createFogData);

  const fog = await FogManager.create(createFogData, transaction);

  const res = {
    uuid: fog.uuid
  };

  await ChangeTrackingService.create(fog.uuid, transaction);

  //TODO: proccess watchdog flag

  //TODO refactor. call MicroserviceService.createMicroservice
  //TODO: refactor. to function
  if (fogData.abstractedHardwareEnabled) {
    const halItem = await CatalogService.getHalCatalogItem(transaction);

    const halMicroserviceData = {
      uuid: AppHelper.generateRandomString(32),
      name: `HAL for Fog ${fog.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: fog.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: user.id,
      configLastUpdated: Date.now()
    };

    await MicroserviceManager.create(halMicroserviceData, transaction);
  }

  //TODO: refactor. to function
  if (fogData.bluetoothEnabled) {
    const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction);

    const bluetoothMicroserviceData = {
      uuid: AppHelper.generateRandomString(32),
      name: `Bluetooth for Fog ${fog.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: fog.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: user.id,
      configLastUpdated: Date.now()
    };

    await MicroserviceManager.create(bluetoothMicroserviceData, transaction);
  }

  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction)

  return res
}

async function _updateFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogUpdate);

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id};

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
  };
  updateFogData = AppHelper.deleteUndefinedFields(updateFogData);

  const oldFog = await FogManager.findOne(queryFogData, transaction);
  if (!oldFog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }

  await FogManager.update(queryFogData, updateFogData, transaction);
  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.config, transaction);

  let msChanged = false;
  //TODO: refactor. to function
  if (oldFog.bluetoothEnabled === true && fogData.bluetoothEnabled === false) {
    const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction);
    const deleteBluetoothMicroserviceData = {
      iofogUuid: fogData.uuid,
      catalogItemId: bluetoothItem.id
    };

    await MicroserviceManager.delete(deleteBluetoothMicroserviceData, transaction)
    msChanged = true;
  }

  //TODO: refactor. to function
  if (oldFog.bluetoothEnabled === false && fogData.bluetoothEnabled === true) {
    const bluetoothItem = await CatalogService.getBluetoothCatalogItem(transaction);

    const bluetoothMicroserviceData = {
      uuid: AppHelper.generateRandomString(32),
      name: `Bluetooth for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: bluetoothItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: user.id,
      configLastUpdated: Date.now()
    };

    await MicroserviceManager.create(bluetoothMicroserviceData, transaction);
    msChanged = true;
  }

  //TODO: refactor. to function
  if (oldFog.abstractedHardwareEnabled === true && fogData.abstractedHardwareEnabled === false) {
    const halItem = await CatalogService.getHalCatalogItem(transaction);
    const deleteHalMicroserviceData = {
      iofogUuid: fogData.uuid,
      catalogItemId: halItem.id
    };

    await MicroserviceManager.delete(deleteHalMicroserviceData, transaction)
    msChanged = true;
  }

  //TODO: refactor. to function
  if (oldFog.abstractedHardwareEnabled === false && fogData.abstractedHardwareEnabled === true) {
    const halItem = await CatalogService.getHalCatalogItem(transaction);

    const halMicroserviceData = {
      uuid: AppHelper.generateRandomString(32),
      name: `Hal for Fog ${fogData.uuid}`,
      config: '{}',
      catalogItemId: halItem.id,
      iofogUuid: fogData.uuid,
      rootHostAccess: true,
      logSize: 50,
      userId: user.id,
      configLastUpdated: Date.now()
    };

    await MicroserviceManager.create(halMicroserviceData, transaction);
    msChanged = true;
  }

  if (msChanged) {
    await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.microserviceCommon, transaction);
  }
}

async function _deleteFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogDelete);

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id};

  const fog = await FogManager.findOne(queryFogData, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }
  await _updateFogsConnectionStatus(fog, transaction);
  await _processDeleteCommand(fog, transaction)
}

async function _getFog(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGet);

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id};

  const fog = await FogManager.findOne(queryFogData, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }
  await _updateFogsConnectionStatus(fog, transaction);

  return {
    uuid: fog.uuid,
    name: fog.name,
    location: fog.location,
    gpsMode: fog.gpsMode,
    latitude: fog.latitude,
    longitude: fog.longitude,
    description: fog.description,
    lastActive: fog.lastActive,
    daemonStatus: fog.daemonStatus,
    daemonOperatingDuration: fog.daemonOperatingDuration,
    daemonLastStart: fog.daemonLastStart,
    memoryUsage: fog.memoryUsage,
    diskUsage: fog.diskUsage,
    cpuUsage: fog.cpuUsage,
    memoryViolation: fog.memoryViolation,
    diskViolation: fog.diskViolation,
    cpuViolation: fog.cpuViolation,
    catalogItemStatus: fog.catalogItemStatus,
    repositoryCount: fog.repositoryCount,
    repositoryStatus: fog.repositoryStatus,
    systemTime: fog.systemTime,
    lastStatusTime: fog.lastStatusTime,
    ipAddress: fog.ipAddress,
    processedMessages: fog.processedMessages,
    catalogItemMessageCounts: fog.catalogItemMessageCounts,
    messageSpeed: fog.messageSpeed,
    lastCommandTime: fog.lastCommandTime,
    networkInterface: fog.networkInterface,
    dockerUrl: fog.dockerUrl,
    diskLimit: fog.diskLimit,
    diskDirectory: fog.diskDirectory,
    memoryLimit: fog.memoryLimit,
    cpuLimit: fog.cpuLimit,
    logLimit: fog.logLimit,
    logDirectory: fog.logDirectory,
    bluetoothEnabled: fog.bluetoothEnabled,
    abstractedHardwareEnabled: fog.abstractedHardwareEnabled,
    logFileCount: fog.logFileCount,
    version: fog.version,
    isReadyToUpgrade: fog.isReadyToUpgrade,
    isReadyToRollback: fog.isReadyToRollback,
    statusFrequency: fog.statusFrequency,
    changeFrequency: fog.changeFrequency,
    deviceScanFrequency: fog.deviceScanFrequency,
    tunnel: fog.tunnel,
    watchdogEnabled: fog.watchdogEnabled,
    fogTypeId: fog.fogTypeId,
    userId: fog.userId
  };
}

async function _getFogList(filters, user, isCli, transaction) {
  await Validator.validate(filters, Validator.schemas.iofogFilters);

  const queryFogData = isCli
    ? {}
    : {userId: user.id};

  let fogs = await FogManager.findAll(queryFogData, transaction);
  fogs = _filterFogs(fogs, filters);
  for (const fog of fogs) {
    await _updateFogsConnectionStatus(fog, transaction)
  }
  return {
    fogs: fogs
  }
}

async function _generateProvisioningKey(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogGenerateProvision);

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id};

  const newProvision = {
    iofogUuid: fogData.uuid,
    provisionKey: AppHelper.generateRandomString(8),
    expirationTime: new Date().getTime() + (20 * 60 * 1000)
  };

  const fog = await FogManager.findOne(queryFogData, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }
  const provisioningKeyData = await FogProvisionKeyManager.updateOrCreate({iofogUuid: fogData.uuid}, newProvision, transaction);

  return {
    key: provisioningKeyData.provisionKey,
    expirationTime: provisioningKeyData.expirationTime
  }
}

async function _setFogVersionCommand(fogVersionData, user, isCli, transaction) {
  await Validator.validate(fogVersionData, Validator.schemas.iofogSetVersionCommand);

  const queryFogData = isCli
    ? {uuid: fogVersionData.uuid}
    : {uuid: fogVersionData.uuid, userId: user.id};

  const newVersionCommand = {
    iofogUuid: fogVersionData.uuid,
    versionCommand: fogVersionData.versionCommand
  };

  const fog = await FogManager.findOne(queryFogData, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }

  await _generateProvisioningKey({uuid: fogVersionData.uuid}, user, isCli, transaction);
  await FogVersionCommandManager.updateOrCreate({iofogUuid: fogVersionData.uuid}, newVersionCommand, transaction);
  await ChangeTrackingService.update(fogVersionData.uuid, ChangeTrackingService.events.version, transaction)
}

async function _setFogRebootCommand(fogData, user, isCli, transaction) {
  await Validator.validate(fogData, Validator.schemas.iofogReboot);

  const queryFogData = isCli
    ? {uuid: fogData.uuid}
    : {uuid: fogData.uuid, userId: user.id};

  const fog = await FogManager.findOne(queryFogData, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, fogData.uuid))
  }

  await ChangeTrackingService.update(fogData.uuid, ChangeTrackingService.events.reboot, transaction)
}

async function _getHalHardwareInfo(uuidObj, user, isCLI, transaction) {
  await Validator.validate(uuidObj, Validator.schemas.halGet);

  const fog = await FogManager.findOne({
    uuid: uuidObj.uuid
  }, transaction);
  if (!fog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, uuidObj.uuid));
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
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_FOG_NODE_UUID, uuidObj.uuid));
  }

  return await USBInfoManager.findOne({
    iofogUuid: uuidObj.uuid
  }, transaction);
}

function _filterFogs(fogs, filters) {
  if (!filters) {
    return fogs
  }

  const filtered = [];
  fogs.forEach((fog) => {
    let isMatchFog = true;
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
    });
    if (isMatchFog) {
      filtered.push(fog)
    }
  });
  return filtered
}

async function _updateFogsConnectionStatus(fog, transaction) {
  const minInMs = 60000;
  const intervalInMs = fog.statusFrequency > minInMs ? fog.statusFrequency * 2 : minInMs;
  if (fog.daemonStatus !== 'UNKNOWN' && Date.now() - fog.lastStatusTime > intervalInMs) {
    fog.daemonStatus = 'UNKNOWN';
    fog.ipAddress = '0.0.0.0';
    const queryFogData = {uuid: fog.uuid};
    const toUpdate = {daemonStatus: fog.daemonStatus, ipAddress: fog.ipAddress};
    await FogManager.update(queryFogData, toUpdate, transaction)
  }
}

async function _processDeleteCommand(fog, transaction) {
  if (!fog.daemonStatus || fog.daemonStatus === 'UNKNOWN') {
    await FogManager.delete({uuid: fog.uuid}, transaction)
  } else {
    await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.deleteNode, transaction)
  }
}

module.exports = {
  createFog: TransactionDecorator.generateTransaction(_createFog),
  updateFog: TransactionDecorator.generateTransaction(_updateFog),
  deleteFog: TransactionDecorator.generateTransaction(_deleteFog),
  getFogWithTransaction: TransactionDecorator.generateTransaction(_getFog),
  getFogList: TransactionDecorator.generateTransaction(_getFogList),
  generateProvisioningKey: TransactionDecorator.generateTransaction(_generateProvisioningKey),
  setFogVersionCommand: TransactionDecorator.generateTransaction(_setFogVersionCommand),
  setFogRebootCommand: TransactionDecorator.generateTransaction(_setFogRebootCommand),
  getHalHardwareInfo: TransactionDecorator.generateTransaction(_getHalHardwareInfo),
  getHalUsbInfo: TransactionDecorator.generateTransaction(_getHalUsbInfo),
  getFog: _getFog
};
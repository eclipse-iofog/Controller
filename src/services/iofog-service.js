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

async function _createFog(newFog, user, transaction) {
  AppHelper.validateFields(newFog, ['name', 'fogType'])
  /* !!!!!TODO: validateFogType!!!!!!!*/

  const createFogData = {
    uuid: newFog.uuid ? newFog.uuid : AppHelper.generateRandomString(32),
    name: newFog.name,
    location: newFog.location,
    latitude: newFog.latitude,
    longitude: newFog.longitude,
    gpsMode: newFog.latitude || newFog.longitude ? 'manual' : null,
    description: newFog.description,
    dockerUrl: newFog.dockerUrl,
    diskLimit: newFog.diskLimit,
    diskDirectory: newFog.diskDirectory,
    memoryLimit: newFog.memoryLimit,
    cpuLimit: newFog.cpuLimit,
    logLimit: newFog.logLimit,
    logDirectory: newFog.logDirectory,
    logFileCount: newFog.logFileCount,
    statusFrequency: newFog.statusFrequency,
    changeFrequency: newFog.changeFrequency,
    deviceScanFrequency: newFog.deviceScanFrequency,
    bluetoothEnabled: newFog.bluetoothEnabled,
    watchdogEnabled: newFog.watchdogEnabled,
    abstractedHardwareEnabled: newFog.abstractedHardwareEnabled,
    fogTypeId: newFog.fogType,
    userId: user.id
  }

  const fog = await FogManager.create(createFogData, transaction)

  const res = {
    uuid: fog.uuid
  }

  return res
}


module.exports = {
  createFogWithTransaction: TransactionDecorator.generateTransaction(_createFog)
}
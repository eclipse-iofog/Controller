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

const logger = require('../logger')
const Errors = require('./errors')
const ApplicationManager = require('../data/managers/application-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')

const SYSTEM_MICROSERVICE_TYPES = ['router', 'hal', 'ble', 'debug', 'nats']

const getSystemAppName = (fogName) => `system-${fogName}`

const getLegacySystemAppName = (fogUuid) => `system-${fogUuid.toLowerCase()}`

const getSystemMicroserviceName = (type) => type

const getLegacySystemMicroserviceName = (type, fogUuid) =>
  `${type}-${fogUuid.toLowerCase()}`

const slugifyName = (value, maxLength = 48) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!normalized) {
    return 'default'
  }
  return normalized.length > maxLength ? normalized.slice(0, maxLength).replace(/-+$/g, '') : normalized
}

async function _migrateLegacySystemMicroservices (legacyAppId, targetAppId, fogUuid, transaction) {
  for (const type of SYSTEM_MICROSERVICE_TYPES) {
    const legacyName = getLegacySystemMicroserviceName(type, fogUuid)
    const legacyMs = await MicroserviceManager.findOne({
      name: legacyName,
      applicationId: legacyAppId
    }, transaction)
    if (!legacyMs) {
      continue
    }

    const canonicalName = getSystemMicroserviceName(type)
    const canonicalMs = await MicroserviceManager.findOne({
      name: canonicalName,
      applicationId: targetAppId
    }, transaction)

    if (canonicalMs) {
      logger.warn(`Legacy system microservice "${legacyName}" exists alongside "${canonicalName}". Keeping canonical and deleting legacy.`)
      await MicroserviceManager.delete({ uuid: legacyMs.uuid }, transaction)
      continue
    }

    await MicroserviceManager.update(
      { uuid: legacyMs.uuid },
      { name: canonicalName, applicationId: targetAppId },
      transaction
    )
  }
}

async function ensureSystemApplication (fog, transaction) {
  if (!fog || !fog.uuid || !fog.name) {
    throw new Errors.ValidationError('Missing fog name for system application naming')
  }

  const newName = getSystemAppName(fog.name)
  const legacyName = getLegacySystemAppName(fog.uuid)

  let application = await ApplicationManager.findOne({ name: newName }, transaction)
  const legacyApplication = await ApplicationManager.findOne({ name: legacyName }, transaction)

  if (application && !application.isSystem) {
    throw new Errors.ValidationError(`System application name conflict: ${newName}`)
  }

  if (!application && legacyApplication) {
    await ApplicationManager.update(
      { id: legacyApplication.id },
      { name: newName },
      transaction
    )
    application = await ApplicationManager.findOne({ id: legacyApplication.id }, transaction)
  }

  if (!application) {
    application = await ApplicationManager.create({
      name: newName,
      isActivated: true,
      isSystem: true
    }, transaction)
  }

  if (legacyApplication && application.id !== legacyApplication.id) {
    await _migrateLegacySystemMicroservices(legacyApplication.id, application.id, fog.uuid, transaction)
    await ApplicationManager.delete({ id: legacyApplication.id }, transaction)
  } else {
    await _migrateLegacySystemMicroservices(application.id, application.id, fog.uuid, transaction)
  }

  return application
}

module.exports = {
  SYSTEM_MICROSERVICE_TYPES,
  getSystemAppName,
  getLegacySystemAppName,
  getSystemMicroserviceName,
  getLegacySystemMicroserviceName,
  slugifyName,
  ensureSystemApplication
}

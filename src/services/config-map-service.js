/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Contributors to the Eclipse ioFog Project
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
const ConfigMapManager = require('../data/managers/config-map-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
const MicroserviceEnvManager = require('../data/managers/microservice-env-manager')
const ChangeTrackingService = require('./change-tracking-service')
const AppHelper = require('../helpers/app-helper')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const Validator = require('../schemas/index')
const VolumeMountService = require('./volume-mount-service')
const VolumeMountingManager = require('../data/managers/volume-mounting-manager')

async function createConfigMapEndpoint (configMapData, transaction) {
  const validation = await Validator.validate(configMapData, Validator.schemas.configMapCreate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  const existingConfigMap = await ConfigMapManager.findOne({ name: configMapData.name }, transaction)
  if (existingConfigMap) {
    throw new Errors.ConflictError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_ALREADY_EXISTS, configMapData.name))
  }

  // Extract useVault, default to true if not provided (backward compatible)
  const useVault = configMapData.useVault !== undefined ? configMapData.useVault : true

  const configMap = await ConfigMapManager.createConfigMap(
    configMapData.name,
    configMapData.immutable,
    configMapData.data,
    useVault,
    transaction
  )

  return {
    id: configMap.id,
    name: configMap.name,
    immutable: configMap.immutable,
    useVault: configMap.useVault,
    created_at: configMap.created_at,
    updated_at: configMap.updated_at
  }
}

async function updateConfigMapEndpoint (configMapName, configMapData, transaction) {
  const validation = await Validator.validate(configMapData, Validator.schemas.configMapUpdate)
  if (!validation.valid) {
    throw new Errors.ValidationError(validation.error)
  }

  const existingConfigMap = await ConfigMapManager.findOne({ name: configMapName }, transaction)
  if (!existingConfigMap) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, configMapName))
  }

  if (existingConfigMap.immutable === true) {
    throw new Errors.ValidationError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_IMMUTABLE, configMapName))
  }

  // Extract useVault if provided, otherwise keep existing value (null = don't change)
  const useVault = configMapData.useVault !== undefined ? configMapData.useVault : null

  const configMap = await ConfigMapManager.updateConfigMap(
    configMapName,
    configMapData.immutable,
    configMapData.data,
    useVault,
    transaction
  )

  await _updateChangeTrackingForFogs(configMapName, transaction)
  await _updateMicroservicesUsingConfigMap(configMapName, transaction)

  return {
    id: configMap.id,
    name: configMap.name,
    immutable: configMap.immutable,
    useVault: configMap.useVault,
    created_at: configMap.created_at,
    updated_at: configMap.updated_at
  }
}

async function getConfigMapEndpoint (configMapName, transaction) {
  const configMap = await ConfigMapManager.getConfigMap(configMapName, transaction)
  if (!configMap) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, configMapName))
  }

  return {
    id: configMap.id,
    name: configMap.name,
    data: configMap.data,
    immutable: configMap.immutable,
    useVault: configMap.useVault,
    created_at: configMap.created_at,
    updated_at: configMap.updated_at
  }
}

async function listConfigMapsEndpoint (transaction) {
  const configMaps = await ConfigMapManager.listConfigMaps(transaction)
  return {
    configMaps: configMaps.map(configMap => ({
      id: configMap.id,
      name: configMap.name,
      immutable: configMap.immutable,
      useVault: configMap.useVault,
      created_at: configMap.created_at,
      updated_at: configMap.updated_at
    }))
  }
}

async function deleteConfigMapEndpoint (configMapName, transaction) {
  const existingConfigMap = await ConfigMapManager.findOne({ name: configMapName }, transaction)
  if (!existingConfigMap) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.CONFIGMAP_NOT_FOUND, configMapName))
  }

  await ConfigMapManager.deleteConfigMap(configMapName, transaction)
  await _deleteVolumeMountsUsingConfigMap(configMapName, transaction)
  // Vault deletion is handled by ConfigMapManager.deleteConfigMap()
  return {}
}

async function _deleteVolumeMountsUsingConfigMap (configMapName, transaction) {
  const volumeMounts = await VolumeMountingManager.findAll({ configMapName: configMapName }, transaction)
  if (volumeMounts.length > 0) {
    for (const volumeMount of volumeMounts) {
      await VolumeMountService.deleteVolumeMountEndpoint(volumeMount.name, transaction)
    }
  }
}

async function _updateChangeTrackingForFogs (configMapName, transaction) {
  const configMapVolumeMounts = await VolumeMountingManager.findAll({ configMapName: configMapName }, transaction)
  if (configMapVolumeMounts.length > 0) {
    for (const configMapVolumeMount of configMapVolumeMounts) {
      const volumeMountObj = {
        name: configMapVolumeMount.name,
        configMapName: configMapName
      }
      await VolumeMountService.updateVolumeMountEndpoint(configMapVolumeMount.name, volumeMountObj, transaction)
    }
  }
}

async function _updateMicroservicesUsingConfigMap (configMapName, transaction) {
  // Find all microservice environment variables that use this config map
  const envVars = await MicroserviceEnvManager.findAll({
    valueFromConfigMap: { [require('sequelize').Op.like]: `${configMapName}/%` }
  }, transaction)

  if (envVars.length === 0) {
    return
  }

  // Get the updated config map data
  const configMap = await ConfigMapManager.getConfigMap(configMapName, transaction)
  if (!configMap) {
    return
  }

  // Group environment variables by microservice UUID
  const microserviceEnvMap = new Map()
  for (const envVar of envVars) {
    if (!microserviceEnvMap.has(envVar.microserviceUuid)) {
      microserviceEnvMap.set(envVar.microserviceUuid, [])
    }
    microserviceEnvMap.get(envVar.microserviceUuid).push(envVar)
  }

  // Update each microservice's environment variables and change tracking
  for (const [microserviceUuid, envVars] of microserviceEnvMap) {
    // Get the microservice to access its iofogUuid
    const microservice = await MicroserviceManager.findOne({ uuid: microserviceUuid }, transaction)
    if (!microservice) {
      continue
    }

    // Update each environment variable with the new config map data
    for (const envVar of envVars) {
      const [configMapNameFromRef, dataKey] = envVar.valueFromConfigMap.split('/')
      if (configMapNameFromRef === configMapName && configMap.data[dataKey]) {
        // Update the environment variable value with the new config map data
        await MicroserviceEnvManager.update(
          { id: envVar.id },
          { value: configMap.data[dataKey] },
          transaction
        )
      }
    }

    // Update change tracking for the microservice's fog node
    await ChangeTrackingService.update(microservice.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

module.exports = {
  createConfigMapEndpoint: TransactionDecorator.generateTransaction(createConfigMapEndpoint),
  updateConfigMapEndpoint: TransactionDecorator.generateTransaction(updateConfigMapEndpoint),
  getConfigMapEndpoint: TransactionDecorator.generateTransaction(getConfigMapEndpoint),
  listConfigMapsEndpoint: TransactionDecorator.generateTransaction(listConfigMapsEndpoint),
  deleteConfigMapEndpoint: TransactionDecorator.generateTransaction(deleteConfigMapEndpoint)
}

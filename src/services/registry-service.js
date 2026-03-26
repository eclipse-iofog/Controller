/*
 * *******************************************************************************
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

const RegistryManager = require('../data/managers/registry-manager')
const SecretHelper = require('../helpers/secret-helper')
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ChangeTrackingService = require('./change-tracking-service')
const TransactionDecorator = require('../decorators/transaction-decorator')
const FogManager = require('../data/managers/iofog-manager')
const MicroserviceManager = require('../data/managers/microservice-manager')
// const Sequelize = require('sequelize')
// const Op = Sequelize.Op
const AppHelper = require('../helpers/app-helper')

function isPasswordEmpty (password) {
  return password == null || (typeof password === 'string' && password.trim() === '')
}

const createRegistry = async function (registry, transaction) {
  await Validator.validate(registry, Validator.schemas.registryCreate)

  let registryCreate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email
  }

  registryCreate = AppHelper.deleteUndefinedFields(registryCreate)

  const createdRegistry = await RegistryManager.create(registryCreate, transaction)

  if (!isPasswordEmpty(registryCreate.password)) {
    const encryptedPassword = await SecretHelper.encryptSecret(
      { value: registryCreate.password },
      'registry-' + createdRegistry.id,
      'registry'
    )
    await RegistryManager.update(
      { id: createdRegistry.id },
      { password: encryptedPassword },
      transaction
    )
  }

  await _updateChangeTracking(transaction)

  return {
    id: createdRegistry.id
  }
}

const findRegistries = async function (isCLI, transaction) {
  const queryRegistry = isCLI
    ? {}
    : {}

  const registries = await RegistryManager.findAllWithAttributes(queryRegistry, { exclude: ['password'] }, transaction)
  return {
    registries: registries
  }
}

const deleteRegistry = async function (registryData, isCLI, transaction) {
  await Validator.validate(registryData, Validator.schemas.registryDelete)
  const queryData = isCLI
    ? { id: registryData.id }
    : { id: registryData.id }
  // Convert registryId to number to handle string IDs from URL parameters
  const id = parseInt(registryData.id, 10)
  if (id === 1 || id === 2) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const registry = await RegistryManager.findOne(queryData, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryData.id))
  }
  const microservices = await MicroserviceManager.findAllWithStatuses({ registryId: registryData.id }, transaction)
  if (microservices.length > 0) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_IN_USE)
  } else {
    await RegistryManager.delete(queryData, transaction)
    await _updateChangeTracking(transaction)
  }
}

const updateRegistry = async function (registry, registryId, isCLI, transaction) {
  await Validator.validate(registry, Validator.schemas.registryUpdate)
  // Convert registryId to number to handle string IDs from URL parameters
  const id = parseInt(registryId, 10)
  if (id === 1 || id === 2) {
    throw new Errors.ValidationError(ErrorMessages.REGISTRY_IS_SYSTEM)
  }
  const existingRegistry = await RegistryManager.findOne({
    id: registryId
  }, transaction)

  if (!existingRegistry) {
    throw new Errors.NotFoundError(ErrorMessages.REGISTRY_NOT_FOUND)
  }

  let registryUpdate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email
  }

  registryUpdate = AppHelper.deleteUndefinedFields(registryUpdate)

  if (registryUpdate.password !== undefined && isPasswordEmpty(registryUpdate.password) && SecretHelper.isVaultReference(existingRegistry.password)) {
    await SecretHelper.deleteSecret('registry-' + existingRegistry.id, 'registry')
  }

  const where = isCLI
    ? {
      id: registryId
    }
    : {
      id: registryId
    }

  await RegistryManager.update(where, registryUpdate, transaction)
  const microservices = await MicroserviceManager.findAllWithStatuses({ registryId: registryId }, transaction)
  if (microservices.length > 0) {
    for (const ms of microservices) {
      await MicroserviceManager.updateAndFind({ uuid: ms.uuid }, { rebuild: true }, transaction)
      await ChangeTrackingService.update(ms.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
    }
  }

  await _updateChangeTracking(transaction)
}

const getRegistry = async function (registryId, isCLI, transaction) {
  const id = parseInt(registryId, 10)
  const registry = await RegistryManager.findOne({ id }, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryId))
  }
  return registry
}

const _updateChangeTracking = async function (transaction) {
  const fogs = await FogManager.findAll({}, transaction)
  for (const fog of fogs) {
    await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.registries, transaction)
  }
}

module.exports = {
  createRegistry: TransactionDecorator.generateTransaction(createRegistry),
  findRegistries: TransactionDecorator.generateTransaction(findRegistries),
  deleteRegistry: TransactionDecorator.generateTransaction(deleteRegistry),
  updateRegistry: TransactionDecorator.generateTransaction(updateRegistry),
  getRegistry: TransactionDecorator.generateTransaction(getRegistry)
}

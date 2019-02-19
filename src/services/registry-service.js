/*
 * *******************************************************************************
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

const RegistryManager = require('../sequelize/managers/registry-manager')
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const ChangeTrackingService = require('./change-tracking-service')
const TransactionDecorator = require('../decorators/transaction-decorator')
const FogManager = require('../sequelize/managers/iofog-manager')
const Sequelize = require('sequelize')
const Op = Sequelize.Op
const AppHelper = require('../helpers/app-helper')


const createRegistry = async function(registry, user, transaction) {
  await Validator.validate(registry, Validator.schemas.registryCreate)
  if (registry.requiresCert && registry.certificate === undefined) {
    throw new Errors.ValidationError(ErrorMessages.CERT_PROPERTY_REQUIRED)
  }

  let registryCreate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email,
    requiresCert: registry.requiresCert,
    certificate: registry.certificate,
    userId: user.id,
  }

  registryCreate = AppHelper.deleteUndefinedFields(registryCreate)

  const createdRegistry = await RegistryManager.create(registryCreate, transaction)

  await _updateChangeTracking(user, transaction)

  return {
    id: createdRegistry.id,
  }
}

const findRegistries = async function(user, isCLI, transaction) {
  const queryRegistry = isCLI
    ? {}
    : {
      [Op.or]:
        [
          {
            userId: user.id,
          },
          {
            isPublic: true,
          },
        ],
    }

  const registries = await RegistryManager.findAll(queryRegistry, transaction)
  return {
    registries: registries,
  }
}

const deleteRegistry = async function(registryData, user, isCLI, transaction) {
  await Validator.validate(registryData, Validator.schemas.registryDelete)
  const queryData = isCLI
    ? {id: registryData.id}
    : {id: registryData.id, userId: user.id}
  const registry = await RegistryManager.findOne(queryData, transaction)
  if (!registry) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_REGISTRY_ID, registryData.id))
  }
  if (isCLI) {
    user = {id: registry.userId}
  }
  await RegistryManager.delete(queryData, transaction)
  await _updateChangeTracking(user, transaction)
}

const updateRegistry = async function(registry, registryId, user, isCLI, transaction) {
  await Validator.validate(registry, Validator.schemas.registryUpdate)

  if (registry.requiresCert && registry.certificate === undefined) {
    throw new Errors.ValidationError(ErrorMessages.CERT_PROPERTY_REQUIRED)
  }

  const existingRegistry = await RegistryManager.findOne({
    id: registryId,
  }, transaction)
  if (!existingRegistry) {
    throw new Errors.NotFoundError(ErrorMessages.REGISTRY_NOT_FOUND)
  }

  let registryUpdate = {
    url: registry.url,
    username: registry.username,
    password: registry.password,
    isPublic: registry.isPublic,
    userEmail: registry.email,
    requiresCert: registry.requiresCert,
    certificate: registry.certificate,
  }

  registryUpdate = AppHelper.deleteUndefinedFields(registryUpdate)

  const where = isCLI ?
    {
      id: registryId,
    }
    :
    {
      id: registryId,
      userId: user.id,
    }

  await RegistryManager.update(where, registryUpdate, transaction)

  await _updateChangeTracking(user, transaction)
}


const _updateChangeTracking = async function(user, transaction) {
  const fogs = await FogManager.findAll({userId: user.id}, transaction)
  for (fog of fogs) {
    await ChangeTrackingService.update(fog.uuid, ChangeTrackingService.events.registries, transaction)
  }
}

module.exports = {
  createRegistry: TransactionDecorator.generateTransaction(createRegistry),
  findRegistries: TransactionDecorator.generateTransaction(findRegistries),
  deleteRegistry: TransactionDecorator.generateTransaction(deleteRegistry),
  updateRegistry: TransactionDecorator.generateTransaction(updateRegistry),
}

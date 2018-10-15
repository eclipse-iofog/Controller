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

const RegistryManager = require('../sequelize/managers/registry-manager');
const Validator = require('../schemas')
const Errors = require('../helpers/errors')

const TransactionDecorator = require('../decorators/transaction-decorator');

const createRegistry = async function (registry, user, transaction) {
  await Validator.validate(registry, Validator.schemas.registryCreate);
  let registryCreate = {
      url: registry.url,
      username: registry.username,
      password: registry.password,
      isPublic: registry.isPublic,
      userEmail: registry.email,
      userId: user.id
  };
  return await RegistryManager.create(registryCreate, transaction)
};

const findAllRegistries = async function (user, transaction) {
  const queryRegistry = {
      userId: user.id
  };
  const registries = await RegistryManager.findAll(queryRegistry, transaction);
  return {
    registries: registries
  }
};

const deleteRegistry = async function (registryData, user, transaction) {
  await Validator.validate(registryData, Validator.schemas.registryDelete)
  const queryFogData = {
    id: registryData.id,
    userId: user.id
  };
  const registry = await RegistryManager.findOne(queryFogData, transaction);
  if (!registry) {
      throw new Errors.NotFoundError('Invalid Registry Id');
  }
  await RegistryManager.delete(queryFogData, transaction);
};

module.exports = {
  findRegistries: TransactionDecorator.generateTransaction(findAllRegistries),
  createRegistry: TransactionDecorator.generateTransaction(createRegistry),
  deleteRegistry: TransactionDecorator.generateTransaction(deleteRegistry)
};
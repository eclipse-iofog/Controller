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

const logger = require('../logger');
const AuthDecorator = require('../decorators/authorization-decorator');
const RegistryService = require('../services/registry-service');

const createRegistryEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const registry = req.body;
  await RegistryService.createRegistry(registry, user);
};

const getRegistriesEndPoint = async function (req, user) {
  return await RegistryService.findRegistries(user, false);
};

const deleteRegistryEndPoint = async function (req, user) {
  const deleteRegistry = {
      id: parseInt(req.params.id)
  }
  return await RegistryService.deleteRegistry(deleteRegistry, user, false);
};

module.exports = {
    createRegistryEndPoint: AuthDecorator.checkAuthToken(createRegistryEndPoint),
    getRegistriesEndPoint: AuthDecorator.checkAuthToken(getRegistriesEndPoint),
    deleteRegistryEndPoint: AuthDecorator.checkAuthToken(deleteRegistryEndPoint)
};
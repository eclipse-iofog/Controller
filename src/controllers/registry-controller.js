/*
 * *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const AuthDecorator = require('../decorators/authorization-decorator')
const RegistryService = require('../services/registry-service')

const createRegistryEndPoint = async function (req, user) {
  const registry = req.body
  return RegistryService.createRegistry(registry, user)
}

const getRegistriesEndPoint = async function (req, user) {
  return RegistryService.findRegistries(user, false)
}

const deleteRegistryEndPoint = async function (req, user) {
  const deleteRegistry = {
    id: parseInt(req.params.id)
  }
  return RegistryService.deleteRegistry(deleteRegistry, user, false)
}

const updateRegistryEndPoint = async function (req, user) {
  const registry = req.body
  const registryId = req.params.id
  return RegistryService.updateRegistry(registry, registryId, user, false)
}

module.exports = {
  createRegistryEndPoint: AuthDecorator.checkAuthToken(createRegistryEndPoint),
  getRegistriesEndPoint: AuthDecorator.checkAuthToken(getRegistriesEndPoint),
  deleteRegistryEndPoint: AuthDecorator.checkAuthToken(deleteRegistryEndPoint),
  updateRegistryEndPoint: AuthDecorator.checkAuthToken(updateRegistryEndPoint)
}

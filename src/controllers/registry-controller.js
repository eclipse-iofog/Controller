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

const RegistryService = require('../services/registry-service')

const createRegistryEndPoint = async function (req) {
  const registry = req.body
  return RegistryService.createRegistry(registry)
}

const getRegistriesEndPoint = async function (req) {
  return RegistryService.findRegistries(false)
}

const getRegistryEndPoint = async function (req) {
  const registryId = req.params.id
  return RegistryService.getRegistry(registryId, false)
}
const deleteRegistryEndPoint = async function (req) {
  const deleteRegistry = {
    id: parseInt(req.params.id)
  }
  return RegistryService.deleteRegistry(deleteRegistry, false)
}

const updateRegistryEndPoint = async function (req) {
  const registry = req.body
  const registryId = req.params.id
  return RegistryService.updateRegistry(registry, registryId, false)
}

module.exports = {
  createRegistryEndPoint: (createRegistryEndPoint),
  getRegistriesEndPoint: (getRegistriesEndPoint),
  getRegistryEndPoint: (getRegistryEndPoint),
  deleteRegistryEndPoint: (deleteRegistryEndPoint),
  updateRegistryEndPoint: (updateRegistryEndPoint)
}

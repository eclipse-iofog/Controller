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

const ConfigService = require('../services/config-service')

const upsertConfigElementEndpoint = async function (req) {
  const configData = req.body
  return ConfigService.upsertConfigElement(configData)
}

const listConfigEndpoint = async function () {
  return ConfigService.listConfig()
}

const getConfigEndpoint = async function (req) {
  const key = req.params.key
  return ConfigService.getConfigElement(key)
}

module.exports = {
  upsertConfigElementEndpoint: (upsertConfigElementEndpoint),
  listConfigEndpoint: (listConfigEndpoint),
  getConfigEndpoint: (getConfigEndpoint)
}

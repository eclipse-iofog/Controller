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

const AuthDecorator = require('./../decorators/authorization-decorator')
const ConfigService = require('../services/config-service')

const upsertConfigElementEndpoint = async function (req, user) {
  const configData = req.body
  return ConfigService.upsertConfigElement(configData)
}

const listConfigEndpoint = async function (user) {
  return ConfigService.listConfig()
}

const getConfigEndpoint = async function (req, user) {
  const key = req.params.key
  return ConfigService.getConfigElement(key)
}

module.exports = {
  upsertConfigElementEndpoint: AuthDecorator.checkAuthToken(upsertConfigElementEndpoint),
  listConfigEndpoint: AuthDecorator.checkAuthToken(listConfigEndpoint),
  getConfigEndpoint: AuthDecorator.checkAuthToken(getConfigEndpoint)
}

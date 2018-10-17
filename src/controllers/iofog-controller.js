/*
 *  *******************************************************************************
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

const logger = require('../logger')
const AuthDecorator = require('../decorators/authorization-decorator');
const FogService = require('../services/iofog-service')

async function _createFog(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const newFog = req.body
  return await FogService.createFogWithTransaction(newFog, user, false)
}

async function _updateFog(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const updateFog = req.body
  updateFog.uuid = req.params.uuid
  return await FogService.updateFogWithTransaction(updateFog, user, false)
}

async function _deleteFog(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const deleteFog = {}
  deleteFog.uuid = req.params.uuid
  return await FogService.deleteFogWithTransaction(deleteFog, user, false)
}

async function _getFog(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const getFog = {}
  getFog.uuid = req.params.uuid
  return await FogService.getFogWithTransaction(getFog, user, false)
}

async function _getFogList(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const filters = Array.from(req.body)
  return await FogService.getFogListWithTransaction(filters, user, false)
}

async function _generateProvisioningKey(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const fog = {}
  fog.uuid = req.params.uuid
  return await FogService.generateProvisioningKeyWithTransaction(fog, user, false)
}

async function _setFogVersionCommand(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const fogVersionCommand = {}
  fogVersionCommand.uuid = req.params.uuid
  fogVersionCommand.versionCommand = req.params.versionCommand
  return await FogService.setFogVersionCommandWithTransaction(fogVersionCommand, user, false)
}

async function _setFogRebootCommand(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const fog = {}
  fog.uuid = req.params.uuid
  return await FogService.setFogRebootCommandWithTransaction(fog, user, false)
}

module.exports = {
  createFog: AuthDecorator.checkAuthToken(_createFog),
  updateFog: AuthDecorator.checkAuthToken(_updateFog),
  deleteFog: AuthDecorator.checkAuthToken(_deleteFog),
  getFog: AuthDecorator.checkAuthToken(_getFog),
  getFogList: AuthDecorator.checkAuthToken(_getFogList),
  generateProvisioningKey: AuthDecorator.checkAuthToken(_generateProvisioningKey),
  setFogVersionCommand: AuthDecorator.checkAuthToken(_setFogVersionCommand),
  setFogRebootCommand: AuthDecorator.checkAuthToken(_setFogRebootCommand),
}
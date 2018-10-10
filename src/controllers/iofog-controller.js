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
  return await FogService.createFogWithTransaction(newFog, user)
}

async function _updateFog(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const updateFog = req.body
  updateFog.uuid = req.params.uuid
  return await FogService.updateFogWithTransaction(updateFog, user)
}

module.exports = {
  createFog: AuthDecorator.checkAuthToken(_createFog),
  updateFog: AuthDecorator.checkAuthToken(_updateFog)
}
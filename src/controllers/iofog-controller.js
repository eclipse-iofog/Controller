/*
 *  *******************************************************************************
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
const FogService = require('../services/iofog-service')
const qs = require('qs')

async function createFogEndPoint (req, user) {
  const newFog = req.body
  return FogService.createFogEndPoint(newFog, user, false)
}

async function updateFogEndPoint (req, user) {
  const updateFog = req.body
  updateFog.uuid = req.params.uuid
  return FogService.updateFogEndPoint(updateFog, user, false)
}

async function deleteFogEndPoint (req, user) {
  const deleteFog = {
    uuid: req.params.uuid
  }
  return FogService.deleteFogEndPoint(deleteFog, user, false)
}

async function getFogEndPoint (req, user) {
  const getFog = {
    uuid: req.params.uuid
  }

  return FogService.getFogEndPoint(getFog, user, false)
}

async function getFogListEndPoint (req, user) {
  const isSystem = req.query && req.query.system ? req.query.system === 'true' : false
  const query = qs.parse(req.query)
  return FogService.getFogListEndPoint(query.filters, user, false, isSystem)
}

async function generateProvisionKeyEndPoint (req, user) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.generateProvisioningKeyEndPoint(fog, user, false)
}

async function setFogVersionCommandEndPoint (req, user) {
  const fogVersionCommand = {
    uuid: req.params.uuid,
    versionCommand: req.params.versionCommand
  }

  return FogService.setFogVersionCommandEndPoint(fogVersionCommand, user, false)
}

async function setFogRebootCommandEndPoint (req, user) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.setFogRebootCommandEndPoint(fog, user, false)
}

async function getHalHardwareInfoEndPoint (req, user) {
  const uuidObj = {
    uuid: req.params.uuid
  }
  return FogService.getHalHardwareInfoEndPoint(uuidObj, user, false)
}

async function getHalUsbInfoEndPoint (req, user) {
  const uuidObj = {
    uuid: req.params.uuid
  }
  return FogService.getHalUsbInfoEndPoint(uuidObj, user, false)
}

async function setFogPruneCommandEndPoint (req, user) {
  const fog = {
    uuid: req.params.uuid
  }

  return FogService.setFogPruneCommandEndPoint(fog, user, false)
}

module.exports = {
  createFogEndPoint: AuthDecorator.checkAuthToken(createFogEndPoint),
  updateFogEndPoint: AuthDecorator.checkAuthToken(updateFogEndPoint),
  deleteFogEndPoint: AuthDecorator.checkAuthToken(deleteFogEndPoint),
  getFogEndPoint: AuthDecorator.checkAuthToken(getFogEndPoint),
  getFogListEndPoint: AuthDecorator.checkAuthToken(getFogListEndPoint),
  generateProvisioningKeyEndPoint: AuthDecorator.checkAuthToken(generateProvisionKeyEndPoint),
  setFogVersionCommandEndPoint: AuthDecorator.checkAuthToken(setFogVersionCommandEndPoint),
  setFogRebootCommandEndPoint: AuthDecorator.checkAuthToken(setFogRebootCommandEndPoint),
  getHalHardwareInfoEndPoint: AuthDecorator.checkAuthToken(getHalHardwareInfoEndPoint),
  getHalUsbInfoEndPoint: AuthDecorator.checkAuthToken(getHalUsbInfoEndPoint),
  setFogPruneCommandEndPoint: AuthDecorator.checkAuthToken(setFogPruneCommandEndPoint)
}

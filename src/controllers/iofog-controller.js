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

const AuthDecorator = require('../decorators/authorization-decorator')
const FogService = require('../services/iofog-service')
const qs = require('qs')

async function createFogEndPoint(req, user) {
  const newFog = req.body
  return await FogService.createFogEndPoint(newFog, user, false)
}

async function updateFogEndPoint(req, user) {
  const updateFog = req.body
  updateFog.uuid = req.params.uuid
  return await FogService.updateFogEndPoint(updateFog, user, false)
}

async function deleteFogEndPoint(req, user) {
  const deleteFog = {
    uuid: req.params.uuid,
  }
  return await FogService.deleteFogEndPoint(deleteFog, user, false)
}

async function getFogEndPoint(req, user) {
  const getFog = {
    uuid: req.params.uuid,
  }

  return await FogService.getFogEndPoint(getFog, user, false)
}

async function getFogListEndPoint(req, user) {
  const query = qs.parse(req.query)
  return await FogService.getFogListEndPoint(query.filters, user, false)
}

async function generateProvisionKeyEndPoint(req, user) {
  const fog = {
    uuid: req.params.uuid,
  }

  return await FogService.generateProvisioningKeyEndPoint(fog, user, false)
}

async function setFogVersionCommandEndPoint(req, user) {
  const fogVersionCommand = {
    uuid: req.params.uuid,
    versionCommand: req.params.versionCommand,
  }

  return await FogService.setFogVersionCommandEndPoint(fogVersionCommand, user, false)
}

async function setFogRebootCommandEndPoint(req, user) {
  const fog = {
    uuid: req.params.uuid,
  }

  return await FogService.setFogRebootCommandEndPoint(fog, user, false)
}

async function getHalHardwareInfoEndPoint(req, user) {
  const uuidObj = {
    uuid: req.params.uuid,
  }
  return await FogService.getHalHardwareInfoEndPoint(uuidObj, user, false)
}

async function getHalUsbInfoEndPoint(req, user) {
  const uuidObj = {
    uuid: req.params.uuid,
  }
  return await FogService.getHalUsbInfoEndPoint(uuidObj, user, false)
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
}

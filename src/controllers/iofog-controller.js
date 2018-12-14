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

const logger = require('../logger');
const AuthDecorator = require('../decorators/authorization-decorator');
const FogService = require('../services/iofog-service');
const qs = require('qs');

async function createFogEndPoint(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const newFog = req.body;
  return await FogService.createFog(newFog, user, false)
}

async function updateFogEndPoint(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const updateFog = req.body;
  updateFog.uuid = req.params.uuid;
  return await FogService.updateFog(updateFog, user, false)
}

async function deleteFogEndPoint(req, user) {
  const deleteFog = {
    uuid: req.params.uuid
  };
  return await FogService.deleteFog(deleteFog, user, false)
}

async function getFogEndPoint(req, user) {
  const getFog = {
    uuid: req.params.uuid
  };

  return await FogService.getFogWithTransaction(getFog, user, false)
}

async function getFogListEndPoint(req, user) {
  logger.info("Parameters:" + JSON.stringify(req.query));
  const query = qs.parse(req.query);
  return await FogService.getFogList(query.filters, user, false)
}

async function generateProvisionKeyEndPoint(req, user) {
  const fog = {
    uuid:  req.params.uuid
  };

  return await FogService.generateProvisioningKey(fog, user, false)
}

async function setFogVersionCommandEndPoint(req, user) {
  const fogVersionCommand = {
    uuid: req.params.uuid,
    versionCommand: req.params.versionCommand
  };

  return await FogService.setFogVersionCommand(fogVersionCommand, user, false)
}

async function setFogRebootCommandEndPoint(req, user) {
  const fog = {
    uuid: req.params.uuid
  };

  return await FogService.setFogRebootCommand(fog, user, false)
}

async function getHalHardwareInfoEndPoint(req, user) {
  const uuidObj = {
    uuid: req.params.uuid
  };

  logger.info("Parameters" + JSON.stringify(uuidObj));

  return await FogService.getHalHardwareInfo(uuidObj, user, false);
}

async function getHalUsbInfoEndPoint(req, user) {
  const uuidObj = {
    uuid: req.params.uuid
  };

  logger.info("Parameters" + JSON.stringify(uuidObj));

  return await FogService.getHalUsbInfo(uuidObj, user, false);
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
  getHalUsbInfoEndPoint: AuthDecorator.checkAuthToken(getHalUsbInfoEndPoint)
};
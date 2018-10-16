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
const DiagnosticService = require('../services/diagnostic-service');
const AuthDecorator = require('./../decorators/authorization-decorator');

const enableMicroserviceStrace = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  return await DiagnosticService.enableMicroserviceStrace(req.parms.id, user);
};

const disableMicroserviceStrace = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.query));
  return await DiagnosticService.disableMicroserviceStrace(req.parms.id, user);
};

const getMicroserviceStraceData = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.query));
  return await DiagnosticService.getMicroserviceStraceData(req.parms.id, req.query, user);
};

const postMicroserviceStraceDataToFTP = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const straceData = req.body;
  straceData.id = req.params.id;
  return await DiagnosticService.enableMicroserviceStrace(straceData, req.query, user);
};

module.exports = {
  enableMicroserviceStrace: AuthDecorator.checkAuthToken(enableMicroserviceStrace),
  disableMicroserviceStrace: AuthDecorator.checkAuthToken(disableMicroserviceStrace),
  getMicroserviceStraceData: AuthDecorator.checkAuthToken(getMicroserviceStraceData),
  postMicroserviceStraceDataToFTP: AuthDecorator.checkAuthToken(postMicroserviceStraceDataToFTP),
};

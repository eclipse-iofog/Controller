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

const changeMicroserviceStraceStateEndPoint = async function (req, user) {
  logger.info("Parameters: " + JSON.stringify(req.body));
  logger.info("Microservice id: " + req.params.id);
  return await DiagnosticService.changeMicroserviceStraceState(req.params.id, req.body, user, false);
};

const getMicroserviceStraceDataEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.query));
  logger.info("Microservice id: " + req.params.id);
  return await DiagnosticService.getMicroserviceStraceData(req.params.id, req.query, user, false);
};

const postMicroserviceStraceDataToFtpEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  logger.info("Microservice id: " + req.params.id);
  return await DiagnosticService.postMicroserviceStraceDatatoFtp(req.params.id, req.body, user, false);
};

module.exports = {
  changeMicroserviceStraceStateEndPoint: AuthDecorator.checkAuthToken(changeMicroserviceStraceStateEndPoint),
  getMicroserviceStraceDataEndPoint: AuthDecorator.checkAuthToken(getMicroserviceStraceDataEndPoint),
  postMicroserviceStraceDataToFtpEndPoint: AuthDecorator.checkAuthToken(postMicroserviceStraceDataToFtpEndPoint),
};

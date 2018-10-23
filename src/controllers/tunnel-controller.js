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
const AuthDecorator = require('../decorators/authorization-decorator');
const TunnelService = require('../services/tunnel-service');

const manageTunnelEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const action = req.body.action;
  const tunnelData = {
      iofogUuid: req.params.id
  }
  switch (action) {
    case 'open':
      await TunnelService.openTunnel(tunnelData, user);
      break;
    case 'close':
      await TunnelService.closeTunnel(tunnelData, user);
      break;
    default:
      throw new Error("Unknown action property. Action can be 'open' or 'close'");
  }
};

const getTunnelEndPoint = async function (req, user) {
  logger.info("Parameters:" + JSON.stringify(req.body));
  const tunnelData = {
    iofogUuid: req.params.id
  };
  return await TunnelService.findTunnel(tunnelData, user);
};

module.exports = {
    manageTunnelEndPoint: AuthDecorator.checkAuthToken(manageTunnelEndPoint),
    getTunnelEndPoint: AuthDecorator.checkAuthToken(getTunnelEndPoint)
};
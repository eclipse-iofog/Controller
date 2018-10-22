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

const TunnelManager = require('../sequelize/managers/tunnel-manager');
const FogManager = require('../sequelize/managers/iofog-manager');
const Config = require('../config');
const AppHelper = require('../helpers/app-helper');
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const constants = require('../helpers/constants');
const TransactionDecorator = require('../decorators/transaction-decorator');
const ChangeTrackingManager = require('../sequelize/managers/change-tracking-manager')

const openTunnel = async function (tunnelData, user, transaction) {
    const iofog = await FogManager.findOne({uuid : tunnelData.iofogUuid}, transaction);
    if (!iofog) {
        throw new Errors.NotFoundError('Invalid Fog Id');
    }
    const host = Config.get("Proxy:Host");
    let tunnel = {
        username: Config.get("Proxy:Username"),
        password: Config.get("Proxy:Password"),
        host: host,
        rsakey: Config.get("Proxy:RsaKey"),
        lport: Config.get("Proxy:Lport"),
        iofogUuid: iofog.uuid,
        closed: false,
        rport: await AppHelper.findAvailablePort(host)
    };
    await Validator.validate(tunnel, Validator.schemas.tunnelCreate);
    await TunnelManager.updateOrCreate(tunnelData, tunnel, transaction);
    await updateChangeTracking(tunnelData, transaction);
};

const updateChangeTracking = async function (tunnelData, transaction){
    const changeTrackingUpdates = {
        iofogUuid: tunnelData.iofogUuid,
        proxy: true
    }
    await ChangeTrackingManager.update({iofogUuid: tunnelData.iofogUuid}, changeTrackingUpdates, transaction);
};

const findTunnel = async function (tunnelData, user, transaction) {
  await Validator.validate(tunnelData, Validator.schemas.tunnelFind);
  const tunnel = await TunnelManager.findOne(tunnelData, transaction);
  if (!tunnel) {
    throw new Errors.NotFoundError('Invalid Tunnel Id');
  }
  return {
      username: tunnel.username,
      host: tunnel.host,
      remotePort: tunnel.rport,
      localPort: tunnel.lport,
      status: tunnel.closed ? "closed" : "open"
    };
};

const closeTunnel = async function (tunnelData, user, transaction) {
  await findTunnel(tunnelData, user, transaction);
  await TunnelManager.update(tunnelData, {closed : true}, transaction);
  await updateChangeTracking(tunnelData, transaction);
};

module.exports = {
  findTunnel: TransactionDecorator.generateTransaction(findTunnel),
  openTunnel: TransactionDecorator.generateTransaction(openTunnel),
  closeTunnel: TransactionDecorator.generateTransaction(closeTunnel),
};
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

const TunnelManager = require('../sequelize/managers/tunnel-manager')
const FogManager = require('../sequelize/managers/iofog-manager')
const Config = require('../config')
const AppHelper = require('../helpers/app-helper')
const Validator = require('../schemas')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')
const TransactionDecorator = require('../decorators/transaction-decorator')
const ChangeTrackingService = require('./change-tracking-service')

const openTunnel = async function(tunnelData, user, isCli, transaction) {
  const iofog = await FogManager.findOne({uuid: tunnelData.iofogUuid}, transaction)
  if (!iofog) {
    throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_IOFOG_UUID, tunnelData.iofogUuid))
  }
  let tunnel = tunnelData
  if (isCli) {
    tunnel.rport = await AppHelper.findAvailablePort(tunnelData.host)
  } else {
    const host = Config.get('Tunnel:Host')
    tunnel = {
      username: Config.get('Tunnel:Username'),
      password: Config.get('Tunnel:Password'),
      host: host,
      rsakey: Config.get('Tunnel:RsaKey'),
      lport: Config.get('Tunnel:Lport'),
      iofogUuid: iofog.uuid,
      closed: false,
      rport: await AppHelper.findAvailablePort(host),
    }
  }
  await Validator.validate(tunnel, Validator.schemas.tunnelCreate)
  await TunnelManager.updateOrCreate(tunnelData, tunnel, transaction)
  await ChangeTrackingService.update(tunnelData.iofogUuid, ChangeTrackingService.events.tunnel, transaction)
}

const findTunnel = async function(tunnelData, user, transaction) {
  const tunnel = await TunnelManager.findOne(tunnelData, transaction)
  if (!tunnel) {
    throw new Errors.NotFoundError('Invalid Tunnel Id')
  }
  return {
    username: tunnel.username,
    host: tunnel.host,
    remotePort: tunnel.rport,
    localPort: tunnel.lport,
    status: tunnel.closed ? 'closed' : 'open',
  }
}

const findAll = async function(transaction) {
  const tunnels = await TunnelManager.findAll({}, transaction)
  tunnels.forEach((t) => {
    delete t.dataValues.password
  })
  return {
    tunnels: tunnels,
  }
}

const closeTunnel = async function(tunnelData, user, transaction) {
  await module.exports.findTunnel(tunnelData, user, transaction)
  await TunnelManager.update(tunnelData, {closed: true}, transaction)
  await ChangeTrackingService.update(tunnelData.iofogUuid, ChangeTrackingService.events.tunnel, transaction)
}

module.exports = {
  findTunnel: TransactionDecorator.generateTransaction(findTunnel),
  openTunnel: TransactionDecorator.generateTransaction(openTunnel),
  closeTunnel: TransactionDecorator.generateTransaction(closeTunnel),
  findAll: TransactionDecorator.generateTransaction(findAll),
}

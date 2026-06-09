/*
 * *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const TunnelService = require('../services/tunnel-service')
const Errors = require('../helpers/errors')
const ErrorMessages = require('../helpers/error-messages')

const manageTunnelEndPoint = async function (req) {
  const action = req.body.action
  const tunnelData = {
    iofogUuid: req.params.id
  }

  switch (action) {
    case 'open':
      await TunnelService.openTunnel(tunnelData, false)
      break
    case 'close':
      await TunnelService.closeTunnel(tunnelData)
      break
    default:
      throw new Errors.ValidationError(ErrorMessages.INVALID_ACTION_PROPERTY)
  }
}

const getTunnelEndPoint = async function (req) {
  const tunnelData = {
    iofogUuid: req.params.id
  }
  return TunnelService.findTunnel(tunnelData)
}

module.exports = {
  manageTunnelEndPoint: (manageTunnelEndPoint),
  getTunnelEndPoint: (getTunnelEndPoint)
}

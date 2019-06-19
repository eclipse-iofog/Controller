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

const BaseManager = require('../managers/base-manager')
const models = require('./../models')
const Fog = models.Fog
const Microservice = models.Microservice
const FogAccessToken = models.FogAccessToken
const Strace = models.StraceDiagnostics

class FogManager extends BaseManager {
  getEntity() {
    return Fog
  }

  // no transaction required here, used by auth decorator
  checkToken(token) {
    return Fog.findOne({
      include: [{
        model: FogAccessToken,
        as: 'accessToken',
        where: {
          token: token,
        },
      }],
    })
  }


  // no transaction required here, used by agent-last-active decorator
  updateLastActive(uuid, timestamp) {
    return Fog.update({
      lastActive: timestamp,
    }, {
      where: {
        uuid: uuid,
      },
    })
  }

  findFogStraces(where, transaction) {
    return Fog.findOne({
      include: [
        {
          model: Microservice,
          as: 'microservice',
          required: true,
          include: [{
            model: Strace,
            as: 'strace',
            required: true,
          }],
        }],
      where: where,
    }, { transaction: transaction })
  }
}

const instance = new FogManager()
module.exports = instance

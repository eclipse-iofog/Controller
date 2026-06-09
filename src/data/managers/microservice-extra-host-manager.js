/*
 *  *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const Errors = require('../../helpers/errors')
const ErrorMessages = require('../../helpers/error-messages')
const AppHelper = require('../../helpers/app-helper')
const MicroserviceManager = require('./microservice-manager')
const ChangeTrackingService = require('../../services/change-tracking-service')
const MicroserviceExtraHost = models.MicroserviceExtraHost

class MicroserviceExtraHostManager extends BaseManager {
  getEntity () {
    return MicroserviceExtraHost
  }

  async updateOriginMicroserviceChangeTracking (extraHost, transaction) {
    const originMsvc = await MicroserviceManager.findOne({ uuid: extraHost.microserviceUuid }, transaction)
    if (!originMsvc) {
      throw new Errors.NotFoundError(AppHelper.formatMessage(ErrorMessages.INVALID_MICROSERVICE_UUID, extraHost.microserviceUuid))
    }
    originMsvc.rebuild = true
    await originMsvc.save()
    await ChangeTrackingService.update(originMsvc.iofogUuid, ChangeTrackingService.events.microserviceCommon, transaction)
  }
}

const instance = new MicroserviceExtraHostManager()
module.exports = instance

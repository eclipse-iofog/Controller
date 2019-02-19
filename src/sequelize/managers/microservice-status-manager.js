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
const MicroserviceStatus = models.MicroserviceStatus

class MicroserviceStatusManager extends BaseManager {
  getEntity() {
    return MicroserviceStatus
  }
}

const instance = new MicroserviceStatusManager()
module.exports = instance

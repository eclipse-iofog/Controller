/*
 *  *******************************************************************************
 *  * Copyright (c) 2020 Edgeworx, Inc.
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
const TrackingEvent = models.TrackingEvent

class TrackingEventManager extends BaseManager {
  getEntity () {
    return TrackingEvent
  }

  async popAll (transaction) {
    const res = await this.findAll({}, transaction)
    await this.delete({}, transaction)
    return res
  }
}

const instance = new TrackingEventManager()
module.exports = instance

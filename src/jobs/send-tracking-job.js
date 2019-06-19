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

const BaseJobHandler = require('./base/base-job-handler')
const Tracking = require('../tracking')
const TrackingEventManager = require('../database/managers/tracking-event-manager')

class SendTrackingJob extends BaseJobHandler {
  constructor() {
    super()
    this.scheduleTime = intervalMin * 60 * 1000
  }

  run() {
    setInterval(sendTracking, this.scheduleTime)
  }
}

const intervalMin = 5

async function sendTracking() {
  const fakeTransactionObject = { fakeTransaction: true }
  const events = await TrackingEventManager.popAll(fakeTransactionObject)
  try {
    Tracking.sendEvents(events)
  } catch (e) {
    logger.silly(`tracking sending failed with error ${e.message}`)
  }
}

module.exports = new SendTrackingJob()

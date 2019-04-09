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

const moment = require('moment')

const BaseJobHandler = require('./base/base-job-handler')
const FogAccessTokenService = require('../services/iofog-access-token-service')
const logger = require('../logger')
const Tracking = require('../tracking')
const TrackingEventType = require('../enums/tracking-event-type')
const TransactionDecorator = require('../decorators/transaction-decorator')


const INTERVAL_MIN = 5
let timerThis

class TimeTrackingJob extends BaseJobHandler {
  constructor() {
    super()
    this.scheduleTime = INTERVAL_MIN * 60 * 1000
    this.startTime = moment.now()
    timerThis = this
  }

  run() {
    setTimeout(this.trackTime, this.scheduleTime)
  }

  async trackTime() {
    let agentsCount = 0
    try {
      const agents = await TransactionDecorator.generateFakeTransaction(FogAccessTokenService.all)()
      agentsCount = (agents || []).length
    } catch (e) {
      logger.warn('Unable to count ioFog agents')
    }

    const runningTime = moment().diff(timerThis.startTime, 'minutes')
    const event = Tracking.buildEvent(TrackingEventType.RUNNING_TIME, { runningTime, agentsCount })
    await Tracking.processEvent(event)

    setTimeout(timerThis.trackTime, timerThis.scheduleTime)
  }
}

module.exports = new TimeTrackingJob()

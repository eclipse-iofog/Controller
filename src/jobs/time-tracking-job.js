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

const BaseJobHandler = require('./base/base-job-handler');
const Tracking = require('../tracking');
const TrackingEventType = require('../enums/tracking-event-type');

class TimeTrackingJob extends BaseJobHandler {

  constructor() {
    super();
    this.scheduleTime = intervalMin * 60 * 1000;
  }

  run() {
    setInterval(trackTime, this.scheduleTime);
  }
}

let iteration = 0;
const intervalMin = 5;

async function trackTime() {
  iteration++;
  const runningTime = iteration * intervalMin;
  const event = Tracking.buildEvent(TrackingEventType.RUNNING_TIME, null, runningTime);
  await Tracking.processEvent(event);
}

module.exports = new TimeTrackingJob();
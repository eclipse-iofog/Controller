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

const {isTest} = require('../helpers/app-helper')
const Tracking = require('../tracking')

function trackEvent(f, eventType) {
  return async function(...fArgs) {
    if (isTest()) {
      return await f.apply(this, fArgs)
    }

    const res = await f.apply(this, fArgs)
    const event = Tracking.buildEvent(eventType, res, fArgs, f.name)
    await Tracking.processEvent(event, fArgs, res)
    return res
  }
}


module.exports = {
  trackEvent: trackEvent,
}

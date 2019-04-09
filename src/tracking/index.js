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

const { isOnline } = require('../helpers/app-helper')
const https = require('https')
const EventTypes = require('../enums/tracking-event-type')
const fs = require('fs')
const AppHelper = require('../helpers/app-helper')
const Constants = require('../helpers/constants')
const logger = require('../logger')

const TrackingEventManager = require('../sequelize/managers/tracking-event-manager')
const Transaction = require('sequelize/lib/transaction')

const fakeTransactionObject = { fakeTransaction: true }

const trackingUuid = initTrackingUuid()

function buildEvent(eventType, res, args, functionName) {
  const eventInfo = {
    uuid: trackingUuid,
    sourceType: 'controller',
    timestamp: Date.now(),
    type: eventType,
  }
  switch (eventType) {
    case EventTypes.INIT:
      eventInfo.data = { event: 'controller inited' }
      break
    case EventTypes.START:
      eventInfo.data = { event: `controller started: ${res}` }
      break
    case EventTypes.USER_CREATED:
      eventInfo.data = { event: 'user created' }
      break
    case EventTypes.RUNNING_TIME:
      eventInfo.data = {
        event: `${res.runningTime} min`,
        agentsCount: res.agentsCount,
      }
      break
    case EventTypes.IOFOG_CREATED:
      eventInfo.data = { event: 'iofog agent created' }
      break
    case EventTypes.IOFOG_PROVISION:
      eventInfo.data = { event: 'iofog agent provisioned' }
      break
    case EventTypes.CATALOG_CREATED:
      eventInfo.data = { event: 'catalog item was created' }
      break
    case EventTypes.MICROSERVICE_CREATED:
      eventInfo.data = { event: 'microservice created' }
      break
    case EventTypes.CONFIG_CHANGED:
      eventInfo.data = { event: `new config property '${res}'` }
      break
    case EventTypes.OTHER:
      eventInfo.data = { event: `function ${functionName} was executed` }
      break
  }
  return eventInfo
}

function sendEvents(events) {
  for (const event of events) {
    event.data = JSON.parse(event.data)
  }
  const body = {
    events: events,
  }
  const data = JSON.stringify(body)
  const options = {
    host: 'analytics.iofog.org',
    path: '/post',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  }

  const request = https.request(options)
  request.write(data)
  request.end()
}

function initTrackingUuid() {
  let uuid
  const path = `${Constants.ROOT_DIR}/src/config/tracking-uuid`
  try {
    if (!fs.existsSync(path)) {
      return createTrackingUuidFile(path)
    }

    uuid = fs.readFileSync(path).toString('utf8')
    if (uuid.length < 32) {
      return createTrackingUuidFile(path)
    }
  } catch (e) {
    logger.silly('Error while getting tracking UUID')
    uuid = `temp_${AppHelper.generateRandomString(32)}`
  }
  return uuid
}

function createTrackingUuidFile(path) {
  const uuid = AppHelper.generateRandomString(32)
  fs.writeFileSync(path, uuid)

  return uuid
}

async function processEvent(event, fArgs) {
  event.data = JSON.stringify(event.data)
  if (isOnline()) {
    // save in db, and send later by job
    if (fArgs && fArgs.length > 0 && fArgs[fArgs.length - 1] instanceof Transaction) {
      await TrackingEventManager.create(event, fArgs[fArgs.length - 1])
    } else {
      await TrackingEventManager.create(event, fakeTransactionObject)
    }
  } else {
    // just send
    try {
      sendEvents([event])
    } catch (e) {
      logger.silly(`tracking sending failed with error ${e.message}`)
    }
  }
}

module.exports = {
  buildEvent: buildEvent,
  sendEvents: sendEvents,
  processEvent: processEvent,
}

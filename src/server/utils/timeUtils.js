/*
 * *******************************************************************************
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

const moment = require('moment');

//By default, moment parses and displays in local time.
//If you want to parse or display a moment in UTC, you can use moment.utc() instead of moment().

const getUTCMillisFromDate = (date, format) => {  
  return moment.utc(date, format).valueOf();  
}

const getEventStartDate = (event, timezone) => {
  return moment.tz(event.startsAt, timezone).format('MMMM Do');        
}

const getEventStartTime = (event, timezone) => {
  return moment.tz(event.startsAt, timezone).format('h:mm a');
}

const getEventEndTime = (event, timezone) => {
  const endMillis = null == event.duration ? null : event.startsAt + event.duration;      
  return null == endMillis ? null : moment.tz(endMillis, timezone).format('h:mm a');      
}

module.exports = {
  getUTCMillisFromDate: getUTCMillisFromDate,
  getEventEndTime: getEventEndTime,
  getEventStartTime: getEventStartTime,
  getEventStartDate: getEventStartDate  
}

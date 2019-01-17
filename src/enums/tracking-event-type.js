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

const trackingEventType = Object.freeze({
  USER_CREATED: 'USER_CREATED',
  RUNNING_TIME: 'RUNNING_TIME',
  INIT: 'INIT',
  START: 'START',
  IOFOG_CREATED: 'IOFOG_CREATED',
  IOFOG_PROVISION: 'IOFOG_PROVISION',
  MICROSERVICE_CREATED: 'MICROSERVICE_CREATED',
  CATALOG_CREATED: 'CATALOG_CREATED',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  OTHER: 'OTHER',
});

module.exports = trackingEventType;
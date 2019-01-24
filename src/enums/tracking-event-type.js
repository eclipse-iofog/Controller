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
  USER_CREATED: 'user created',
  RUNNING_TIME: 'running time',
  INIT: 'init',
  START: 'start',
  IOFOG_CREATED: 'iofog created',
  IOFOG_PROVISION: 'iofog provision',
  MICROSERVICE_CREATED: 'microservice created',
  CATALOG_CREATED: 'catalog created',
  CONFIG_CHANGED: 'config changed',
  OTHER: 'other',
});

module.exports = trackingEventType;
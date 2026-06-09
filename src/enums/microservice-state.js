/*
 *  *******************************************************************************
 *  * Copyright (c) 2023 Datasance Teknoloji A.S.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

const microserviceState = {
  QUEUED: 'QUEUED',
  PULLING: 'PULLING',
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  STOPPING: 'STOPPING',
  DELETING: 'DELETING',
  MARKED_FOR_DELETION: 'MARKED_FOR_DELETION',
  UPDATING: 'UPDATING',
  RESTARTING: 'RESTARTING',
  STUCK_IN_RESTART: 'STUCK_IN_RESTART',
  UNKNOWN: 'UNKNOWN',
  FAILED: 'FAILED',
  DELETED: 'DELETED',
  EXITING: 'EXITING',
  STOPPED: 'STOPPED',
  CREATING: 'CREATING'
}

const microserviceExecState = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
}

module.exports = { microserviceState, microserviceExecState }

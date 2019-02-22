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

const microserviceState = {
  NOT_RUNNING: 'NOT_RUNNING',
  RUNNING: 'RUNNING',
  RESTARTING: 'RESTARTING',
  STUCK_IN_RESTART: 'STUCK_IN_RESTART',
}

module.exports = microserviceState


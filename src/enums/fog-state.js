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

const fogState = {
  UNKNOWN: 'UNKNOWN',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  WAITING: 'WAITING',
  WARNING: 'WARNING',
  DEBUGGING: 'DEBUGGING',
  DEPROVISIONED: 'DEPROVISIONED',
  ERROR: 'ERROR',
  NOT_PROVISIONED: 'NOT_PROVISIONED'
}

module.exports = fogState

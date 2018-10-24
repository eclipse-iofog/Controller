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

const BaseManager = require('./base-manager');
const models = require('./../models');
const StraceDiagnostics = models.StraceDiagnostics;

class StraceDiagnosticsManager extends BaseManager {
  getEntity() {
    return StraceDiagnostics;
  }

}

const instance = new StraceDiagnosticsManager();
module.exports = instance;
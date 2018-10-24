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

const BaseManager = require('../managers/base-manager')
const models = require('./../models');
const MicroservicePublicMode = models.MicroservicePublicMode

class MicroservicePublicModeManager extends BaseManager {
  getEntity() {
    return MicroservicePublicMode
  }
}

const instance = new MicroservicePublicModeManager()
module.exports = instance
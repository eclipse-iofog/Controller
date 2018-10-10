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

const models = require('../models/index');
const ControllerConfig = models.ControllerConfig;
const BaseManager = require('./base-manager');

class ConfigManager extends BaseManager {
  getEntity() {
    return ControllerConfig;
  }

  getByKey(key, transaction) {
    return ControllerConfig.findOne({
        where: {
          key: key
        }
      }, {
        transaction: transaction
      }
    );
  }

  setByKey(key, value, transaction) {
    return this.upsert({
      key: value
    }, transaction)
  }
}

const instance = new ConfigManager();
module.exports = instance;
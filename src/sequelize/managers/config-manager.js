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

  getByKey(key) {
    return ControllerConfig.find({
      where: {
        key: key
      }
    });
  }

  setByKey(key, value) {
    return this.getByKey(key).then((dbConfig) => {
      if (dbConfig) {
        dbConfig.value = value;
        dbConfig.save();
      } else {
        this.create({
          key: key,
          value: value
        });
      }
    });
  }
}

const instance = new ConfigManager();
module.exports = instance;
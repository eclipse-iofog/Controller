/*
 * *******************************************************************************
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

const BaseManager = require('./base-manager')
const models = require('../models')
const CatalogItemInputType = models.CatalogItemInputType

class CatalogItemInputTypeManager extends BaseManager {
  getEntity () {
    return CatalogItemInputType
  }
}

const instance = new CatalogItemInputTypeManager()
module.exports = instance

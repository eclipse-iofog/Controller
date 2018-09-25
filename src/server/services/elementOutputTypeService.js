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

const ElementOutputTypeManager = require('../managers/elementOutputTypeManager');
const AppUtils = require('../utils/appUtils');

const createElementOutputType = function(props, params, callback) {
  
  ElementOutputTypeManager
    .createElementOutputType(props.elementOutputType)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Output Type object.', callback));
}

const updateElementOutputType = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementOutputTypeManager
    .updateElementOutputType(elementKey, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Output Type object.', callback));
}

const deleteElementOutputType = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementOutputTypeManager
    .deleteByElementKey(elementKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

module.exports =  {
  createElementOutputType: createElementOutputType,
  updateElementOutputType: updateElementOutputType,
  deleteElementOutputType: deleteElementOutputType
}
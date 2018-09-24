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

const ElementInputTypeManager = require('../managers/elementInputTypeManager');
const AppUtils = require('../utils/appUtils');

const createElementInputType = function(props, params, callback) {
  
  ElementInputTypeManager
    .createElementInputType(props.elementInputType)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Input Type object.', callback));
}

const updateElementInputType = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInputTypeManager
    .updateElementInputType(elementKey, props.updatedData)
    .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Element Input Type object.', callback));
}

const deleteElementInputType = function(props, params, callback) {
  let elementKey = AppUtils.getProperty(params, props.elementKey);

  ElementInputTypeManager
    .deleteByElementKey(elementKey)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

module.exports =  {
  createElementInputType: createElementInputType,
  updateElementInputType: updateElementInputType,
  deleteElementInputType: deleteElementInputType
}
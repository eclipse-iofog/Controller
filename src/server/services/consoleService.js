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

import ConsoleManager from '../managers/consoleManager';
import AppUtils from '../utils/appUtils';

const createConsole = function(props, params, callback) {
  ConsoleManager
    .create(props.consoleObj)
    .then(AppUtils.onCreate.bind(null, params, null, 'Unable to create Console object', callback));
}

const getConsoleByFogInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteConsoleByFogInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  ConsoleManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

export default {
  createConsole: createConsole,
  getConsoleByFogInstanceId: getConsoleByFogInstanceId,
  deleteConsoleByFogInstanceId: deleteConsoleByFogInstanceId
};
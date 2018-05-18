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

import ElementInstanceConnectionsManager from '../managers/elementInstanceConnectionsManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createElementInstanceConnection = function(props, params, callback) {

  ElementInstanceConnectionsManager
    .create(props.newConnectionObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Error: Cannot Create Element Instance Conenction', callback));
}

const findBySourceElementInstance = function(props, params, callback) {
  let sourceElementInstanceIds = AppUtils.getProperty(params, props.sourceElementInstanceIds);

  ElementInstanceConnectionsManager
    .findBySourceElementInstance(_.pluck(sourceElementInstanceIds, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const findBySourceAndDestinationElementInstance = function(props, params, callback) {
  let sourceElementInstanceId = AppUtils.getProperty(params, props.sourceElementInstanceId),
      destinationElementInstanceId = AppUtils.getProperty(params, props.destinationElementInstanceId);

  ElementInstanceConnectionsManager
    .findBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteElementInstanceConnection = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstanceConnectionsManager
    .deleteElementInstanceConnection(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteBySourceAndDestinationElementInstance = function(props, params, callback) {
  let sourceElementInstanceId = AppUtils.getProperty(params, props.sourceElementInstanceId),
      destinationElementInstanceId = AppUtils.getProperty(params, props.destinationElementInstanceId);

  ElementInstanceConnectionsManager
    .deleteBySourceAndDestinationElementInstance(sourceElementInstanceId, destinationElementInstanceId)
    .then(AppUtils.onDelete.bind(null, params, 'There is no such element instance connection to delete.', callback));
}

export default {
  createElementInstanceConnection: createElementInstanceConnection,
  findBySourceElementInstance: findBySourceElementInstance,
  findBySourceAndDestinationElementInstance: findBySourceAndDestinationElementInstance,
  deleteElementInstanceConnection: deleteElementInstanceConnection,
  deleteBySourceAndDestinationElementInstance: deleteBySourceAndDestinationElementInstance
}
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

import ElementInstancePortManager from '../managers/elementInstancePortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const createElementInstancePort = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId),
    internalPort = AppUtils.getProperty(params, props.internalPort),
    externalPort = AppUtils.getProperty(params, props.externalPort),
    elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstancePortManager
    .createElementPort(userId, elementId, externalPort, internalPort)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Instance Port', callback));
}

const createElementInstancePortByPortValue = function(props, params, callback) {
  let userId = AppUtils.getProperty(params, props.userId),
    internalPort = props.internalPort,
    externalPort = props.externalPort,
    elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstancePortManager
    .createElementPort(userId, elementId, externalPort, internalPort)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Element Instance Port', callback));
}

const deleteElementInstancePort = function(props, params, callback) {
  let elementId = AppUtils.getProperty(params, props.elementId);

  ElementInstancePortManager
    .deleteByElementInstanceId(elementId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const deleteElementInstancePortById = function(props, params, callback) {
  let elementPortId = AppUtils.getProperty(params, props.elementPortId);

  ElementInstancePortManager
    .deleteById(elementPortId)
    .then(AppUtils.onDelete.bind(null, params, 'No Element Instance Port found', callback));
}

const deleteElementInstancePortsByElementIds = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstancePortManager
    .deleteByElementInstanceId(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

const findElementInstancePortsByElementIds = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementInstancePortManager
    .findPortsByElementIds(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const getElementInstancePort = function(props, params, callback) {
  let portId = AppUtils.getProperty(params, props.portId);

  ElementInstancePortManager
    .findById(portId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Element Instance Port', callback));
}

const getPortsByElementId = function(props, params, callback) {
  let elementPortId = AppUtils.getProperty(params, props.elementPortId);

  ElementInstancePortManager
    .getPortsByElementId(elementPortId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'No Element Instance Port found', callback));
}

export default {
  createElementInstancePort: createElementInstancePort,
  createElementInstancePortByPortValue: createElementInstancePortByPortValue,
  deleteElementInstancePort: deleteElementInstancePort,
  deleteElementInstancePortsByElementIds: deleteElementInstancePortsByElementIds,
  deleteElementInstancePortById: deleteElementInstancePortById,
  findElementInstancePortsByElementIds: findElementInstancePortsByElementIds,
  getElementInstancePort: getElementInstancePort,
  getPortsByElementId: getPortsByElementId
};
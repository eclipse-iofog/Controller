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

const StreamViewerManager = require('../managers/streamViewerManager');
const AppUtils = require('../utils/appUtils');

const createStreamViewer = function(props, params, callback) {

  StreamViewerManager
    .create(props.streamViewerObj)
    .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Stream Viewer object', callback));
}

const getStreamViewerByFogInstanceId = function(props, params, callback) {
   let instanceId = AppUtils.getProperty(params, props.instanceId);

  StreamViewerManager
    .findByInstanceId(instanceId)
    .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
}

const deleteStreamViewerByFogInstanceId  = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);
  
  StreamViewerManager
    .deleteByInstanceId(instanceId)
    .then(AppUtils.onDeleteOptional.bind(null, params, callback));
}

module.exports =  {
  createStreamViewer: createStreamViewer,
  getStreamViewerByFogInstanceId: getStreamViewerByFogInstanceId,
  deleteStreamViewerByFogInstanceId: deleteStreamViewerByFogInstanceId

};
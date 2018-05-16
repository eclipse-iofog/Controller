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

import InstanceTrackManager from '../managers/instanceTrackManager';
import AppUtils from '../utils/appUtils';


const getInstanceTrackByInstanceId = function(props, params, callback) {
  let instanceId = AppUtils.getProperty(params, props.instanceId);

  InstanceTrackManager
    .findInstanceContainer(instanceId)
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Cannot find Instance Track', callback));
}

export default {
  getInstanceTrackByInstanceId: getInstanceTrackByInstanceId
};
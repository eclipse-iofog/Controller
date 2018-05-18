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

import ElementAdvertisedPortManager from '../managers/elementAdvertisedPortManager';
import AppUtils from '../utils/appUtils';
import _ from 'underscore';

const findElementAdvertisedPortByElementIds = function(props, params, callback) {
  let elementInstanceData = AppUtils.getProperty(params, props.elementInstanceData);

  ElementAdvertisedPortManager
    .findElementAdvertisedPortByElementIds(_.pluck(elementInstanceData, props.field))
    .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Element Advertised Port Not found', callback));
}

export default {
  findElementAdvertisedPortByElementIds: findElementAdvertisedPortByElementIds,
};
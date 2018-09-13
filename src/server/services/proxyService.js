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

import ProxyManager from '../managers/proxyManager';
import AppUtils from '../utils/appUtils'

const createProxy = function(props, params, callback) {
    ProxyManager
        .create(props.proxy)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create proxy for Fog Instance', callback));
};

const deleteProxy = function(props, params, callback) {
    let instanceId = AppUtils.getProperty(params, props.fogInstanceId);

    ProxyManager
        .deleteByInstanceId(instanceId)
        .then(AppUtils.onDeleteOptional.bind(null, params, callback));
};

const getProxyByInstanceId = function(props, params, callback) {
    let instanceId = AppUtils.getProperty(params, props.fogInstanceId);

    ProxyManager
        .findByInstanceId(instanceId)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const updateProxy = function(props, params, callback) {
    let fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

    ProxyManager
        .updateByUuid(fogInstanceId, props.changeObject)
        .then(AppUtils.onUpdate.bind(null, params, 'Unable to update Proxy', callback));
};

const saveProxy = function(props, params, callback) {
	let fogInstanceId = AppUtils.getProperty(params, props.fogInstanceId);

	ProxyManager
        .upsert(fogInstanceId, props.proxy)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create proxy for Fog Instance', callback));
}

export default {
    createProxy: createProxy,
    deleteProxy: deleteProxy,
    getProxyByInstanceId: getProxyByInstanceId,
    updateProxy: updateProxy,
    saveProxy: saveProxy
};
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

import StraceDiagnosticsManager from '../managers/straceDiagnosticsManager';
import AppUtils from '../utils/appUtils'

const switchStraceForElement = function (props, params, callback) {
    if (AppUtils.getProperty(params, props.fogId) == null) {
        return callback('error', 'Can\'t run strace for element without fog');
    }

    let elementData = {
        element_instance_uuid: AppUtils.getProperty(params, props.instanceId),
        straceRun: AppUtils.getProperty(params, props.strace)
    };

    return StraceDiagnosticsManager
        .updateOrCreateStraceDiagnostics(elementData)
        .then(AppUtils.onUpdateOrCreate.bind(null, params, props.setProperty, 'Unable to switch STrace for Fog Instance', callback))
};

const pushBufferForElements = function (props, params, callback) {
    let straceData = AppUtils.getProperty(params, props.straceData);
    Object.keys(straceData)
        .forEach((elementId) => {
            StraceDiagnosticsManager.pushBufferByElementId(elementId, straceData[elementId])
        });
    callback(null, params);
};

const popBufferByElementId = function (props, params, callback) {
    let elementId = AppUtils.getProperty(params, props.instanceId);

    return StraceDiagnosticsManager
        .findStraceDiagnosticsAndPopBufferByElementId(elementId)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'this instance isn\'t in strace diagnostics list', callback))
};

const getStraceValuesForFog = function (props, params, callback) {
    let fogId = AppUtils.getProperty(params, props.fogId);

    return StraceDiagnosticsManager
        .findStraceDiagnosticsStateByFogId(fogId)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback))
};

export default {
    switchStraceForElement: switchStraceForElement,
    pushBufferForElements: pushBufferForElements,
    popBufferByElementId: popBufferByElementId,
    getStraceValuesForFog: getStraceValuesForFog
}
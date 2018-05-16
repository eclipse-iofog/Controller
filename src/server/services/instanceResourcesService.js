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

/**
 * @author elukashick
 */

import HWInfoManager from '../managers/HWInfoManager';
import USBInfoManager from '../managers/usbInfoManager';
import AppUtils from "../utils/appUtils";

const saveHWInfo = function (props, params, callback) {

    let info = AppUtils.getProperty(params, props.fogInfo),
        uuid = AppUtils.getProperty(params, props.uuid);

    let config = {
        info: info,
        iofog_uuid: uuid
    };

    HWInfoManager
        .upsert(config)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to save HW Info.', callback));
};

const saveUSBInfo = function (props, params, callback) {

    let info = AppUtils.getProperty(params, props.fogInfo),
        uuid = AppUtils.getProperty(params, props.uuid);

    let config = {
        info: info,
        iofog_uuid: uuid
    };

    USBInfoManager
        .upsert(config)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to save USB Info.', callback));
};

const getFogHwInfo = function (props, params, callback) {
    let instanceId = AppUtils.getProperty(params, props.instanceId);

    HWInfoManager
        .findByInstanceId(instanceId)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const getFogUsbInfo = function (props, params, callback) {
    let instanceId = AppUtils.getProperty(params, props.instanceId);

    USBInfoManager
        .findByInstanceId(instanceId)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

export default {
    saveHWInfo: saveHWInfo,
    saveUSBInfo: saveUSBInfo,
    getFogHwInfo: getFogHwInfo,
    getFogUsbInfo: getFogUsbInfo
};
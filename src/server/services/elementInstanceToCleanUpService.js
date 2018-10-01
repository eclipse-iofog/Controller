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

const ElementInstanceToCleanUpManager = require('../managers/elementInstanceToCleanUpManager');
const AppUtils = require('../utils/appUtils');

/**
 * @author elukashick
 */

const listByFogUUID = function (props, params, param, callback) {
    let ioFogUUID = AppUtils.getProperty(params, props.uuid);

    ElementInstanceToCleanUpManager
        .listByFogUUID(ioFogUUID)
        .then(result => {
            params.elementToCleanUpIds = [];
            if (result.length > 0) {
                for (let i = 0, len = result.length; i < len; i++) {
                    params.elementToCleanUpIds.push(result[i].elementInstanceUUID);
                }
            }
            AppUtils.onFindOptional(params, props.setProperty, callback);
        });
};

const deleteByElementInstanceId = function (statusObj, params, callback) {
    let elementInstanceUUID = statusObj.id;

    ElementInstanceToCleanUpManager
        .deleteByElementInstanceUUID(elementInstanceUUID)
        .then(AppUtils.onDelete.bind(null, params, null, callback));
};

const deleteByFogUUID = function (props, params, param, callback) {
    let ioFogUUID = AppUtils.getProperty(params, props.uuid);

    if (params.elementToCleanUpIds.length > 0) {
        ElementInstanceToCleanUpManager
            .deleteByFogUUID(ioFogUUID)
            .then(AppUtils.onDelete.bind(null, params.elementToCleanUpIds, 'Unable to delete Clean Up Elements', callback));
    } else {
        callback(null, params.elementToCleanUpIds);
    }
};

module.exports =  {
    listByFogUUID: listByFogUUID,
    deleteByElementInstanceId: deleteByElementInstanceId,
    deleteByFogUUID: deleteByFogUUID
};
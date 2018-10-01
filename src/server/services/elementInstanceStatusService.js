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

const AppUtils = require('../utils/appUtils');
const ElementInstanceStatusManager = require('../managers/elementInstanceStatusManager');

/**
 * @author elukashick
 */

const upsertStatus = function (statusObj, params, callback) {
    let obj = {
        status: statusObj.status,
        cpuUsage: statusObj.cpuusage,
        memoryUsage: statusObj.memoryusage,
        containerId: statusObj.containerId,
        uuid: statusObj.id
    };

    ElementInstanceStatusManager
        .upsertStatus(obj)
        .then(AppUtils.onUpdateOrCreate.bind(null, params, '', 'Unable to create or update Element Instance Status', callback));
};

module.exports =  {
    upsertStatus: upsertStatus
};
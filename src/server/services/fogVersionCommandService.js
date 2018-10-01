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

const FogVersionCommandManager = require('../managers/fogVersionCommandManager');
const AppUtils = require('../utils/appUtils');
const Constants = require('../constants.js');

const createVersionCommandByInstanceId = function(props, params, callback) {
    var instanceId = AppUtils.getProperty(params, props.instanceId),
        versionCommand = AppUtils.getProperty(params, props.versionCommand),
        newCommand = {
            versionCommand: versionCommand,
            iofog_uuid: instanceId
        };

    FogVersionCommandManager
        .createVersionCommand(newCommand)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Version Command', callback));
};

const deleteVersionCommandByInstanceId = function(props, params, callback) {
    var instanceId = AppUtils.getProperty(params, props.instanceId);

    FogVersionCommandManager
        .deleteByInstanceId(instanceId)
        .then(AppUtils.onDeleteOptional.bind(null, params, callback));
};

const getVersionCommandByInstanceId = function (props, params, callback) {
    var instanceId = AppUtils.getProperty(params, props.instanceId);

    FogVersionCommandManager
        .findByInstanceId(instanceId)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Error: Unable to find version command with this fog', callback));

};

module.exports =  {
    createVersionCommandByInstanceId: createVersionCommandByInstanceId,
    deleteVersionCommandByInstanceId: deleteVersionCommandByInstanceId,
    getVersionCommandByInstanceId: getVersionCommandByInstanceId
};
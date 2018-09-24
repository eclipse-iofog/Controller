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

const RegistryManager = require('../managers/registryManager');
const AppUtils = require('../utils/appUtils');


const findRegistriesByUserId = function (props, params, param, callback) {
    let userId = AppUtils.getProperty(params, props.userId);

    RegistryManager
        .findByUserId(userId)
        .then(AppUtils.onFind.bind(null, params, props.setProperty, 'Unable to find registries with userId: ' + userId, callback));
};

const listRegistry = function (props, params, callback) {
    let userId = AppUtils.getProperty(params, props.userId);

    RegistryManager
        .findByUserId(userId)
        .then(AppUtils.onFindOptional.bind(null, params, props.setProperty, callback));
};

const addRegistry = function (props, params, callback) {
    let url = AppUtils.getProperty(params, props.url),
        isPublic = AppUtils.getProperty(params, props.isPublic) === 'true' ? 1 : 0,
        userId = AppUtils.getProperty(params, props.userId),
        username = '', password = '', email = '';
    if (!isPublic) {
        username = AppUtils.getProperty(params, props.username);
        password = AppUtils.getProperty(params, props.password);
        email = AppUtils.getProperty(params, props.email);
    }

    let registryObj = {
        url: url,
        username: username,
        password: password,
        useremail: email,
        user_id: userId,
        ispublic: isPublic,
        requirescert: 0
    };

    RegistryManager
        .create(registryObj)
        .then(AppUtils.onCreate.bind(null, params, props.setProperty, 'Unable to create Registry.', callback));
};

const deleteRegistry = function (props, params, callback) {
    RegistryManager
        .deleteById(props.id)
        .then(AppUtils.onDelete.bind(null, params, 'No Registry found', callback));
};

module.exports =  {
    findRegistriesByUserId: findRegistriesByUserId,
    listRegistry: listRegistry,
    addRegistry: addRegistry,
    deleteRegistry: deleteRegistry
};
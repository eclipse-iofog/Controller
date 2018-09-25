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
 * @file registryManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the registry Model.
 */
 
const BaseManager = require('./../managers/baseManager');
const Registry = require('./../models/registry');

class RegistryManager extends BaseManager {

    create(obj) {
        return Registry.create(obj);
    }

    findByUserId(userId) {
        return Registry.findAll({
            where: {
                $or: [{
                    user_id: userId
                }, {
                    user_id: null
                }]
            }
        });
    }
}

const instance = new RegistryManager();
module.exports =  instance;

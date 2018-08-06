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
 * @file proxyManager.js
 * @author epankov
 * @description This file includes the CURD operations for the proxy Model.
 */

const Proxy = require('./../models/proxy');
const ChangeTracking = require('./../models/changeTracking');
const BaseManager = require('./../managers/baseManager');

class ProxyManager extends BaseManager {
    getEntity() {
        return Proxy;
    }

    /**
     * @desc - finds the proxy based on the instanceId
     * @param String - instanceId
     * @return JSON - returns a JSON object of changeTracking
     */
    findByInstanceId(instanceId) {
        return Proxy.find({
            where: {
                iofog_uuid: instanceId
            }
        });
    }

    /**
     * @desc - deletes the proxy based on the instanceId
     * @param String - instanceId
     * @return  Integer - returns the number of rows deleted
     */
    deleteByInstanceId(instanceId) {
        return Proxy.destroy({
            where: {
                iofog_uuid: instanceId
            }
        });
    }

    /**
     * @desc - updates the proxy data
     * @param Integer, JSON object - uuid, data
     * @return Integer - returns the number of rows updated
     */
    updateByUuid(uuid, data) {
        return Proxy.update(data, {
            where: {
                iofog_uuid: uuid
            }
        });
    }
}

const instance = new ProxyManager();
module.exports =  instance;
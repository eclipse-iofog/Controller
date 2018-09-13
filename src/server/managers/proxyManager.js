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

import Proxy from './../models/proxy';
import ChangeTracking from './../models/changeTracking';
import BaseManager from './../managers/baseManager';

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

	/**
     * @desc - updates if proxy data exists in db otherwise creates it
	 * @param uuid - instance id
	 * @param data - json data
	 * @returns JSON - return json proxy data
	 */
	upsert(uuid, data) {
		return this.findByInstanceId(uuid)
			.then((dbObj) => {
				return null == dbObj ? this.create(data) : this.updateByUuid(uuid, data)
			});
	}

	list() {
		this.find()
			.then(function(proxy) {
				if (proxy && proxy.length > 0) {
					console.log('\n\tID | Username | Password | Host | Local Port | Rsa key');
					for (let i = 0; i < proxy.length; i++) {
						console.log('\t' + proxy[i].id + ' | ' + satellite[i].username + ' | ' + satellite[i].password + ' | '
							+ satellite[i].host + ' | ' + satellite[i].local_port + ' | ' + satellite[i].rsa_key);
					}
				} else {
					console.log('No proxy configured');
				}
			});
	}
}

const instance = new ProxyManager();
export default instance;
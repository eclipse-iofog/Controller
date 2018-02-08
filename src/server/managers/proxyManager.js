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
}

const instance = new ProxyManager();
export default instance;
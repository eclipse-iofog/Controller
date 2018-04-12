/**
 * @file registryManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the registry Model.
 */
 
import BaseManager from './../managers/baseManager';
import Registry from './../models/registry';

class RegistryManager extends BaseManager {

    create(obj) {
        return Registry.create(obj);
    }

	findByInstanceId(instanceId) {
    	return Registry.findAll({
    		where: {
      			$or: [{
          			iofog_uuid: instanceId
        		}, {
          			ispublic: {
          				$gt: 0
          			}
        		}]
	  		}
    	});
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
export default instance;
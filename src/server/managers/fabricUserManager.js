/**
* @file fabricUserManager.js
* @author Zishan Iqbal
* @description This file includes the CURD operations for the fabricUser Model.
*/

import FabricUser from './../models/fabricUser';
import BaseManager from './../managers/baseManager';

class FabricUserManager extends BaseManager {

  getEntity() {
    return FabricUser;
  }

 	findByInstanceId(instanceId) {
	 return FabricUser.find({where: {fabric_id : instanceId}});
	}

	isUserExist(userId, instanceId) {
	  return FabricUser.find({where: {fabric_id : instanceId, user_id: userId }});
	}

}

const instance = new FabricUserManager();
export default instance;
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
	create(userId, instanceId) {
			return FabricUser.create({
				fabric_id: instanceId,
				user_id: userId
			});
		}
		/**
		 * @desc - finds the fabricUser based on the instanceId
		 * @param Integer - instanceId
		 * @return JSON - returns a JSON object of fabricUser
		 */
	findByInstanceId(instanceId) {
			return FabricUser.find({
				where: {
					fabric_id: instanceId
				}
			});
		}
		/**
		 * @desc - finds the fabricUser based on the instanceId and userId
		 * (Basically used to check users Linkage with a fabric instance)
		 * @param Integer, Integer - userId, instanceId
		 * @return JSON - returns a JSON object of fabricUser
		 */
	isUserExist(userId, instanceId) {
		return FabricUser.find({
			where: {
				fabric_id: instanceId,
				user_id: userId
			}
		});
	}

	/**
	 * @desc - deletes the fabric user based on the instanceId
	 * @param String - instanceId
	 * @return  Integer - returns the number of rows deleted
	 */
	deleteByInstanceId(instanceId) {
		return FabricUser.destroy({
			where: {
				fabric_id: instanceId
			}
		});
	}


	deleteByInstanceIdAndUserId(userId, instanceId) {
		return FabricUser.destroy({
			where: {
				user_id: userId,
				fabric_id: instanceId
			}
		});
	}


}

const instance = new FabricUserManager();
export default instance;
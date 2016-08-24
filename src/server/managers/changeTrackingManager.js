/**
 * @file changeTrackingManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the changeTracking Model.
 */

import ChangeTracking from './../models/changeTracking';
import BaseManager from './../managers/baseManager';

class ChangeTrackingManager extends BaseManager {

	getEntity() {
			return ChangeTracking;
		}
	/**
	 * @desc - finds the changeTracking based on the instanceId
	 * @param Integer - instanceId
	 * @return JSON - returns a JSON object of changeTracking
	 */
	findByInstanceId(instanceId) {
		return ChangeTracking.find({
			where: {
				instanceId: instanceId
			}
		});
	}
}

const instance = new ChangeTrackingManager();
export default instance;
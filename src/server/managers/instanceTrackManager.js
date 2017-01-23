/**
 * @file instanceTrackManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the instanceTrack Model.
 */

import InstanceTrack from './../models/instanceTrack';
import ElementInstance from './../models/elementInstance';
import BaseManager from './../managers/baseManager';
import sequelize from './../utils/sequelize';

class InstanceTrackManager extends BaseManager {

	/**
	 * @desc - uses a raw-Query to perform a join operation between element_instance and instance_track tables
	 * @param Integer - instanceId
	 * @return JSON - returns a Array of JSON objects with elementInstance and its related instanceTrack
	 */
	findInstanceContainer(instanceId) {										                                      
		var instanceTrackingQuery = "SELECT i.*, t.* FROM element_instance i LEFT JOIN \
		instance_track t ON i.track_id = t.ID \
		WHERE i.iofog_uuid in (:instanceId) AND (i.track_id = 0 OR t.is_activated = 1)";

		return sequelize.query(instanceTrackingQuery, {
			replacements: {
				instanceId: instanceId
			},
			type: sequelize.QueryTypes.SELECT
		});
	}
}

const instance = new InstanceTrackManager();
export default instance;
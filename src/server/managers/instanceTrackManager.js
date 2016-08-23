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

	findInstanceContainer(instanceId) {
		var instanceTrackingQuery = "SELECT i.*, t.* FROM element_instance i LEFT JOIN instance_track t ON (i.track_id = t.ID) WHERE i.iofabric_id = " + instanceId + " AND (i.track_id = 0 OR t.is_activated = 1)";
		return sequelize.query(instanceTrackingQuery);
		// return sequelize.query(instanceTrackingQuery, null, {nested: true})
	}

}

const instance = new InstanceTrackManager();
export default instance;

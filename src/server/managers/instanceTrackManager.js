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
 * @file instanceTrackManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the instanceTrack Model.
 */

const InstanceTrack = require('./../models/instanceTrack');
const ElementInstance = require('./../models/elementInstance');
const BaseManager = require('./../managers/baseManager');
const sequelize = require('./../utils/sequelize');

class InstanceTrackManager extends BaseManager {

	/**
	 * @desc - uses a raw-Query to perform a join operation between element_instance and instance_track tables
	 * @param Integer - instanceId
	 * @return JSON - returns a Array of JSON objects with elementInstance and its related instanceTrack
	 */
	findInstanceContainer(instanceId) {										                                      
		let instanceTrackingQuery = "SELECT i.*, t.* FROM element_instance i LEFT JOIN \
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
module.exports =  instance;
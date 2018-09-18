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
 * @file changeTrackingManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the changeTracking Model.
 */

const ChangeTracking = require('./../models/changeTracking');
const BaseManager = require('./../managers/baseManager');

class ChangeTrackingManager extends BaseManager {

	getEntity() {
		return ChangeTracking;
	}

	createChangeTracking(instanceId) {
			let milliseconds = new Date().getTime();

			return ChangeTracking.create({
				iofog_uuid: instanceId,
				containerConfig: milliseconds,
				containerList: milliseconds,
				config: milliseconds,
				routing: milliseconds,
				registries: milliseconds,
				proxy: milliseconds,
				version: milliseconds,
				diagnostics: milliseconds,
                isImageSnapshot: milliseconds
			});
		}
		/**
		 * @desc - finds the changeTracking based on the instanceId
		 * @param String - instanceId
		 * @return JSON - returns a JSON object of changeTracking
		 */

	findByInstanceId(instanceId) {
			return ChangeTracking.find({
				where: {
					iofog_uuid: instanceId
				}
			});
		}
		/**
		 * @desc - deletes the changeTracking based on the instanceId
		 * @param String - instanceId
		 * @return  Integer - returns the number of rows deleted
		 */
	deleteByInstanceId(instanceId) {
			return ChangeTracking.destroy({
				where: {
					iofog_uuid: instanceId
				}
			});
		}
		/**
		 * @desc - updates the changetrakind data
		 * @param Integer, JSON object - uuid, data
		 * @return Integer - returns the number of rows updated
		 */
	updateByUuid(uuid, data) {
		return ChangeTracking.update(data, {
			where: {
				iofog_uuid: uuid
			}
		});
	}
}

const instance = new ChangeTrackingManager();
module.exports =  instance;
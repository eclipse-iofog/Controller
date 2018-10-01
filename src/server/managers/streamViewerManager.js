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
 * @file streamViewerManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the streamViewer Model.
 */

const StreamViewer = require('./../models/streamViewer');
const BaseManager = require('./../managers/baseManager');

class StreamViewerManager extends BaseManager {

	getEntity() {
			return StreamViewer;
		}
		/**
		 * @desc - finds the StreamViewer based on the instanceId
		 * @param Integer - instanceId
		 * @return JSON - returns a JSON object of streamViewer
		 */
	findByInstanceId(instanceId) {
			return StreamViewer.find({
				where: {
					iofog_uuid: instanceId
				}
			});
		}
		/**
		 * @desc - deletes the streamViewer based on the instanceId
		 * @param String - instanceId
		 * @return  Integer - returns the number of rows deleted
		 */
	deleteByInstanceId(instanceId) {
		return StreamViewer.destroy({
			where: {
				iofog_uuid: instanceId
			}
		});
	}
}

const instance = new StreamViewerManager();
module.exports =  instance;
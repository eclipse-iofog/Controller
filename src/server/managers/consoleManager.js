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
 * @file consoleManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogConsole Model.
 */

const BaseManager = require('./../managers/baseManager');
const FogConsole = require('./../models/fogConsole');

class FogConsoleManager extends BaseManager {

	getEntity() {
			return FogConsole;
		}
		/**
		 * @desc - finds the fogConsole based on the instanceId
		 * @param Integer - instanceId
		 * @return JSON - returns a JSON object of fogConsole
		 */
	findByInstanceId(instanceId) {
		return FogConsole.find({
			where: {
				iofog_uuid: instanceId
			}
		});
	}

	/**
	 * @desc - deletes the console based on the instanceId
	 * @param String - instanceId
	 * @return  Integer - returns the number of rows deleted
	 */
	deleteByInstanceId(instanceId) {
		return FogConsole.destroy({
			where: {
				iofog_uuid: instanceId
			}
		});
	}
}

const instance = new FogConsoleManager();
module.exports =  instance;
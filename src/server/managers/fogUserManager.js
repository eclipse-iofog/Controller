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
 * @file fogUserManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the fogUser Model.
 */

import FogUser from './../models/fogUser';
import BaseManager from './../managers/baseManager';

class FogUserManager extends BaseManager {

	getEntity() {
		return FogUser;
	}
	create(userId, instanceId) {
			return FogUser.create({
				fog_id: instanceId,
				user_id: userId
			});
		}
		/**
		 * @desc - finds the fogUser based on the instanceId
		 * @param Integer - instanceId
		 * @return JSON - returns a JSON object of fogUser
		 */
	findByInstanceId(instanceId) {
			return FogUser.find({
				where: {
					fog_id: instanceId
				}
			});
		}
		/**
		 * @desc - finds the fogUser based on the instanceId and userId
		 * (Basically used to check users Linkage with a fog instance)
		 * @param Integer, Integer - userId, instanceId
		 * @return JSON - returns a JSON object of fogUser
		 */
	isUserExist(userId, instanceId) {
		return FogUser.find({
			where: {
				fog_id: instanceId,
				user_id: userId
			}
		});
	}

	/**
	 * @desc - deletes the fog user based on the instanceId
	 * @param String - instanceId
	 * @return  Integer - returns the number of rows deleted
	 */
	deleteByInstanceId(instanceId) {
		return FogUser.destroy({
			where: {
				fog_id: instanceId
			}
		});
	}


	deleteByInstanceIdAndUserId(userId, instanceId) {
		return FogUser.destroy({
			where: {
				user_id: userId,
				fog_id: instanceId
			}
		});
	}


}

const instance = new FogUserManager();
export default instance;
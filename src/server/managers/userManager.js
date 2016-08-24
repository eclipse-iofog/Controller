/**
 * @file userManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the user Model.
 */

import User from './../models/user';
import BaseManager from './../managers/baseManager';

class UserManager extends BaseManager {

	getEntity() {
			return User;
		}
	/**
	 * @desc - finds the user based on the users email
	 * @param String - email 
	 * @return JSON - returns a JSON object of the user with the email
	 */
	findByEmail(email) {
		return User.find({
			where: {
				email: email
			}
		});
	}
}

const instance = new UserManager();
export default instance;
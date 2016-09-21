/**
 * @file userManager.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the user Model.
 */

import User from './../models/user';
import BaseManager from './../managers/baseManager';
import AppUtils from './../utils/appUtils';

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

	list() {
		this.find()
			.then(function(users) {
				if (users && users.length > 0) {
					console.log('Email Address | First Name | Last Name');
					for (var i = 0; i < users.length; i++) {
						console.log(users[i].email + '|' + users[i].firstName + '|' + users[i].lastName);
					}
				} else {
					console.log('No users found');
				}
			});
	}

	createUser(email, firstName, lastName) {
		if (email) {
			if (AppUtils.isValidEmail(email)) {
				this.create({
					firstName: firstName,
					lastName: lastName,
					email: email,
					password: AppUtils.generateAccessToken()
				}).then(function(user) {
					console.log(user.password);
				});
			} else {
				console.log('Invalid Email address provided');
			}
		} else {
			console.log('Email address is required');
		}
	}

	removeUser(email) {
		if (email) {
			this.findByEmail(email)
				.then(function(user) {
					if (user) {
						user.destroy();
						console.log('User deleted');
					} else {
						console.log('Can not find user having "' + email + '" as email address');
					}
				})
		} else {
			console.log('Email address is required');
		}
	}

	generateToken(email) {
		if (email) {
			this.findByEmail(email)
				.then(function(user) {
					if (user) {
						user.password = AppUtils.generateAccessToken();
						console.log(user.password);
						user.save();
					} else {
						console.log('Can not find user having "' + email + '" as email address');
					}
				})
		} else {
			console.log('Email address is required');
		}
	}
}

const instance = new UserManager();
export default instance;
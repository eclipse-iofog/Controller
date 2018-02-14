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

	addUser(userData) {
		return User.create(userData);
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

	updateUserByToken(userAccessToken, data) {
		return User.update(data, {
			where: {
				userAccessToken: userAccessToken
			}
		});
	}	

	updateUserById(userId, data){
		return User.update(data, {
			where: {
				id: userId
			}
		});
	}	

	updateUserByEmail(email, data) {
		return User.update(data, {
			where: {
				email: email
			}
		});
	}

	validateUser(email, password) {
		return User.find({
			where: {
				email: email,
				password: password
			}
		});
	}

	isTempPassword(email, password) {
		return User.find({
			where: {
				email: email,
				tempPassword: password
			}
		});
	}

	validateUserByEmail(email) {
		return User.find({
			where: {
				email: email
			}
		});
	}
	/**
	 * @desc - finds the user based on the users email
	 * @param String - email
	 * @return JSON - returns a JSON object of the user with the email
	 */
	findByToken(token) {
		return User.find({
			where: {
				userAccessToken: token
			}
		});
	}

	findByEmail(email) {
		return User.find({
			where: {
				email: email
			}
		});
	}


	deleteByUserId(userId) {
		return User.destroy({
			where: {
				id: userId
			}
		});
	}
	
	list() {
		this.find()
			.then(function(users) {
				if (users && users.length > 0) {
					console.log('Email Address | First Name | Last Name');
					for (let i = 0; i < users.length; i++) {
						console.log(users[i].email + '|' + users[i].firstName + '|' + users[i].lastName);
					}
				} else {
					console.log('No users found');
				}
			});
	}

	createUser(email, firstName, lastName, password) {
		if (email && password) {
      		this.findByEmail(email)
        	.then(function(user) {
          if (!user) {  
			if (AppUtils.isValidEmail(email)) {
				if (password.length >= 8){
					this.create({
						firstName: firstName,
						lastName: lastName,
						email: email,
						password: password,
						userAccessToken: AppUtils.generateAccessToken()
					}).then(function(user) {
					console.log('\nUser created successfully: ' + email);
					console.log('userAccessToken: ' + this.userAccessToken);
					});
				}else{
					console.log('\nError: Password length should be at least 8 characters.');
				}
			} else {
				console.log('\nError: Invalid Email address provided');
			}
		   } else{
      			console.log('\nError: User already exists with this email. Please Try again with different Email.');
		   }
		 })
		} else {
      		console.log('\nPlease provide values in following order:\n fog-controller user -add <email> <firstName> <lastName> <password>');
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
						user.userAccessToken = AppUtils.generateAccessToken();
						console.log('userAccessToken: ' + user.userAccessToken);
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
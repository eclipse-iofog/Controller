/**
 * @file emailActivationCodes.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the email_activation_codes Model.
 */

import EmailActivationCode from './../models/emailActivationCode';
import BaseManager from './baseManager';
import sequelize from './../utils/sequelize';

class EmailActivationCodeManager extends BaseManager {
	getEntity() {
		return EmailActivationCode;
	}

	getByActivationCode(activationCode) {
		return EmailActivationCode.find({
			where: {
				activationCode: activationCode
			}
		});
	}

	createActivationCode(userId, activationCode, expirationTime) {
		return EmailActivationCode.create({
			user_id: userId,
			activationCode: activationCode,
			expirationTime: expirationTime
		});
	}

	verifyActivationCode(activationCode){
		return EmailActivationCode.find({
			where: {
				activationCode: activationCode,
				expirationTime:{
          			$gt: new Date().getTime()
        		}
			}
		});
	}
}

const instance = new EmailActivationCodeManager();
export default instance;
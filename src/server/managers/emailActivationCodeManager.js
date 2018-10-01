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
 * @file emailActivationCodes.js
 * @author Zishan Iqbal
 * @description This file includes the CURD operations for the email_activation_codes Model.
 */

const EmailActivationCode = require('./../models/emailActivationCode');
const BaseManager = require('./baseManager');

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
module.exports =  instance;

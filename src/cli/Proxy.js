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

const { Help } = require('./Help');
import AppUtils from '../server/utils/appUtils';
import FogControllerConfigManager from '../server/managers/fogControllerConfigManager';
import ConfigUtil from '../server/utils/configUtil';
import constants from '../server/constants';
import fs from 'fs';

class Proxy {
	constructor(args) {
		this.args = args;
	}

	run = () => {
		if (!this.args.length) {
			Help.displayProxyCommandHelp();
		} else {
			runCommand(this.args);
		}
	}
}

function runCommand(args) {
	switch (args[0]) {
		case '-list':
			return runListCommand(args);
		case '-add':
			return runAddCommand(args);
		case '-remove':
			return runRemoveCommand(args);
		default:
			Help.displayComsatCommandHelp();
	}
}

function runListCommand(args) {
	if (args.length > 1) return Help.displayExtraArgumentHelp(args[1]);
	try {
		listProxyConfig();
	} catch(e) {
		console.log(e);
	}
}

function runAddCommand(args) {
	if (args.length < 5) return Help.displayProxyAddHelp();
	if (args.length > 6) return Help.displayExtraArgumentHelp(args[6]);

	let param6 = args.length > 5 ? args[5] : undefined;
	try {
		createProxyConfig(args[1], args[2], args[3], args[4], param6);
	} catch(e) {
		console.log(e);
	}
}

function runRemoveCommand(args) {
	if (args.length > 1) return Help.displayExtraArgumentHelp(args[1]);
	try {
		removeProxyConfig();
	} catch(e) {
		console.log(e);
	}
}

const listProxyConfig = function () {
	ConfigUtil.getAllConfigs().then(() => {
		let username = ConfigUtil.getConfigParam(constants.CONFIG.proxy_username);
		let password = ConfigUtil.getConfigParam(constants.CONFIG.proxy_password);
		let host = ConfigUtil.getConfigParam(constants.CONFIG.proxy_host);
		let lport = ConfigUtil.getConfigParam(constants.CONFIG.proxy_lport) || 22;
		let rsa_key = ConfigUtil.getConfigParam(constants.CONFIG.proxy_rsa_key);
		console.log("Proxy username: " + username);
		console.log("Proxy password: " + password);
		console.log("Proxy host: " + host);
		console.log("Proxy local port: " + lport);
		console.log("Proxy rsa key: " + rsa_key);
	});
}

const removeProxyConfig = function () {
	try {
		const removeProxyConfig = function (key) {
			FogControllerConfigManager.getByKey(key)
				.then(function(dbConfig) {
					if (dbConfig) {
						dbConfig.destroy();
					}
				})
		};

		removeProxyConfig(constants.CONFIG.proxy_username);
		removeProxyConfig(constants.CONFIG.proxy_password);
		removeProxyConfig(constants.CONFIG.proxy_host);
		removeProxyConfig(constants.CONFIG.proxy_lport);
		removeProxyConfig(constants.CONFIG.proxy_rsa_key);

		console.log("Proxy config has been removed successfully.");
	} catch (e) {
		console.log(e);
	}
}

const createProxyConfig = function (username, password, host, rsaKey, lport) {
	let orderMessage = 'Please provide values in following order:\n' +
		' fog-controller proxy -add <username> <password> <host> <rsaKey> [<localPort>]';
	if (!(username && password && host && rsaKey)) {
		console.log(orderMessage);
		return;
	}
	if (!(AppUtils.isValidPublicIP(host) || AppUtils.isValidDomain(host))) {
		console.log('Proxy host is invalid. Try again with different host.');
		console.log(orderMessage);
		return;
	}
	if (!AppUtils.isFileExists(rsaKey)) {
		console.log('Incorrect rsa key file path. Try again with correct rsa key file path.');
		console.log(orderMessage);
		return;
	}
	if (lport) {
		if (!AppUtils.isValidPort(lport)) {
			console.log('Proxy local port is invalid. Try again with different local port.');
			console.log(orderMessage);
			return;
		}
	}

	let key = fs.readFileSync(rsaKey, "utf-8");

	try {
		FogControllerConfigManager.setByKey(constants.CONFIG.proxy_username, username);
		FogControllerConfigManager.setByKey(constants.CONFIG.proxy_password, password);
		FogControllerConfigManager.setByKey(constants.CONFIG.proxy_host, host);
		FogControllerConfigManager.setByKey(constants.CONFIG.proxy_rsa_key, key);
		if (lport) {
			FogControllerConfigManager.setByKey(constants.CONFIG.proxy_lport, lport);
		}
	} catch (e) {
		console.log(e);
	}

	console.log("Proxy config has been updated successfully.");
}

exports.Proxy = Proxy;
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
 * @file sshController.js
 * @author epankov
 * @description This file includes the implementation of the ssh terminal end-point
 */

import appConfig from './../../../config.json';
import logger from '../../utils/winstonLogs';
const path = require('path');
const validator = require('validator');
const nodeRoot = path.dirname(require.main.filename);
const publicPath = path.join(nodeRoot, 'sshClient', 'public');
const auth = require('basic-auth');
const colors = require('colors');
/********************************************* EndPoints ******************************************************/

/**
 * Basic authentication middleware for ssh server
 * @param req request
 * @param res response
 * @param next next function
 */
const basicAuth = function (req, res, next) {
	const sshAuth = auth(req);
	if (sshAuth) {
		req.session.username = sshAuth.name;
		req.session.userpassword = sshAuth.pass;
		logger.debug('sshAuth.name: ' + sshAuth.name.yellow.bold.underline +
			' and password ' + ((sshAuth.pass) ? 'exists'.yellow.bold.underline
				: 'is blank'.underline.red.bold));
		next()
	} else {
		res.statusCode = 401;
		logger.debug('basicAuth credential request (401)');
		res.setHeader('WWW-Authenticate', 'Basic realm="WebSSH"');
		res.end('Username and password required for web SSH service.');
	}
}

/**
 * open terminal window middleware
 * @param req request
 * @param res response
 * @param next next function
 */
const checkRemotePortMiddleware = function (req, res, next) {
	// checks if remote port differs from the new one from request param
	let areRemotePortsDifferent = req.session.rport != undefined && req.session.rport !== req.query.port;
	// update session with the latest remote port
	req.session.rport = req.query.port;
	if (areRemotePortsDifferent) {
		let url = req.originalUrl || '/'
		res.status(401).send('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=' + url + '"></head><body bgcolor="#000"></body></html>')
	} else {
		next();
	}
}

/**
 * ioAuthoring end point to open ssh terminal
 * (Get: /api/v2/authoring/fog/instance/ssh/host/:host?)
 * @param req request
 * @param res response
 */
const openTerminalWindowEndPoint = function (req, res) {
	logger.info("Endpoint hit: "+ req.originalUrl);

	res.sendFile(path.join(path.join(publicPath, 'client.htm')))
	// capture, assign, and validated variables
	req.session.ssh = {
		host: (validator.isIP(req.params.host + '') && req.params.host) ||
		(validator.isFQDN(req.params.host) && req.params.host) ||
		(/^(([a-z]|[A-Z]|[0-9]|[!^(){}\-_~])+)?\w$/.test(req.params.host) &&
			req.params.host) || appConfig.ssh2.ssh.host,
		port: (validator.isInt(req.query.port + '', {min: 1, max: 65535}) &&
			req.query.port) || appConfig.ssh2.ssh.port,
		header: {
			name: req.query.header || appConfig.ssh2.header.text,
			background: req.query.headerBackground || appConfig.ssh2.header.background
		},
		algorithms: appConfig.ssh2.algorithms,
		keepaliveInterval: appConfig.ssh2.ssh.keepaliveInterval,
		keepaliveCountMax: appConfig.ssh2.ssh.keepaliveCountMax,
		term: (/^(([a-z]|[A-Z]|[0-9]|[!^(){}\-_~])+)?\w$/.test(req.query.sshterm) &&
			req.query.sshterm) || appConfig.ssh2.ssh.term,
		terminal: {
			cursorBlink: (validator.isBoolean(req.query.cursorBlink + '')
				? myutil.parseBool(req.query.cursorBlink)
				: appConfig.ssh2.terminal.cursorBlink),
			scrollback: (validator.isInt(req.query.scrollback + '', {min: 1, max: 200000}) && req.query.scrollback)
				? req.query.scrollback
				: appConfig.ssh2.terminal.scrollback,
			tabStopWidth: (validator.isInt(req.query.tabStopWidth + '', {min: 1, max: 100}) && req.query.tabStopWidth)
				? req.query.tabStopWidth
				: appConfig.ssh2.terminal.tabStopWidth,
			bellStyle: ((req.query.bellStyle) && (['sound', 'none'].indexOf(req.query.bellStyle) > -1))
				? req.query.bellStyle
				: appConfig.ssh2.terminal.bellStyle
		},
		allowreplay: appConfig.ssh2.options.challengeButton || (validator.isBoolean(req.headers.allowreplay + '')
			? myutil.parseBool(req.headers.allowreplay)
			: false),
		allowreauth: appConfig.ssh2.options.allowreauth || false,
		mrhsession: ((validator.isAlphanumeric(req.headers.mrhsession + '') && req.headers.mrhsession)
			? req.headers.mrhsession
			: 'none'),
		serverlog: {
			client: appConfig.ssh2.serverlog.client || false,
			server: appConfig.ssh2.serverlog.server || false
		},
		readyTimeout: (validator.isInt(req.query.readyTimeout + '', {min: 1, max: 300000}) &&
			req.query.readyTimeout) || appConfig.ssh2.ssh.readyTimeout
	}
	if (req.session.ssh.header.name) validator.escape(req.session.ssh.header.name)
	if (req.session.ssh.header.background) validator.escape(req.session.ssh.header.background)
}

const reauthEndPoint = function (req, res) {
	var r = req.headers.referer || '/'
	res.status(401).send('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=' + r + '"></head><body bgcolor="#000"></body></html>')
}

export default {
	checkRemotePortMiddleware: checkRemotePortMiddleware,
	openTerminalWindowEndPoint: openTerminalWindowEndPoint,
	basicAuth: basicAuth,
	reauthEndPoint: reauthEndPoint
}
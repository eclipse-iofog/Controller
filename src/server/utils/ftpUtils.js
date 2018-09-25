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

const AppUtils = require('./appUtils');
let ftpClient = require('ftp');
let fs = require('fs');
const logger = require('./winstonLogs');


const sendToFtp = function (props, params, callback) {

    let host = AppUtils.getProperty(params, props.host);
    let port = AppUtils.getProperty(params, props.port);
    let user = AppUtils.getProperty(params, props.user);
    let pass = AppUtils.getProperty(params, props.pass);
    let destDir = AppUtils.getProperty(params, props.destDir);

    let filePath = AppUtils.getProperty(params, props.file);


    let client = new ftpClient();
    let connectionData = {
        host: host,
        port: port,
        user: user,
        password: pass,
        protocol: 'ftp'
    };

    client.on('ready', function() {
        client.put(filePath, destDir + '/' + filePath.split('/').pop(), function(err) {
            if (err) {
                logger.warn('Problem with ftp: ' + err);
                client.end();
                callback('error', 'ftp problem');
            } else {
                client.end();
                callback(null, params);
            }
        });
    });
    client.on('error', function (err) {
        logger.warn('Problem with ftp: ' + err);
        callback('error', 'ftp problem');
    });

    client.connect(connectionData);
};

module.exports =  {
    sendToFtp: sendToFtp
}